import type { DataStructureState } from "../../algorithms/types";
import { cn } from "@/lib/utils";

interface DataStructureVisProps {
  dataStructure: DataStructureState;
}

const MAX_VISIBLE_ITEMS = 6;

export const DataStructureVis = ({ dataStructure }: DataStructureVisProps) => {
  const { items, processing, justAdded } = dataStructure;
  const justAddedSet = new Set(justAdded || []);

  if (dataStructure.type === "queue") {
    const isEmpty = items.length === 0;
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <div className="flex flex-col gap-2">
        {/* Processing indicator */}
        {processing && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">Processing:</span>
            <div
              className={cn(
                "px-2.5 py-1 rounded text-xs font-mono",
                "bg-[var(--color-accent-form)] text-white",
                "shadow-sm"
              )}
            >
              {processing.id}
            </div>
          </div>
        )}

        {/* Queue visualization */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-muted)] mr-0.5">Queue:</span>

          {isEmpty ? (
            <span className="text-xs text-[var(--color-text-muted)] italic">
              empty
            </span>
          ) : (
            <>
              <span className="text-[10px] text-[var(--color-text-muted)]">(front)</span>
              <div className="flex items-center gap-1">
                {visibleItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-mono",
                      "bg-[var(--color-paper)] text-[var(--color-text)]",
                      "border border-[var(--color-divider)]",
                      index === 0 && "ring-1 ring-[var(--color-text-muted)] ring-offset-1 ring-offset-[var(--color-surface)]",
                      justAddedSet.has(item.id) && "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]"
                    )}
                  >
                    {item.id}
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <span className="text-xs text-[var(--color-text-muted)] ml-0.5">
                    +{hiddenCount} more
                  </span>
                )}
              </div>
              {hiddenCount <= 0 && (
                <span className="text-[10px] text-[var(--color-text-muted)]">(back)</span>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (dataStructure.type === "stack") {
    const isEmpty = items.length === 0;
    // For stack, show last items (top of stack) - take from end
    const visibleItems = items.slice(-MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <div className="flex flex-col gap-2">
        {/* Processing indicator */}
        {processing && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">Processing:</span>
            <div
              className={cn(
                "px-2.5 py-1 rounded text-xs font-mono",
                "bg-[var(--color-accent-form)] text-white",
                "shadow-sm"
              )}
            >
              {processing.id}
            </div>
          </div>
        )}

        {/* Stack visualization */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-muted)] mr-0.5">Stack:</span>

          {isEmpty ? (
            <span className="text-xs text-[var(--color-text-muted)] italic">
              empty
            </span>
          ) : (
            <>
              {hiddenCount > 0 && (
                <span className="text-xs text-[var(--color-text-muted)] mr-0.5">
                  +{hiddenCount} more
                </span>
              )}
              {hiddenCount <= 0 && (
                <span className="text-[10px] text-[var(--color-text-muted)]">(bottom)</span>
              )}
              <div className="flex items-center gap-1">
                {visibleItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-mono",
                      "bg-[var(--color-paper)] text-[var(--color-text)]",
                      "border border-[var(--color-divider)]",
                      // Last item is top of stack (will be popped next)
                      index === visibleItems.length - 1 && "ring-1 ring-[var(--color-text-muted)] ring-offset-1 ring-offset-[var(--color-surface)]",
                      justAddedSet.has(item.id) && "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]"
                    )}
                  >
                    {item.id}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)]">(top)</span>
            </>
          )}
        </div>
      </div>
    );
  }

  if (dataStructure.type === "priority-queue") {
    const isEmpty = items.length === 0;
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <div className="flex flex-col gap-2">
        {/* Processing indicator */}
        {processing && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">Processing:</span>
            <div
              className={cn(
                "px-2.5 py-1 rounded text-xs font-mono text-center",
                "bg-[var(--color-accent-form)] text-white",
                "shadow-sm flex flex-col leading-tight"
              )}
            >
              <span>{processing.id}</span>
              {processing.value !== undefined && (
                <span className="text-[10px] opacity-75">d={processing.value}</span>
              )}
            </div>
          </div>
        )}

        {/* Priority Queue visualization */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-muted)] mr-0.5">Priority Queue:</span>

          {isEmpty ? (
            <span className="text-xs text-[var(--color-text-muted)] italic">
              empty
            </span>
          ) : (
            <>
              <span className="text-[10px] text-[var(--color-text-muted)]">(min)</span>
              <div className="flex items-center gap-1">
                {visibleItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-mono text-center",
                      "bg-[var(--color-paper)] text-[var(--color-text)]",
                      "border border-[var(--color-divider)]",
                      "flex flex-col leading-tight",
                      index === 0 && "ring-1 ring-[var(--color-text-muted)] ring-offset-1 ring-offset-[var(--color-surface)]",
                      justAddedSet.has(item.id) && "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]"
                    )}
                  >
                    <span>{item.id}</span>
                    {item.value !== undefined && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">d={item.value}</span>
                    )}
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <span className="text-xs text-[var(--color-text-muted)] ml-0.5">
                    +{hiddenCount} more
                  </span>
                )}
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
        {/* Processing indicator */}
        {processing && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">Updated:</span>
            <div
              className={cn(
                "px-2.5 py-1 rounded text-xs font-mono text-center",
                "bg-[var(--color-accent-form)] text-white",
                "shadow-sm flex flex-col leading-tight"
              )}
            >
              <span>{processing.id}</span>
              {processing.value !== undefined && (
                <span className="text-[10px] opacity-75">d={processing.value}</span>
              )}
            </div>
          </div>
        )}

        {/* Distances visualization - only show if there are items */}
        {visibleItems.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)] mr-0.5">Distances:</span>
            <div className="flex items-center gap-1">
              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-mono text-center",
                    "bg-[var(--color-paper)] text-[var(--color-text)]",
                    "border border-[var(--color-divider)]",
                    "flex flex-col leading-tight",
                    justAddedSet.has(item.id) && "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]"
                  )}
                >
                  <span>{item.id}</span>
                  {item.value !== undefined && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">d={item.value}</span>
                  )}
                </div>
              ))}
              {hiddenCount > 0 && (
                <span className="text-xs text-[var(--color-text-muted)] ml-0.5">
                  +{hiddenCount} more
                </span>
              )}
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
