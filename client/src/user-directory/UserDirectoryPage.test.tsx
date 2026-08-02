import type { FacetsResponse, User, UserListResponse } from "@presight/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserDirectoryPage } from "./UserDirectoryPage";

/* Client seam 3, at the one place the four states are actually decided: the API
   module faked, everything above it real. Each of these is a query state the
   page reads and a surface it swaps in, and the wiring between the two is the
   whole of what this ticket adds — asserting the surfaces on their own would
   test that a component renders its props.
 *
 * jsdom reports every layout metric as zero, so the virtualizer paints nothing
 * unless it is told how tall the pane is. `offsetHeight` is the exact property
 * it reads, and stubbing it is what makes "the rows are still on screen" a real
 * assertion rather than a vacuous one — every test below that counts cards
 * depends on it. It is not a stand-in for scrolling: the pane is a fixed 800px
 * and stays at the top, so a page has to be short enough for its last row to be
 * in the first window for infinite scroll to reach for the next one. */

const { fetchUserPage, fetchFacets } = vi.hoisted(() => ({
  fetchUserPage: vi.fn(),
  fetchFacets: vi.fn(),
}));

vi.mock("../api/userDirectoryApi", () => ({ fetchUserPage, fetchFacets, USER_LIST_LIMIT: 50 }));

const PANE_HEIGHT = 800;

const userNamed = (id: number, last_name: string): User => ({
  id,
  first_name: "Ada",
  last_name,
  age: 36,
  nationality: "Germany",
  avatar: `/api/avatars/${id}.svg`,
  hobbies: ["chess"],
});

const pageOf = (users: User[], next_cursor: string | null = null): UserListResponse => ({
  users,
  page_info: { has_more: next_cursor !== null, next_cursor },
});

/* A selected hobby at its true count, which is `0` once it matches nobody — the
   pinned value that keeps the chip on screen through an empty result set. */
const facetsFor = (total: number): FacetsResponse => ({
  total,
  hobbies: [{ value: "chess", count: total }],
  nationalities: [{ value: "Germany", count: total }],
});

/** Never settles: the query stays in flight for the length of the test. */
const inFlight = <T,>(): Promise<T> => new Promise<T>(() => {});

const renderPage = (searchParams = "") => {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();

  /* Retries off, and a cache per test: a failing query would otherwise sit in a
     backoff for the length of the run, and the first-page error state would
     take three requests to reach. */
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <QueryClientProvider client={queryClient}>
        <UserDirectoryPage />
      </QueryClientProvider>
    </NuqsTestingAdapter>,
  );

  return { onUrlUpdate };
};

const resultsPane = (): HTMLElement => screen.getByRole("region", { name: /people/i });

/* Rows that have not arrived. The skeleton is decorative — no live region per
   shimmering box — and so is a card's `alt=""` avatar, so being decorative is
   not enough to tell them apart; being a *row* is, and `data-index` is the
   virtualizer's own mark for one. */
const skeletons = (): HTMLElement[] =>
  screen
    .queryAllByRole("presentation")
    .filter((element) => element.parentElement?.hasAttribute("data-index") ?? false);

const cards = (): HTMLElement[] => screen.queryAllByRole("article");

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(PANE_HEIGHT);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);

  fetchUserPage.mockReset();
  fetchFacets.mockReset();
  fetchFacets.mockResolvedValue(facetsFor(1));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the first load", () => {
  it("stands skeleton cards in the rows the users will arrive in", () => {
    fetchUserPage.mockReturnValue(inFlight());

    renderPage();

    expect(skeletons().length).toBeGreaterThan(0);
    expect(cards()).toHaveLength(0);
    expect(resultsPane()).toHaveAttribute("aria-busy", "true");
  });

  it("puts the first user where a skeleton was standing", async () => {
    /* The criterion is that nothing shifts, and the mechanism is that both are
       rows in the same virtualizer at the same fixed height — so the scroll
       height per row is the one thing that has to be identical across the
       swap. */
    fetchUserPage.mockResolvedValue(pageOf([userNamed(1, "Lovelace")]));

    renderPage();

    const skeletonRow = skeletons()[0].parentElement;
    const rowHeight = skeletonRow?.style.height;

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(cards()[0].parentElement?.style.height).toBe(rowHeight);
    expect(skeletons()).toHaveLength(0);
  });
});

