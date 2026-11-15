import { useRef, useState } from "react";
import { Input, Popover, PopoverContent } from "@/components/ui-sdk";

interface NodeLabelPopupProps {
  anchorPosition: { x: number; y: number };
  nodeId: number;
  currentLabel: string | undefined;
  onConfirm: (label: string) => void;
  onClose: () => void;
}

/** Rename a node: a single input anchored above it. Enter confirms, Escape cancels. */
export const NodeLabelPopup = ({ anchorPosition, nodeId, currentLabel, onConfirm, onClose }: NodeLabelPopupProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => setIsOpen(false);

  const handleConfirm = () => {
    onConfirm(inputRef.current?.value ?? "");
    handleClose();
  };

  return (
    <Popover
      modal
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      onOpenChangeComplete={(open) => !open && onClose()}
    >
      <PopoverContent
        side="top"
        sideOffset={12}
        anchor={anchorPosition}
        className="p-2"
        aria-label="Rename node"
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.stopPropagation(); handleConfirm(); }
          if (e.key === "Escape") { e.stopPropagation(); handleClose(); }
        }}
      >
        <Input
          ref={inputRef}
          aria-label="Node label"
          defaultValue={currentLabel ?? ""}
          placeholder={String(nodeId)}
          maxLength={5}
          onFocus={(e) => e.currentTarget.select()}
          className="w-16 text-center text-sm font-bold"
        />
      </PopoverContent>
    </Popover>
  );
};
