import type { DataStructureState } from "../../algorithms/types";
import { cn } from "@/lib/utils";
import * as m from 'motion/react-m';
import { AnimatePresence, LayoutGroup } from "motion/react";
import { useRef, useEffect, useState } from "react";

const MAX_VISIBLE_ITEMS = 6;
const RAPID_STEP_THRESHOLD = 300; // ms - if updates come faster than this, reduce animations

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
      hasRing && "ring-2 ring-[var(--color-accent-form)]",
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

interface DataStructureVisProps {
  dataStructure: DataStructureState;
}

export const DataStructureVis = ({ dataStructure }: DataStructureVisProps) => {
  const { items, processing, justAdded } = dataStructure;
  const justAddedSet = new Set(justAdded || []);

  // Track timing to detect rapid stepping
  const lastUpdateRef = useRef<number>(Date.now());
  const [isRapidStepping, setIsRapidStepping] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    lastUpdateRef.current = now;
    setIsRapidStepping(timeSinceLastUpdate < RAPID_STEP_THRESHOLD);
  }, [dataStructure]);

  const transitionDuration = isRapidStepping ? 0.08 : 0.5;

  if (dataStructure.type === "queue") {
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <LayoutGroup>
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 items-center">
          {/* Processing row */}
          <span className="text-xs text-[var(--color-text-muted)]">Processing:</span>
          <div className="flex items-center h-7">
            <AnimatePresence mode="popLayout">
              {processing && (
                <m.div
                  key={processing.id}
                  layoutId={`queue-item-${processing.id}`}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-mono",
                    "bg-[var(--color-accent-form)] text-white",
                    "shadow-sm"
                  )}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", duration: transitionDuration, bounce: isRapidStepping ? 0 : 0.15 }}
                >
                  {processing.id}
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Queue row */}
          <span className="text-xs text-[var(--color-text-muted)]">Queue:</span>
          <div className="flex items-center gap-1.5">
            {items.length === 0 && !processing ? (
              <EmptyState />
            ) : (
              <>
                <div className="flex items-center gap-1">
                  {visibleItems.map((item, index) => (
                    <m.div
                      key={item.id}
                      layoutId={`queue-item-${item.id}`}
                      layout
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono",
                        "bg-[var(--color-paper)] text-[var(--color-text)]",
                        "border border-[var(--color-divider)]",
                        index === 0 && "ring-2 ring-[var(--color-accent-form)]",
                        justAddedSet.has(item.id) && "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]"
                      )}
                      initial={justAddedSet.has(item.id) ? { opacity: 0, scale: 0.95 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", duration: transitionDuration, bounce: isRapidStepping ? 0 : 0.15 }}
                    >
                      {item.id}
                    </m.div>
                  ))}
                </div>
                <OverflowIndicator count={hiddenCount} />
              </>
            )}
          </div>
        </div>
      </LayoutGroup>
    );
  }

  if (dataStructure.type === "stack") {
    const visibleItems = items.slice(-MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <LayoutGroup>
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 items-center">
          <span className="text-xs text-[var(--color-text-muted)]">Processing:</span>
          <div className="flex items-center h-7">
            <AnimatePresence mode="popLayout">
              {processing && (
                <m.div
                  key={processing.id}
                  layoutId={`stack-item-${processing.id}`}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-mono",
                    "bg-[var(--color-accent-form)] text-white",
                    "shadow-sm"
                  )}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", duration: transitionDuration, bounce: isRapidStepping ? 0 : 0.15 }}
                >
                  {processing.id}
                </m.div>
              )}
            </AnimatePresence>
          </div>

          <span className="text-xs text-[var(--color-text-muted)]">Stack:</span>
          <div className="flex items-center gap-1.5">
            {items.length === 0 && !processing ? (
              <EmptyState />
            ) : (
              <>
                <OverflowIndicator count={hiddenCount} />
                <div className="flex items-center gap-1">
                  {visibleItems.map((item, index) => (
                    <m.div
                      key={item.id}
                      layoutId={`stack-item-${item.id}`}
                      layout
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono",
                        "bg-[var(--color-paper)] text-[var(--color-text)]",
                        "border border-[var(--color-divider)]",
                        index === visibleItems.length - 1 && "ring-2 ring-[var(--color-accent-form)]",
                        justAddedSet.has(item.id) && "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]"
                      )}
                      initial={justAddedSet.has(item.id) ? { opacity: 0, scale: 0.95 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", duration: transitionDuration, bounce: isRapidStepping ? 0 : 0.15 }}
                    >
                      {item.id}
                    </m.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </LayoutGroup>
    );
  }

  if (dataStructure.type === "priority-queue") {
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <LayoutGroup>
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 items-center">
          <span className="text-xs text-[var(--color-text-muted)]">Processing:</span>
          <div className="flex items-center h-9">
            <AnimatePresence mode="popLayout">
              {processing && (
                <m.div
                  key={processing.id}
                  layoutId={`pq-item-${processing.id}`}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-mono",
                    "bg-[var(--color-accent-form)] text-white",
                    "shadow-sm text-center flex flex-col leading-tight"
                  )}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", duration: transitionDuration, bounce: isRapidStepping ? 0 : 0.15 }}
                >
                  <span>{processing.id}</span>
                  <span className="text-[10px] opacity-75">d={processing.value}</span>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          <span className="text-xs text-[var(--color-text-muted)]">Priority Queue:</span>
          <div className="flex items-center gap-1.5">
            {items.length === 0 && !processing ? (
              <EmptyState />
            ) : (
              <>
                <div className="flex items-center gap-1">
                  {visibleItems.map((item, index) => (
                    <m.div
                      key={item.id}
                      layoutId={`pq-item-${item.id}`}
                      layout
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono",
                        "bg-[var(--color-paper)] text-[var(--color-text)]",
                        "border border-[var(--color-divider)]",
                        "text-center flex flex-col leading-tight",
                        index === 0 && "ring-2 ring-[var(--color-accent-form)]",
                        justAddedSet.has(item.id) && "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]"
                      )}
                      initial={justAddedSet.has(item.id) ? { opacity: 0, scale: 0.95 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", duration: transitionDuration, bounce: isRapidStepping ? 0 : 0.15 }}
                    >
                      <span>{item.id}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">d={item.value}</span>
                    </m.div>
                  ))}
                </div>
                <OverflowIndicator count={hiddenCount} />
              </>
            )}
          </div>
        </div>
      </LayoutGroup>
    );
  }

  if (dataStructure.type === "recursion-stack") {
    const visibleItems = items.slice(-MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 items-center">
        <span className="text-xs text-[var(--color-text-muted)]">Exploring:</span>
        <div className="flex items-center h-7">
          {processing && (
            <div
              className={cn(
                "px-2.5 py-1 rounded text-xs font-mono",
                "bg-[var(--color-accent-form)] text-white",
                "shadow-sm"
              )}
            >
              {processing.id}
            </div>
          )}
        </div>

        <span className="text-xs text-[var(--color-text-muted)]">Call Stack:</span>
        <div className="flex items-center gap-1.5">
          {items.length === 0 && !processing ? (
            <EmptyState />
          ) : (
            <>
              <OverflowIndicator count={hiddenCount} />
              <div className="flex items-center gap-1">
                <AnimatePresence mode="popLayout">
                  {visibleItems.map((item, index) => (
                    <m.div
                      key={item.id}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono",
                        "bg-[var(--color-paper)] text-[var(--color-text)]",
                        "border border-[var(--color-divider)]",
                        index === visibleItems.length - 1 && "ring-2 ring-[var(--color-accent-form)]",
                        justAddedSet.has(item.id) && "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]"
                      )}
                      initial={{ opacity: 0, scale: 0.95, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: 10 }}
                      transition={{ type: "spring", duration: isRapidStepping ? 0.1 : 0.6, bounce: isRapidStepping ? 0 : 0.1 }}
                    >
                      {item.id}
                    </m.div>
                  ))}
                </AnimatePresence>
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
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 items-center">
        {processing && (
          <>
            <span className="text-xs text-[var(--color-text-muted)]">Updated:</span>
            <div className="flex items-center">
              <div
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-mono",
                  "bg-[var(--color-accent-form)] text-white",
                  "shadow-sm text-center flex flex-col leading-tight"
                )}
              >
                <span>{processing.id}</span>
                <span className="text-[10px] opacity-75">d={processing.value}</span>
              </div>
            </div>
          </>
        )}

        {visibleItems.length > 0 && (
          <>
            <span className="text-xs text-[var(--color-text-muted)]">Distances:</span>
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
          </>
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
