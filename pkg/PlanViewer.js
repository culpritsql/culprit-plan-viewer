import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { planEngineName, planKindLabel } from "./host.js";
import { PlanSurface } from "./PlanSurface.js";
import { Sql } from "./Sql.js";
/**
 * Drop-in execution plan viewer: bottleneck insights, measured-run summary, cost/time strip,
 * interactive Diagram / Tree / Operations views, and operator property inspector.
 */
export function PlanViewer({ plan, query, focus, look: controlledLook, defaultLook = "diagram", onLookChange, showToolbar = true, showStatement = true, title, toolbarActions, theme, className, }) {
    const [internalLook, setInternalLook] = useState(defaultLook);
    const [sqlOpen, setSqlOpen] = useState(false);
    const look = controlledLook ?? internalLook;
    const handleLookChange = (next) => {
        setInternalLook(next);
        onLookChange?.(next);
    };
    return (_jsxs("div", { className: `culprit-pv pv-root ${className ?? ""}`, "data-theme": theme && theme !== "system" ? theme : undefined, children: [showToolbar && (_jsxs("div", { className: "pv-toolbar", children: [_jsxs("div", { className: "pv-meta", children: [title && _jsx("strong", { className: "pv-title", children: title }), _jsx("span", { className: "tag", children: planEngineName(plan) }), _jsx("span", { className: "muted", children: planKindLabel(plan) })] }), toolbarActions && (_jsxs(_Fragment, { children: [_jsx("span", { className: "spacer" }), toolbarActions] }))] })), showStatement && plan.statement && (_jsx("div", { className: `plans-sql ${sqlOpen ? "open" : ""}`, onClick: () => setSqlOpen((v) => !v), title: sqlOpen ? "Click to collapse SQL" : "Click to expand SQL", children: _jsx(Sql, { text: plan.statement }) })), _jsx(PlanSurface, { plan: plan, query: query, focus: focus, look: look, onLookChange: showToolbar ? handleLookChange : undefined })] }));
}
