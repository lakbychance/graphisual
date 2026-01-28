import { cn } from "@/lib/utils";
import { CONNECTOR } from "../../constants/graph";

interface EdgeConnectorProps {
  nodeX: number;
  nodeY: number;
  nodeR: number;
  position: "top" | "right" | "bottom" | "left";
  visible: boolean;
  onDragStart: (position: string, startX: number, startY: number) => void;
}

export const EdgeConnector = ({
  nodeX,
  nodeY,
  nodeR,
  position,
  visible,
  onDragStart,
}: EdgeConnectorProps) => {
  const offset = nodeR + CONNECTOR.OFFSET;

  const positions = {
    top: { cx: nodeX, cy: nodeY - offset },
    right: { cx: nodeX + offset, cy: nodeY },
    bottom: { cx: nodeX, cy: nodeY + offset },
    left: { cx: nodeX - offset, cy: nodeY },
  };

  const { cx, cy } = positions[position];

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onDragStart(position, cx, cy);
  };

  return (
    <g>
      {/* Invisible larger hit area for touch devices */}
      <circle
        cx={cx}
        cy={cy}
        r={CONNECTOR.TOUCH_HIT_AREA}
        onPointerDown={handlePointerDown}
        className={cn(
          "cursor-crosshair fill-transparent",
          visible ? "pointer-events-auto" : "pointer-events-none"
        )}
      />
      {/* Visible connector */}
      <circle
        cx={cx}
        cy={cy}
        r={CONNECTOR.RADIUS}
        className={cn(
          "pointer-events-none",
          "[transition:opacity_150ms]",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{
          fill: 'url(#nodeGradientDefault)',
          stroke: 'var(--color-node-stroke)',
          strokeWidth: 1,
          filter: 'drop-shadow(1.5px 1.5px 2px var(--node-shadow-color))',
        }}
      />
    </g>
  );
};
