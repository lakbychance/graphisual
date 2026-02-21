import { useEffect, useRef, useState } from "react";
import { GrainTexture } from "../ui/grain-texture";
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover";

interface NodeLabelPopupProps {
  anchorPosition: { x: number; y: number };
  nodeId: number;
  currentLabel: string | undefined;
  onConfirm: (label: string) => void;
  onClose: () => void;
}

export const NodeLabelPopup = ({
  anchorPosition,
  nodeId,
  currentLabel,
  onConfirm,
  onClose,
}: NodeLabelPopupProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select existing text on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 150);
  };

  const handleConfirm = () => {
    onConfirm(inputRef.current?.value ?? '');
    handleClose();
  };

  return (
    <Popover modal open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <PopoverAnchor asChild>
        <div
          style={{
            position: "fixed",
            left: anchorPosition.x,
            top: anchorPosition.y,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        side="top"
        sideOffset={12}
        className="p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.stopPropagation(); handleConfirm(); }
          if (e.key === "Escape") { e.stopPropagation(); handleClose(); }
        }}
      >
        <GrainTexture className="rounded-lg" />
        <input
          ref={inputRef}
          defaultValue={currentLabel ?? ""}
          placeholder={String(nodeId)}
          maxLength={5}
          className="focus-ring-animated-inset w-24 h-8 px-2 text-center text-sm font-bold rounded-md bg-[var(--color-paper)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] shadow-[var(--shadow-etched)] outline-none"
        />
      </PopoverContent>
    </Popover>
  );
};
