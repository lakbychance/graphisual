import type { DataStructureState } from "../../algorithms/types";
import { cn } from "@/lib/utils";
import * as m from 'motion/react-m';
import { AnimatePresence, MotionConfig } from "motion/react";
import { useMemo } from "react";

const MAX_VISIBLE_ITEMS = 6;

// Shared transition configs
const transition = { type: "spring", duration: 0.6, bounce: 0.15 } as const;
const recursionTransition = { type: "spring", duration: 0.6, bounce: 0.1 } as const;

// Shared styles
const styles = {
  itemBase: "px-2.5 py-1 rounded text-xs font-mono",
  itemDefault: "bg-[var(--color-paper)] text-[var(--color-text)] border border-[var(--color-divider)]",
  itemProcessing: "bg-[var(--color-accent-form)] text-white shadow-[var(--shadow-control)]",
  itemRing: "ring-2 ring-[var(--color-accent-form)]",
  itemJustAdded: "bg-[var(--color-accent-form)]/10 border-[var(--color-accent-form)]",
  itemWithValue: "text-center flex flex-col leading-tight",
  label: "text-xs text-[var(--color-text-muted)]",
  grid: "grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 items-center",
};

// Animation helpers
const fadeScaleAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Shared label component
const DSLabel = ({ children }: { children: React.ReactNode }) => (
  <span className={styles.label}>{children}</span>
);

// Shared overflow indicator
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

// Processing box with layout animation
const ProcessingBox = ({
  id,
  value,
  layoutId,
  getNodeLabel,
}: {
  id: number;
  value?: number;
  layoutId: string;
  getNodeLabel: (id: number) => string;
}) => (
  <m.div
    key={id}
    layoutId={layoutId}
    className={cn(
      styles.itemBase,
      styles.itemProcessing,
      value !== undefined && styles.itemWithValue
    )}
    {...fadeScaleAnimation}
  >
    {value !== undefined ? (
      <>
        <span>{getNodeLabel(id)}</span>
        <span className="text-[10px] opacity-75">d={value}</span>
      </>
    ) : (
      getNodeLabel(id)
    )}
  </m.div>
);

// Animated item for queue/stack/priority-queue
const AnimatedItem = ({
  item,
  layoutId,
  hasRing,
  isJustAdded,
  showValue,
  getNodeLabel,
}: {
  item: { id: number; value?: number };
  layoutId: string;
  hasRing: boolean;
  isJustAdded: boolean;
  showValue: boolean;
  getNodeLabel: (id: number) => string;
}) => (
  <m.div
    key={item.id}
    layoutId={layoutId}
    layout
    className={cn(
      styles.itemBase,
      styles.itemDefault,
      showValue && styles.itemWithValue,
      hasRing && styles.itemRing,
      isJustAdded && styles.itemJustAdded
    )}
    initial={isJustAdded ? { opacity: 0, scale: 0.95 } : false}
    animate={{ opacity: 1, scale: 1 }}
  >
    {showValue && item.value !== undefined ? (
      <>
        <span>{getNodeLabel(item.id)}</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">d={item.value}</span>
      </>
    ) : (
      getNodeLabel(item.id)
    )}
  </m.div>
);

// Static item box (for non-animated sections)
const ItemBox = ({
  id,
  value,
  hasRing,
  isJustAdded,
  getNodeLabel,
}: {
  id: number;
  value?: number;
  hasRing?: boolean;
  isJustAdded?: boolean;
  getNodeLabel: (id: number) => string;
}) => (
  <div
    className={cn(
      styles.itemBase,
      styles.itemDefault,
      value !== undefined && styles.itemWithValue,
      hasRing && styles.itemRing,
      isJustAdded && styles.itemJustAdded
    )}
  >
    {value !== undefined ? (
      <>
        <span>{getNodeLabel(id)}</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">d={value}</span>
      </>
    ) : (
      getNodeLabel(id)
    )}
  </div>
);

interface DataStructureVisProps {
  dataStructure: DataStructureState;
  /** Resolves a node ID to its display label. Falls back to the numeric ID string. */
  getNodeLabel?: (id: number) => string;
}

