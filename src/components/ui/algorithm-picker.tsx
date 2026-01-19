import { useState } from "react";
import { Workflow } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { GrainTexture } from "./grain-texture";
import { cn } from "../../lib/utils";
import { algorithmRegistry, type AlgorithmAdapter } from "../../algorithms";

interface SelectedOption {
  key: string;
  text: string;
}

interface AlgorithmPickerProps {
  selectedAlgo: SelectedOption | undefined;
  onSelect: (key: string) => void;
  disabled?: boolean;
}

interface AlgorithmCardProps {
  algorithm: AlgorithmAdapter;
  selected: boolean;
  onClick: () => void;
}

const AlgorithmCard = ({ algorithm, selected, onClick }: AlgorithmCardProps) => {
  const { metadata } = algorithm;
  const Icon = metadata.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 p-3 rounded-lg  duration-100 overflow-hidden",
        "bg-[var(--color-surface)]",
        "focus:outline-none",
        selected
          ? "shadow-[var(--shadow-pressed)] ring-2 ring-[var(--color-accent)]"
          : "shadow-[var(--shadow-raised),var(--highlight-edge)] hover:ring-2 hover:ring-[var(--color-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50"
      )}
    >
      <GrainTexture baseFrequency={4.2} className="rounded-lg" />
      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <Icon className="w-6 h-6 text-[var(--color-text-muted)]" />
        <span className="font-semibold text-sm text-[var(--color-text)]">
          {metadata.name}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] text-center leading-tight">
          {metadata.tagline}
        </span>
      </div>
    </button>
  );
};

export const AlgorithmPicker = ({
  selectedAlgo,
  onSelect,
  disabled,
}: AlgorithmPickerProps) => {
  const [open, setOpen] = useState(false);
  const algorithms = algorithmRegistry.getAll();

  // Get the selected algorithm's icon, or fall back to Workflow
  const selectedAlgorithm = selectedAlgo ? algorithmRegistry.get(selectedAlgo.key) : null;
  const TriggerIcon = selectedAlgorithm?.metadata.icon ?? Workflow;

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          className={cn(
            "w-auto transition-none h-9 !rounded-full gap-1.5",
            "justify-center"
          )}
        >
          <TriggerIcon className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">
            {selectedAlgo ? selectedAlgo.text : "Algorithm"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-3"
        align="center"
        sideOffset={8}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {algorithms.map((algo) => (
            <AlgorithmCard
              key={algo.metadata.id}
              algorithm={algo}
              selected={selectedAlgo?.key === algo.metadata.id}
              onClick={() => {
                onSelect(algo.metadata.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
