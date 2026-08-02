import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

/* Testing Library unmounts automatically only by hooking a *global* afterEach,
   which does not exist while `globals: false` — so it is registered here by
   hand. Without these three lines the symptom is tests that pass alone and
   fail together, because every render stacks up in the same document. */
afterEach(cleanup);

/* jsdom ships no `matchMedia` at all — not a stub that answers `false`, but an
   undefined property — so anything that asks which breakpoint it is in throws
   `window.matchMedia is not a function` on render. That is the same missing
   half as the missing layout: jsdom has no viewport to answer about.
 *
 * Answering `false` puts every test at the narrow breakpoint, which is a real
 * answer rather than a pretend one, and the listener is a no-op because nothing
 * here can ever change width. This is the environment's gap, so it is patched
 * once here rather than guarded for in the component that asks. */
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      media: query,
      matches: false,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

/* The same missing half again, one element further on: jsdom 30 ships
   `HTMLDialogElement` as an empty subclass of `HTMLElement` — no `open`, no
   `showModal()`, no `close()` — so a component that opens a real dialog throws
   `showModal is not a function` on the first click rather than failing an
   assertion. There is no top layer in jsdom to put a dialog in.
 *
 * Stubbed to exactly the parts a *component* can be held to: the `open`
 * attribute and the two methods, `close` event included, so what the tests
 * exercise is the drawer's own wiring — that pressing the button opens the
 * dialog, and that a dialog closed from outside React syncs back.
 *
 * What the browser owns is deliberately *not* faked. The focus trap, focus
 * restore, `::backdrop` and Escape-to-close are the platform's, and they are
 * the whole reason the drawer is a real `<dialog>` rather than a `div` wearing
 * `role="dialog"`. Faking them here would turn a test of the browser into a
 * test of these twenty lines. They are verified by hand instead, alongside the
 * responsive layout they belong to. */
if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  Object.defineProperty(HTMLDialogElement.prototype, "open", {
    configurable: true,
    get(this: HTMLDialogElement): boolean {
      return this.hasAttribute("open");
    },
    set(this: HTMLDialogElement, isOpen: boolean) {
      this.toggleAttribute("open", isOpen);
    },
  });

  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };

  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    /* The spec's own first step, and load-bearing rather than defensive: a
       `close()` on an already-closed dialog must not fire a second `close`
       event, or the effect that syncs state back re-enters on every render. */
    if (!this.hasAttribute("open")) return;

    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
