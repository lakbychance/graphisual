import { CONNECTOR } from "../../constants/graph";

interface EdgeConnectorProps {
  nodeX: number;
  nodeY: number;
  nodeR: number;
  position: "top" | "right" | "bottom" | "left";
  onDragStart: (position: string, startX: number, startY: number) => void;
}

export const EdgeConnector = ({
  nodeX,
  nodeY,
  nodeR,
  position,
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
    <g className="edge-connector">
      {/* Invisible larger hit area for touch devices */}
      <circle
        cx={cx}
        cy={cy}
        r={CONNECTOR.TOUCH_HIT_AREA}
        onPointerDown={handlePointerDown}
        className="cursor-crosshair fill-transparent pointer-events-auto"
      />
      {/* Visible connector */}
      <circle
        cx={cx}
        cy={cy}
        r={CONNECTOR.RADIUS}
        className="pointer-events-none opacity-100"
        style={{
          fill: 'url(#nodeGradientDefault)',
          stroke: 'var(--color-node-stroke)',
          strokeWidth: 1,
        }}
      />
    </g>
  );
};
