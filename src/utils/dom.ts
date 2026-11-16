/**
 * Popup helpers for the ui-sdk layer.
 *
 * ui-sdk renders popovers, menus, selects and tooltips in the top layer with a
 * `data-slot` and `data-open` while they are open. The graph's own keyboard
 * handlers must stand down while one is open, otherwise their `preventDefault`
 * on Escape stops ui-sdk's dismissal (it ignores already-prevented events).
 */

const POPUP_SELECTOR = [
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[data-slot="popover-content"]',
  '[data-slot="menu-content"]',
  '[data-slot="select-content"]',
].join(", ");

/** Check if an element is inside a popup (dialog, menu, select list, popover). */
export function isElementInPopup(element: Element | null): boolean {
  if (!element) return false;
  return element.closest(POPUP_SELECTOR) !== null;
}

/**
 * Whether any ui-sdk popup (popover, menu, select) is open anywhere on the
 * page. Tooltips are excluded: one is showing whenever the pointer rests on a
 * control, and it must not swallow the graph's Escape shortcut.
 */
export function isAnyPopupOpen(): boolean {
  return document.querySelector('[data-slot][data-open]:not([data-slot^="tooltip"])') !== null;
}

/** Whether a ui-sdk tooltip is currently showing. */
export function isTooltipOpen(): boolean {
  return document.querySelector('[data-slot="tooltip-content"][data-open]') !== null;
}