export const DataStructureVis = ({ dataStructure, getNodeLabel = String }: DataStructureVisProps) => {
  const { items, processing, justAdded } = dataStructure;
  const justAddedSet = useMemo(() => new Set(justAdded || []), [justAdded]);

  if (dataStructure.type === "queue") {
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <MotionConfig transition={transition} reducedMotion="user">
        <div className={styles.grid}>
          <DSLabel>Processing:</DSLabel>
          <div className="flex items-center h-6">
            <AnimatePresence mode="popLayout">
              {processing && (
                <ProcessingBox
                  id={processing.id}
                  layoutId={`queue-item-${processing.id}`}
                  getNodeLabel={getNodeLabel}
                />
              )}
            </AnimatePresence>
          </div>

          <DSLabel>Queue:</DSLabel>
          <div className="flex items-center gap-1.5">
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="flex items-center gap-1">
                  {visibleItems.map((item, index) => (
                    <AnimatedItem
                      key={item.id}
                      item={item}
                      layoutId={`queue-item-${item.id}`}
                      hasRing={index === 0}
                      isJustAdded={justAddedSet.has(item.id)}
                      showValue={false}
                      getNodeLabel={getNodeLabel}
                    />
                  ))}
                </div>
                <OverflowIndicator count={hiddenCount} />
              </>
            )}
          </div>
        </div>
      </MotionConfig>
    );
  }

  if (dataStructure.type === "stack") {
    const visibleItems = items.slice(-MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <MotionConfig transition={transition} reducedMotion="user">
        <div className={styles.grid}>
          <DSLabel>Processing:</DSLabel>
          <div className="flex items-center h-6">
            <AnimatePresence mode="popLayout">
              {processing && (
                <ProcessingBox
                  id={processing.id}
                  layoutId={`stack-item-${processing.id}`}
                  getNodeLabel={getNodeLabel}
                />
              )}
            </AnimatePresence>
          </div>

          <DSLabel>Stack:</DSLabel>
          <div className="flex items-center gap-1.5">
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <OverflowIndicator count={hiddenCount} />
                <div className="flex items-center gap-1">
                  {visibleItems.map((item, index) => (
                    <AnimatedItem
                      key={item.id}
                      item={item}
                      layoutId={`stack-item-${item.id}`}
                      hasRing={index === visibleItems.length - 1}
                      isJustAdded={justAddedSet.has(item.id)}
                      showValue={false}
                      getNodeLabel={getNodeLabel}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </MotionConfig>
    );
  }

  if (dataStructure.type === "priority-queue") {
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <MotionConfig transition={transition} reducedMotion="user">
        <div className={styles.grid}>
          <DSLabel>Processing:</DSLabel>
          <div className="flex items-center h-8">
            <AnimatePresence mode="popLayout">
              {processing && (
                <ProcessingBox
                  id={processing.id}
                  value={processing.value}
                  layoutId={`pq-item-${processing.id}`}
                  getNodeLabel={getNodeLabel}
                />
              )}
            </AnimatePresence>
          </div>

          <DSLabel>Priority Queue:</DSLabel>
          <div className="flex items-center gap-1.5">
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="flex items-center gap-1">
                  {visibleItems.map((item, index) => (
                    <AnimatedItem
                      key={item.id}
                      item={item}
                      layoutId={`pq-item-${item.id}`}
                      hasRing={index === 0}
                      isJustAdded={justAddedSet.has(item.id)}
                      showValue={true}
                      getNodeLabel={getNodeLabel}
                    />
                  ))}
                </div>
                <OverflowIndicator count={hiddenCount} />
              </>
            )}
          </div>
        </div>
      </MotionConfig>
    );
  }

  if (dataStructure.type === "recursion-stack") {
    const visibleItems = items.slice(-MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <MotionConfig transition={recursionTransition} reducedMotion="user">
        <div className={styles.grid}>
          <DSLabel>Exploring:</DSLabel>
          <div className="flex items-center h-6">
            {processing && (
              <div className={cn(styles.itemBase, styles.itemProcessing)}>
                {getNodeLabel(processing.id)}
              </div>
            )}
          </div>

          <DSLabel>Call Stack:</DSLabel>
          <div className="flex items-center gap-1.5">
            {items.length === 0 ? (
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
                          styles.itemBase,
                          styles.itemDefault,
                          index === visibleItems.length - 1 && styles.itemRing,
                          justAddedSet.has(item.id) && styles.itemJustAdded
                        )}
                        initial={{ opacity: 0, scale: 0.95, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 10 }}
                      >
                        {getNodeLabel(item.id)}
                      </m.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>
      </MotionConfig>
    );
  }

  if (dataStructure.type === "distances") {
    const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
    const hiddenCount = items.length - MAX_VISIBLE_ITEMS;

    return (
      <div className={styles.grid}>
        {processing && (
          <>
            <DSLabel>Updated:</DSLabel>
            <div className="flex items-center">
              <div className={cn(styles.itemBase, styles.itemProcessing, styles.itemWithValue)}>
                <span>{getNodeLabel(processing.id)}</span>
                <span className="text-[10px] opacity-75">d={processing.value}</span>
              </div>
            </div>
          </>
        )}

        {visibleItems.length > 0 && (
          <>
            <DSLabel>Distances:</DSLabel>
            <div className="flex items-center gap-1">
              {visibleItems.map((item) => (
                <ItemBox
                  key={item.id}
                  id={item.id}
                  value={item.value}
                  isJustAdded={justAddedSet.has(item.id)}
                  getNodeLabel={getNodeLabel}
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
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(styles.itemBase, "bg-[var(--color-paper)] text-[var(--color-text)]")}
        >
          {getNodeLabel(item.id)}
          {item.value !== undefined && `:${item.value}`}
        </div>
      ))}
    </div>
  );
};
