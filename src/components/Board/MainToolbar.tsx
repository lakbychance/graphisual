import { useCallback, useState, type RefObject } from "react";
import { Box, Download, Feather, FileCode, FileText, Image, RotateCcw, Zap } from "lucide-react";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { type GraphRendererHandle } from "../GraphRenderer";
import { algorithmRegistry } from "../../algorithms";
import { AlgorithmPicker } from "../ui/algorithm-picker";
import { GraphGenerator } from "../ui/graph-generator";
import { IconAction } from "../ui/icon-action";
import {
  Menu, MenuContent, MenuItem, MenuItemIcon, MenuTrigger, Select, SelectContent, SelectItem, SelectItemIcon, SelectItemIndicator,
  SelectTrigger, SelectValueIcon, Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { useGraphStore } from "../../store/graphStore";
import { useSettingsStore, type RenderMode } from "../../store/settingsStore";
import { SPEED_LEVELS, VisualizationState } from "../../constants/visualization";
import { exportSvg } from "../../utils/export/exportSvg";
import { exportPng } from "../../utils/export/exportPng";
import { export3DPng } from "../../utils/export/export3DPng";
import { exportCanvasPng } from "../../utils/export/exportCanvasPng";
import { SpeedControl } from "./SpeedControl";
import { ModeToggle } from "./ModeToggle";

const RENDER_MODES: { value: RenderMode; label: string; hint: string; icon: typeof Feather }[] = [
  { value: "svg", label: "Standard", hint: "Smooth animations", icon: Feather },
  { value: "canvas", label: "Performance", hint: "For large graphs", icon: Zap },
  { value: "3d", label: "3D", hint: "View only", icon: Box },
];

interface MainToolbarProps {
  graphRendererRef: RefObject<GraphRendererHandle | null>;
  /** The edge list panel is open, and the button that opens and closes it. */
  textOpen: boolean;
  onToggleText: () => void;
  textButtonRef: RefObject<HTMLButtonElement | null>;
}

/**
 * The main toolbar: one tab stop, arrow keys walk every control. Popover,
 * select and menu triggers join the toolbar through `render`.
 */
export function MainToolbar({ graphRendererRef, textOpen, onToggleText, textButtonRef }: MainToolbarProps) {
  const visualizationAlgorithm = useGraphStore((state) => state.visualization.algorithm);
  const visualizationState = useGraphStore((state) => state.visualization.state);
  const hasNodes = useGraphStore((state) => state.data.nodes.length > 0);
  const visualizationSpeed = useGraphStore((state) => state.visualization.speed);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const setVisualizationAlgorithm = useGraphStore((state) => state.setVisualizationAlgorithm);
  const setVisualizationSpeed = useGraphStore((state) => state.setVisualizationSpeed);
  const resetGraph = useGraphStore((state) => state.resetGraph);
  const setVisualizationMode = useGraphStore((state) => state.setVisualizationMode);

  const renderMode = useSettingsStore((state) => state.renderMode);
  const setRenderMode = useSettingsStore((state) => state.setRenderMode);

  const isVisualizing = visualizationState === VisualizationState.RUNNING;
  const is3DMode = renderMode === "3d";
  const isDesktop = useIsDesktop();
  const [exporting, setExporting] = useState(false);

  const handleAlgoChange = (algoId: string) => {
    const algo = algorithmRegistry.get(algoId);
    if (!algo) return;
    setVisualizationAlgorithm({ key: algoId, text: algo.metadata.name });
  };

  const currentSpeedIndex = SPEED_LEVELS.findIndex((l) => l.ms === visualizationSpeed);
  const currentSpeedMultiplier = currentSpeedIndex >= 0 ? SPEED_LEVELS[currentSpeedIndex].multiplier : "1x";

  const handleIncreaseSpeed = () => {
    if (currentSpeedIndex < SPEED_LEVELS.length - 1) setVisualizationSpeed(SPEED_LEVELS[currentSpeedIndex + 1].ms);
  };
  const handleDecreaseSpeed = () => {
    if (currentSpeedIndex > 0) setVisualizationSpeed(SPEED_LEVELS[currentSpeedIndex - 1].ms);
  };

  const handleExportSvg = useCallback(async () => {
    const svgElement = graphRendererRef.current?.getGraphRef()?.getSvgElement();
    if (svgElement) await exportSvg(svgElement, { includeGrid: true, filename: "graph.svg" });
  }, [graphRendererRef]);

  const handleExport2DPng = useCallback(async () => {
    const currentRenderMode = useSettingsStore.getState().renderMode;
    if (currentRenderMode === "canvas") {
      const canvasElement = graphRendererRef.current?.getCanvasGraphRef()?.getCanvasElement();
      if (canvasElement) await exportCanvasPng(canvasElement, { filename: "graph.png" });
    } else {
      const svgElement = graphRendererRef.current?.getGraphRef()?.getSvgElement();
      if (svgElement) await exportPng(svgElement, { includeGrid: true, filename: "graph.png" });
    }
  }, [graphRendererRef]);

  const handleExport3DPng = useCallback(async () => {
    const canvas = graphRendererRef.current?.getGraph3DRef()?.getCanvas();
    if (!canvas) return;
    setExporting(true);
    try {
      await export3DPng(canvas, { filename: "graph-3d.png" });
    } finally {
      setExporting(false);
    }
  }, [graphRendererRef]);

  // Menu actions return a promise so the chosen item shows as pending until the file is ready.
  const handleExportAction = useCallback(
    (value: string) => (value === "svg" ? handleExportSvg() : handleExport2DPng()),
    [handleExportSvg, handleExport2DPng],
  );

  return (
    <Toolbar aria-label="Graph controls">
      <ModeToggle mode={visualizationMode} onModeChange={setVisualizationMode} disabled={isVisualizing} />

      <AlgorithmPicker selectedAlgo={visualizationAlgorithm} onSelect={handleAlgoChange} disabled={isVisualizing || !hasNodes} />

      <ToolbarSeparator />
      <GraphGenerator disabled={isVisualizing} />
      <IconAction
        ref={textButtonRef}
        label="Edge list"
        tip={textOpen ? "Close edge list" : "Edit as text"}
        aria-pressed={textOpen}
        data-pressed={textOpen ? "" : undefined}
        disabled={isVisualizing}
        onClick={onToggleText}
      >
        <FileText aria-hidden="true" />
      </IconAction>

      {isDesktop && (
        <SpeedControl
          speedMultiplier={currentSpeedMultiplier}
          disabled={isVisualizing}
          canDecrease={currentSpeedIndex > 0}
          canIncrease={currentSpeedIndex < SPEED_LEVELS.length - 1}
          onDecrease={handleDecreaseSpeed}
          onIncrease={handleIncreaseSpeed}
        />
      )}

      <ToolbarSeparator />

      <ToolbarGroup aria-label="View and export" className="gap-1 md:gap-2">
        {/* Render mode — desktop only */}
        <Select value={renderMode} onValueChange={(value) => value && setRenderMode(value as RenderMode)} disabled={isVisualizing}>
          <Tooltip>
            <TooltipTrigger render={<ToolbarButton render={<SelectTrigger />} aria-label="View mode" className="hidden lg:inline-flex" />}>
              <SelectValueIcon />
            </TooltipTrigger>
            <TooltipContent>View mode</TooltipContent>
          </Tooltip>
          <SelectContent align="center" sideOffset={10}>
            {RENDER_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value} label={mode.label}>
                <SelectItemIcon><mode.icon aria-hidden="true" /></SelectItemIcon>
                <span className="flex flex-col">
                  <span>{mode.label}</span>
                  <span className="gs-description">{mode.hint}</span>
                </span>
                <SelectItemIndicator />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Export — direct button in 3D mode, menu in 2D mode */}
        {is3DMode ? (
          <IconAction label="Export PNG" disabled={isVisualizing || !hasNodes || exporting} onClick={handleExport3DPng}>
            <Download aria-hidden="true" />
          </IconAction>
        ) : (
          <Menu onAction={handleExportAction}>
            <Tooltip>
              <TooltipTrigger render={<ToolbarButton render={<MenuTrigger />} aria-label="Export" disabled={isVisualizing || !hasNodes} />}>
                <Download aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Export</TooltipContent>
            </Tooltip>
            <MenuContent align="center" sideOffset={10}>
              {renderMode === "svg" && (
                <MenuItem value="svg">
                  <MenuItemIcon><FileCode aria-hidden="true" /></MenuItemIcon>
                  Export as SVG
                </MenuItem>
              )}
              <MenuItem value="png">
                <MenuItemIcon><Image aria-hidden="true" /></MenuItemIcon>
                Export as PNG
              </MenuItem>
            </MenuContent>
          </Menu>
        )}

        <IconAction label="Reset graph" tone="danger" disabled={isVisualizing} onClick={resetGraph}>
          <RotateCcw aria-hidden="true" />
        </IconAction>
      </ToolbarGroup>
    </Toolbar>
  );
}
