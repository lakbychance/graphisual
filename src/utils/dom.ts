/**
 * Check if an element is inside a popup (dialog, menu, popover)
 */
export function isElementInPopup(element: Element | null): boolean {
  if (!element) return false;
  return element.closest('[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper], [data-graph-popup]') !== null;
}
