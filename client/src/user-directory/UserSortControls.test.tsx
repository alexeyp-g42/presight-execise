import { SORT_DIRS, SORT_FIELDS } from "@presight/shared";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserSortControls } from "./UserSortControls";

/* Client seam 3. The assertion that earns this file is the coverage one, and
   it is written against the contract package's arrays rather than a list
   restated here: a fifth sort field lands in the dropdown by arriving in
   `SORT_FIELDS`, and this test fails if it does not. The values are asserted
   too, not just the labels — they are what reaches the API as `?sort=`. */

const renderSortControls = (overrides: Partial<Parameters<typeof UserSortControls>[0]> = {}) => {
  const onSortChange = vi.fn();
  const onDirChange = vi.fn();

  render(
    <UserSortControls
      sort="last_name"
      dir="asc"
      onSortChange={onSortChange}
      onDirChange={onDirChange}
      {...overrides}
    />,
  );

  return {
    sortField: screen.getByRole("combobox", { name: /sort by/i }),
    sortDir: screen.getByRole("combobox", { name: /direction/i }),
    onSortChange,
    onDirChange,
  };
};

const optionValues = (select: HTMLElement): string[] =>
  within(select)
    .getAllByRole("option")
    .map((option) => (option as HTMLOptionElement).value);

describe("UserSortControls", () => {
  it("offers every sort field the contract defines", () => {
    const { sortField } = renderSortControls();

    expect(optionValues(sortField)).toEqual([...SORT_FIELDS]);
  });

  it("offers both sort directions", () => {
    const { sortDir } = renderSortControls();

    expect(optionValues(sortDir)).toEqual([...SORT_DIRS]);
  });

  it("shows the sort the view is currently in", () => {
    const { sortField, sortDir } = renderSortControls({ sort: "age", dir: "desc" });

    expect(sortField).toHaveValue("age");
    expect(sortDir).toHaveValue("desc");
  });

  it("reports a chosen sort field as the value the API takes", () => {
    const { sortField, onSortChange, onDirChange } = renderSortControls();

    fireEvent.change(sortField, { target: { value: "nationality" } });

    expect(onSortChange).toHaveBeenCalledExactlyOnceWith("nationality");
    /* Changing the field leaves the direction where the viewer put it — one
       discrete act is one history entry, not two. */
    expect(onDirChange).not.toHaveBeenCalled();
  });

  it("reports a chosen direction as the value the API takes", () => {
    const { sortDir, onSortChange, onDirChange } = renderSortControls();

    fireEvent.change(sortDir, { target: { value: "desc" } });

    expect(onDirChange).toHaveBeenCalledExactlyOnceWith("desc");
    expect(onSortChange).not.toHaveBeenCalled();
  });
});
