import type { User } from "@presight/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserDirectoryCard } from "./UserDirectoryCard";

/* Client seam 3 — a jsdom render, with no API module to fake because the card
   is handed everything it draws. The truncation lives here rather than upstream
   (the card receives the *full* hobby array and slices it itself), so this is
   where the brief's two-hobbies-plus-`+n` cap is actually pinned. */

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 42,
  first_name: "Zoë",
  last_name: "Bjørnsen",
  age: 34,
  nationality: "Norway",
  avatar: "/api/avatars/42.svg",
  hobbies: [],
  ...overrides,
});

describe("UserDirectoryCard", () => {
  it("shows the full name, nationality and age", () => {
    render(<UserDirectoryCard user={buildUser()} />);

    expect(screen.getByText("Zoë Bjørnsen")).toBeInTheDocument();
    expect(screen.getByText("Norway")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
  });

  it("reserves the avatar's space before the image loads", () => {
    /* Intrinsic dimensions on the tag, so the row does not reflow as avatars
       resolve one after another during a scroll. */
    const { container } = render(<UserDirectoryCard user={buildUser()} />);
    const avatar = container.querySelector("img");

    expect(avatar).toHaveAttribute("src", "/api/avatars/42.svg");
    expect(avatar).toHaveAttribute("width");
    expect(avatar).toHaveAttribute("height");
  });

  it("shows both hobbies and no overflow badge when there are exactly two", () => {
    render(<UserDirectoryCard user={buildUser({ hobbies: ["chess", "judo"] })} />);

    expect(screen.getByText("chess")).toBeInTheDocument();
    expect(screen.getByText("judo")).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("shows the first two hobbies and a `+n` badge for the rest", () => {
    render(
      <UserDirectoryCard
        user={buildUser({ hobbies: ["chess", "judo", "baking", "sailing"] })}
      />,
    );

    expect(screen.getByText("chess")).toBeInTheDocument();
    expect(screen.getByText("judo")).toBeInTheDocument();
    expect(screen.queryByText("baking")).not.toBeInTheDocument();
    expect(screen.queryByText("sailing")).not.toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("names the remaining hobbies on both the badge's tooltip and its label", () => {
    /* A native `title` is painted as an overlay, so it cannot change the row's
       height the way an inline expand would — and it is hover-only, which is
       why the same string is on `aria-label`. */
    render(
      <UserDirectoryCard
        user={buildUser({ hobbies: ["chess", "judo", "baking", "sailing"] })}
      />,
    );

    const badge = screen.getByText("+2");

    expect(badge).toHaveAttribute("title", "More hobbies: baking, sailing");
    expect(badge).toHaveAttribute("aria-label", "More hobbies: baking, sailing");
  });

  it("renders a user with no hobbies as an ordinary card", () => {
    render(<UserDirectoryCard user={buildUser({ hobbies: [] })} />);

    expect(screen.getByText("Zoë Bjørnsen")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});
