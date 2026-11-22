import { jsx as _jsx } from "react/jsx-runtime";
import { PlanDiagram } from "./PlanDiagram.js";
/**
 * Pure interactive execution-plan flow canvas: drag-to-pan, Ctrl/Cmd + wheel zoom, and optional minimap,
 * with zero insight banners, prose summaries, headers, or built-in property drawers.
 */
export function PlanCanvas({ plan, query, lens, defaultLens, selectedId, onSelect, initialZoom, zoom, onZoomChange, showInsights = false, showControls = true, showMinimap, height, marks, tints, overlay, theme, className, }) {
    return (_jsx(PlanDiagram, { plan: plan, query: query, bare: true, showProps: false, showInsights: showInsights, showControls: showControls, showMinimap: showMinimap ?? undefined, lens: lens, defaultLens: defaultLens, height: height, selectedId: selectedId, onSelect: onSelect, initialZoom: initialZoom, zoom: zoom, onZoomChange: onZoomChange, marks: marks, tints: tints, overlay: overlay, theme: theme, className: className }));
}