describe("a view being replaced", () => {
  it("dims the rows it already has rather than taking them away", async () => {
    fetchUserPage
      .mockResolvedValueOnce(pageOf([userNamed(1, "Lovelace")]))
      .mockReturnValueOnce(inFlight());

    renderPage();
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();

    /* Through the sidebar rather than by rewriting the URL, because the chip is
       the act the criterion is about — the screen must not blank every time one
       is pressed. */
    fireEvent.click(screen.getByRole("button", { name: /chess/ }));

    await waitFor(() => expect(resultsPane()).toHaveAttribute("aria-busy", "true"));
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(resultsPane()).toHaveClass("opacity-40");
  });
});

describe("an empty result set", () => {
  it("says so, and offers a way back out", async () => {
    fetchUserPage.mockResolvedValue(pageOf([]));
    fetchFacets.mockResolvedValue(facetsFor(0));

    const { onUrlUpdate } = renderPage("?hobbies=chess");

    expect(await screen.findByText(/nobody matches/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear selections/i }));

    /* The dead end is backed out of by emptying the selection, which is the URL
       and therefore the view — not by a piece of local state that would then
       disagree with the link the viewer could paste. */
    await waitFor(() => expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(""));
  });

  it("offers nothing to clear when the search text alone emptied it", async () => {
    /* The way out of this one is the search box in the header, holding the text
       that caused it. A button promising to clear selections there are none of
       would be a control that does nothing, in the one place a viewer most
       needs the controls to mean something. */
    fetchUserPage.mockResolvedValue(pageOf([]));
    fetchFacets.mockResolvedValue(facetsFor(0));

    renderPage("?q=zzzz");

    expect(await screen.findByText(/nobody matches/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear selections/i })).not.toBeInTheDocument();
  });
});

describe("a failed first page", () => {
  it("reports it and retries in place", async () => {
    fetchUserPage.mockRejectedValueOnce(new Error("network down"));

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load the directory/i);

    fetchUserPage.mockResolvedValueOnce(pageOf([userNamed(1, "Lovelace")]));
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    /* A transient failure costs a press rather than a page refresh — which
       would also throw away the sidebar's response and every page of a list the
       viewer had scrolled. */
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("a failed next page", () => {
  /* Two users and a cursor: short enough that the trailing row is inside the
     first rendered window, so infinite scroll reaches for the second page with
     no scrolling for jsdom to fail to do. */
  const firstOfTwoPages = pageOf([userNamed(1, "Lovelace"), userNamed(2, "Byron")], "cursor-2");

  it("keeps every row it already has and asks again from the last one", async () => {
    fetchUserPage
      .mockResolvedValueOnce(firstOfTwoPages)
      .mockRejectedValueOnce(new Error("network down"));

    renderPage();

    const trailingRow = await screen.findByRole("status");
    expect(trailingRow).toHaveTextContent(/couldn’t load more/i);

    /* The whole point of the split: the rows survive the failure. A centred
       error here would have thrown away everything the viewer had scrolled to,
       to report that the next fifty did not arrive. */
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Ada Byron")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fetchUserPage.mockResolvedValueOnce(pageOf([userNamed(3, "King")]));
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Ada King")).toBeInTheDocument();
    expect(cards()).toHaveLength(3);
  });

  it("stops asking on its own once a page has failed", async () => {
    /* Without the guard in `shouldFetchNextPage` the failure settling is itself
       what re-runs the effect, and the bottom of the list becomes an unbounded
       retry loop against whatever just broke. */
    fetchUserPage.mockResolvedValueOnce(firstOfTwoPages).mockRejectedValue(new Error("network down"));

    renderPage();

    await screen.findByText(/couldn’t load more/i);
    const attemptsAtFailure = fetchUserPage.mock.calls.length;

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchUserPage).toHaveBeenCalledTimes(attemptsAtFailure);
  });

  it("marks the trailing row as loading while the next page is on its way", async () => {
    fetchUserPage.mockResolvedValueOnce(firstOfTwoPages).mockReturnValueOnce(inFlight());

    renderPage();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();

    /* The indicator is a virtualized row like the cards above it, so it cannot
       shift them — one skeleton, at the end, in the `+1` the cursor bought. */
    await waitFor(() => expect(skeletons()).toHaveLength(1));
    expect(cards()).toHaveLength(2);
    expect(resultsPane()).toHaveAttribute("aria-busy", "true");
  });
});
