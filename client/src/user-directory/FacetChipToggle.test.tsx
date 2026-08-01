import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacetChipToggle } from "./FacetChipToggle";

/* Client seam 3. The chip is the only way into a selection, so what is pinned
   here is the half a mouse never exercises: that it is a real `<button>`
   carrying `aria-pressed`, and that a `count: 0` entry is as clickable as any
   other — the case that keeps a selection deselectable once it matches nobody. */

describe("FacetChipToggle", () => {
  it("shows the value and how many of the result set it covers", () => {
    render(<FacetChipToggle value="chess" count={88} isSelected={false} onToggle={vi.fn()} />);

    const chip = screen.getByRole("button", { name: /chess/ });

    expect(chip).toHaveTextContent("chess");
    expect(chip).toHaveTextContent("88");
  });

  it("is a real button, which is what makes Enter and Space toggle it", () => {
    /* Asserted as the element rather than as a keystroke: jsdom implements no
       activation behaviour, so a `keyDown` here would fire the handler only if
       the component wired one up by hand — proving the opposite of what this
       needs to. A native `<button>` is the mechanism, so the mechanism is what
       is checked, along with its staying in the tab order. */
    render(<FacetChipToggle value="chess" count={88} isSelected={false} onToggle={vi.fn()} />);

    const chip = screen.getByRole("button", { name: /chess/ });

    expect(chip.tagName).toBe("BUTTON");
    expect(chip).not.toHaveAttribute("disabled");
    expect(chip).not.toHaveAttribute("tabindex", "-1");
  });

  it("announces whether the selection is on", () => {
    const { rerender } = render(
      <FacetChipToggle value="chess" count={88} isSelected={false} onToggle={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: /chess/ })).toHaveAttribute("aria-pressed", "false");

    rerender(<FacetChipToggle value="chess" count={88} isSelected onToggle={vi.fn()} />);

    expect(screen.getByRole("button", { name: /chess/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the value it stands for when clicked", () => {
    const onToggle = vi.fn();

    render(<FacetChipToggle value="board games" count={12} isSelected={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /board games/ }));

    expect(onToggle).toHaveBeenCalledExactlyOnceWith("board games");
  });

  it("stays clickable while it contributes nothing", () => {
    /* `count: 0` is rendered rather than filtered out, and this is why: a
       selection that has narrowed the result set to nobody is deselectable
       only through the chip that put it there. */
    const onToggle = vi.fn();

    render(<FacetChipToggle value="chess" count={0} isSelected onToggle={onToggle} />);
    const chip = screen.getByRole("button", { name: /chess/ });

    expect(chip).toHaveTextContent("0");
    expect(chip).toBeEnabled();

    fireEvent.click(chip);

    expect(onToggle).toHaveBeenCalledExactlyOnceWith("chess");
  });
});
