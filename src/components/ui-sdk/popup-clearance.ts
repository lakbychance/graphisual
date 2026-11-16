/**
 * Triggers sit inside a toolbar plate, and ui-sdk measures a popup's offset
 * from the trigger, not from the plate. This is added to the offset of every
 * trigger-hosted popover, menu and select so the popup clears the plate's edge
 * instead of butting against it. A popover given an explicit `anchor` (a point
 * on the canvas) is not in a plate and gets its `sideOffset` as written.
 */
export const POPUP_CLEARANCE = 6;
