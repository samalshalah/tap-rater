import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModalDialog } from "@/components/ui/modal-dialog";

const mocks = vi.hoisted(() => ({
  effects: [] as Array<() => (() => void) | undefined>,
  ref: { current: null as unknown }
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useRef: () => mocks.ref,
  useEffect: (effect: () => (() => void) | undefined) => mocks.effects.push(effect)
}));

class FocusTarget {
  isConnected = true;
  tabIndex = 0;
  focus = vi.fn();
  matches = vi.fn(() => false);
  closest = vi.fn(() => null);
  getClientRects = vi.fn(() => [{}]);
}

let opener: FocusTarget;
let heading: FocusTarget;
let dialog: { showModal: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; querySelector: ReturnType<typeof vi.fn> };
let body: { style: { overflow: string } };

beforeEach(() => {
  mocks.effects.length = 0;
  opener = new FocusTarget();
  heading = new FocusTarget();
  body = { style: { overflow: "auto" } };
  dialog = { showModal: vi.fn(), close: vi.fn(), querySelector: vi.fn(() => heading) };
  mocks.ref.current = dialog;
  vi.stubGlobal("HTMLElement", FocusTarget);
  vi.stubGlobal("document", { activeElement: opener, body });
  vi.stubGlobal("getComputedStyle", () => ({ visibility: "visible" }));
});
afterEach(() => vi.unstubAllGlobals());

function render(onClose = vi.fn()) {
  return ModalDialog({ labelledBy: "modal-title", onClose, children: createElement("h2", { id: "modal-title" }, "Stand setup") });
}

describe("shared native modal", () => {
  it("renders an accessible native dialog without opening a nonmodal dialog during SSR", () => {
    const html = renderToStaticMarkup(render());
    expect(html).toContain("<dialog");
    expect(html).toContain('aria-labelledby="modal-title"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("open:grid");
    expect(html).not.toContain('open=""');
  });

  it("uses native modality, locks body scrolling and focuses the heading", () => {
    render();
    mocks.effects[0]();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(body.style.overflow).toBe("hidden");
    expect(dialog.querySelector).toHaveBeenCalledWith("[data-dialog-heading]");
    expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("restores the opener and original scrolling on unmount", () => {
    render();
    const cleanup = mocks.effects[0]();
    cleanup?.();
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(body.style.overflow).toBe("auto");
    expect(opener.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does not refocus an opener removed by navigation", () => {
    render();
    const cleanup = mocks.effects[0]();
    opener.isConnected = false;
    cleanup?.();
    expect(opener.focus).not.toHaveBeenCalled();
    expect(body.style.overflow).toBe("auto");
  });

  it("synchronizes Escape cancellation through the controlled close callback", () => {
    const onClose = vi.fn();
    const element = render(onClose);
    const event = { preventDefault: vi.fn() };
    element.props.onCancel(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("can reopen after a Strict Mode setup/cleanup cycle", () => {
    render();
    mocks.effects[0]()?.();
    const cleanup = mocks.effects[0]();
    expect(dialog.showModal).toHaveBeenCalledTimes(2);
    expect(body.style.overflow).toBe("hidden");
    cleanup?.();
    expect(body.style.overflow).toBe("auto");
  });

  it("tolerates an absent heading or detached ref", () => {
    dialog.querySelector.mockReturnValue(null);
    render();
    expect(() => mocks.effects[0]()?.()).not.toThrow();
    mocks.ref.current = null;
    expect(mocks.effects[0]()).toBeUndefined();
  });

  it.each([false, true])("wraps the %s Shift+Tab boundary without leaving the modal", (shiftKey) => {
    const first = new FocusTarget();
    const last = new FocusTarget();
    vi.stubGlobal("document", { activeElement: shiftKey ? first : last, body });
    const event = { key: "Tab", shiftKey, preventDefault: vi.fn(), currentTarget: { querySelectorAll: () => [first, last] } };
    render().props.onKeyDown(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect((shiftKey ? last : first).focus).toHaveBeenCalledOnce();
  });

  it("skips disabled, hidden and negative-tab-index controls when wrapping", () => {
    const disabled = new FocusTarget();
    disabled.matches.mockReturnValue(true);
    const hidden = new FocusTarget();
    hidden.getClientRects.mockReturnValue([]);
    heading.tabIndex = -1;
    const first = new FocusTarget();
    const last = new FocusTarget();
    vi.stubGlobal("document", { activeElement: last, body });
    const event = { key: "Tab", shiftKey: false, preventDefault: vi.fn(), currentTarget: { querySelectorAll: () => [disabled, hidden, heading, first, last] } };
    render().props.onKeyDown(event);
    expect(first.focus).toHaveBeenCalledOnce();
    expect(disabled.focus).not.toHaveBeenCalled();
    expect(hidden.focus).not.toHaveBeenCalled();
  });

  it("lets the browser handle ordinary interior Tab navigation", () => {
    const first = new FocusTarget();
    const last = new FocusTarget();
    vi.stubGlobal("document", { activeElement: first, body });
    const event = { key: "Tab", shiftKey: false, preventDefault: vi.fn(), currentTarget: { querySelectorAll: () => [first, last] } };
    render().props.onKeyDown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("keeps focus in the modal if there are no tabbable controls", () => {
    const event = { key: "Tab", shiftKey: false, preventDefault: vi.fn(), currentTarget: { querySelectorAll: () => [] } };
    render().props.onKeyDown(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("returns focus from the iframe exit guard without trapping focus on the guard itself", () => {
    const first = new FocusTarget();
    const guard = new FocusTarget();
    guard.matches.mockReturnValue(true);
    mocks.ref.current = { ...dialog, querySelectorAll: () => [first, guard] };
    const element = render();
    const boundary = element.props.children.at(-1);
    expect(boundary.props.tabIndex).toBe(0);
    boundary.props.onFocus();
    expect(first.focus).toHaveBeenCalledOnce();
    expect(guard.focus).not.toHaveBeenCalled();
  });
});
