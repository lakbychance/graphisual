/** The check mark shared by checkboxes and by menu / select item indicators. */
export function CheckIcon({ strokeWidth = 2 }: { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 6.5 5 9l4.5-6" />
    </svg>
  );
}
