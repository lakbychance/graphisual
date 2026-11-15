/**
 * Most triggers sit inside a toolbar plate, and ui-sdk measures a popup's
 * offset from the trigger, not from the plate. This is added to every popover,
 * menu and select offset so the popup clears the plate's edge instead of
 * butting against it.
 */
export const POPUP_CLEARANCE = 6;
