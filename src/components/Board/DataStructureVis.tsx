import type { DataStructureState } from "../../algorithms/types";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_ITEMS = 6;

// Shared component for the processing/updated indicator
const ProcessingIndicator = ({
  label,
  id,
  value,
}: {
  label: string;
  id: number;
  value?: number;
}) => (
  <div className="flex items-center gap-1.5">
    <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
    <div
      className={cn(
        "px-2.5 py-1 rounded text-xs font-mono",
        "bg-[var(--color-accent-form)] text-white",
        "shadow-sm",
        value !== undefined && "text-center flex flex-col leading-tight"
      )}
    >
      {value !== undefined ? (
        <>
          <span>{id}</span>
          <span className="text-[10px] opacity-75">d={value}</span>
        </>
      ) : (
        id
      )}
    </div>
  </div>
);

// Shared component for individual item boxes
const ItemBox = ({
  id,
  value,
  hasRing,
  isJustAdded,
}: {
  id: number;
  value?: number;
  hasRing?: boolean;
  isJustAdded?: boolean;
}) => (
  <div
    className={cn(
      "px-2.5 py-1 rounded text-xs font-mono",
      "bg-[var(--color-paper)] text-[var(--color-text)]",
      "border border-[var(--color-divider)]",
      value !== undefined && "text-center flex flex-col leading-tight",
      hasRing && "ring-1 ring-[var(--color-text-muted)] ring-offset-1 ring-offset-[var(--color-surface)]",
      isJustAdded && "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]"
    )}
  >
    {value !== undefined ? (
      <>
        <span>{id}</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">d={value}</span>
      </>
    ) : (
      id
    )}
  </div>
);

// Shared component for overflow indicator
const OverflowIndicator = ({ count }: { count: number }) =>
  count > 0 ? (
    <span className="text-xs text-[var(--color-text-muted)] ml-0.5">
      +{count} more
    </span>
  ) : null;

// Shared empty state
const EmptyState = () => (
  <span className="text-xs text-[var(--color-text-muted)] italic">empty</span>
);

// Direction label (front/back/top/bottom/min)
const DirectionLabel = ({ text }: { text: string }) => (
  <span className="text-[10px] text-[var(--color-text-muted)]">({text})</span>
);

interface DataStructureVisProps {
  dataStructure: DataStructureState;
}

export const DataStructureVis = ({ dataStructure }: DataStructureVisProps) => {
  const { items, processing, justAdded } = dataStructure;
  const justAddedSet = new Set(justAdded || []);

  if (dataStructure.type === "queue") {
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <div className="flex flex-col gap-2">
        {processing && (
          <ProcessingIndicator label="Processing:" id={processing.id} />
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-muted)] mr-0.5">Queue:</span>

          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <DirectionLabel text="front" />
              <div className="flex items-center gap-1">
                {visibleItems.map((item, index) => (
                  <ItemBox
                    key={item.id}
                    id={item.id}
                    hasRing={index === 0}
                    isJustAdded={justAddedSet.has(item.id)}
                  />
                ))}
                <OverflowIndicator count={hiddenCount} />
              </div>
              {hiddenCount <= 0 && <DirectionLabel text="back" />}
            </>
          )}
        </div>
      </div>
    );
  }

  if (dataStructure.type === "stack") {
    const visibleItems = items.slice(-MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <div className="flex flex-col gap-2">
        {processing && (
          <ProcessingIndicator label="Processing:" id={processing.id} />
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-muted)] mr-0.5">Stack:</span>

          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {hiddenCount > 0 ? (
                <OverflowIndicator count={hiddenCount} />
              ) : (
                <DirectionLabel text="bottom" />
              )}
              <div className="flex items-center gap-1">
                {visibleItems.map((item, index) => (
                  <ItemBox
                    key={item.id}
                    id={item.id}
                    hasRing={index === visibleItems.length - 1}
                    isJustAdded={justAddedSet.has(item.id)}
                  />
                ))}
              </div>
              <DirectionLabel text="top" />
            </>
          )}
        </div>
      </div>
    );
  }

  if (dataStructure.type === "priority-queue") {
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <div className="flex flex-col gap-2">
        {processing && (
          <ProcessingIndicator
            label="Processing:"
            id={processing.id}
            value={processing.value}
          />
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-muted)] mr-0.5">Priority Queue:</span>

          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <DirectionLabel text="min" />
              <div className="flex items-center gap-1">
                {visibleItems.map((item, index) => (
                  <ItemBox
                    key={item.id}
                    id={item.id}
                    value={item.value}
                    hasRing={index === 0}
                    isJustAdded={justAddedSet.has(item.id)}
                  />
                ))}
                <OverflowIndicator count={hiddenCount} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (dataStructure.type === "distances") {
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <div className="flex flex-col gap-2">
        {processing && (
          <ProcessingIndicator
            label="Updated:"
            id={processing.id}
            value={processing.value}
          />
        )}

        {visibleItems.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)] mr-0.5">Distances:</span>
            <div className="flex items-center gap-1">
              {visibleItems.map((item) => (
                <ItemBox
                  key={item.id}
                  id={item.id}
                  value={item.value}
                  isJustAdded={justAddedSet.has(item.id)}
                />
              ))}
              <OverflowIndicator count={hiddenCount} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {items.map((item, index) => (
        <div
          key={`${item.id}-${index}`}
          className="px-2 py-1 rounded text-xs font-mono bg-[var(--color-paper)] text-[var(--color-text)]"
        >
          {item.id}
          {item.value !== undefined && `:${item.value}`}
        </div>
      ))}
    </div>
  );
};
