import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, ChevronRight, ChevronUp, Flame, Search, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActualSummary } from "./ActualSummary.js";
import { canPlanEstimates, count, estRows, estRowsForRuns, findingNoShareReason, insightsByNode, misestimate, noShareReason, percent, planKindLabel, planShares, predicateLabel, rows as rowsText, shortPredicate, t, } from "./host.js";
import { NodeDetails } from "./NodeDetails.js";
import { OpIcon } from "./OpIcon.js";
export { planKindLabel, predicateLabel, shortPredicate };
const WARNING_LABEL = {
    "implicit-conversion": () => t("ui.plan_view.warning.implicit_conversion"),
    spill: () => t("ui.plan_view.warning.spill"),
    "no-join-predicate": () => t("ui.plan_view.warning.no_join_predicate"),
    "missing-statistics": () => t("ui.plan_view.warning.missing_statistics"),
    "memory-grant": () => t("ui.plan_view.warning.memory_grant"),
    misestimate: () => t("ui.plan_view.warning.misestimate"),
    "residual-predicate": () => t("ui.plan_view.warning.residual_predicate"),
};
const warningLabel = (w) => WARNING_LABEL[w]?.() ?? w;
function walk(node, out = []) {
    out.push(node);
    node.children.forEach((c) => walk(c, out));
    return out;
}
function pathTo(node, id) {
    if (node.id === id)
        return [node.id];
    for (const child of node.children) {
        const path = pathTo(child, id);
        if (path)
            return [node.id, ...path];
    }
    return null;
}
function heatVar(share) {
    if (share >= 0.3)
        return "var(--heat-4)";
    if (share >= 0.15)
        return "var(--heat-3)";
    if (share >= 0.05)
        return "var(--heat-2)";
    if (share >= 0.01)
        return "var(--heat-1)";
    return "var(--heat-0)";
}
export function PlanView({ plan, query, focus, compact, selectedId, onSelect, showHeader = true, showActualSummary = true, showProps = true, showInsights = true, theme, className, }) {
    const nodes = useMemo(() => walk(plan.root), [plan]);
    const flagged = useMemo(() => (showInsights ? insightsByNode(plan) : new Map()), [plan, showInsights]);
    const shares = useMemo(() => planShares(plan, query), [plan, query]);
    const reason = (n) => (focus === n.id ? findingNoShareReason(plan, n, query) : noShareReason(plan, n, query));
    const focused = nodes.find((n) => n.id === focus);
    const note = shares.basis === "cost" && focused ? reason(focused) ?? shares.note : shares.note;
    const shareOf = (n) => shares.stated.get(n.id) ?? null;
    const hottest = shares.hottest;
    const target = focus ?? hottest?.id ?? plan.root.id;
    const hotPath = useMemo(() => new Set(pathTo(plan.root, target) ?? []), [plan.root, target]);
    const [expanded, setExpanded] = useState(() => {
        const open = new Set(hotPath);
        nodes.forEach((n) => {
            if ((shares.subtree.get(n.id) ?? 0) >= 0.05)
                open.add(n.id);
        });
        return open;
    });
    const [selected, setSelected] = useState(selectedId ?? target);
    const [searchText, setSearchText] = useState("");
    const [matchCursor, setMatchCursor] = useState(0);
    const trimmedSearch = searchText.trim().toLowerCase();
    const matchedIds = useMemo(() => {
        if (!trimmedSearch)
            return [];
        return nodes
            .filter((n) => `${n.op} ${n.object ?? ""} ${n.index ?? ""} ${n.predicate ?? ""} ${n.seek_predicate ?? ""}`.toLowerCase().includes(trimmedSearch))
            .map((n) => n.id);
    }, [nodes, trimmedSearch]);
    const matchedSet = useMemo(() => new Set(matchedIds), [matchedIds]);
    useEffect(() => {
        if (matchedIds.length === 0)
            return;
        setMatchCursor(0);
        setExpanded((prev) => {
            const next = new Set(prev);
            matchedIds.forEach((id) => (pathTo(plan.root, id) ?? []).forEach((anc) => next.add(anc)));
            return next;
        });
    }, [matchedIds, plan.root]);
    const selectedNode = nodes.find((n) => n.id === selected) ?? null;
    useEffect(() => {
        if (selectedId == null)
            return;
        setSelected(selectedId);
        const path = pathTo(plan.root, selectedId) ?? [];
        setExpanded((prev) => new Set([...prev, ...path]));
    }, [selectedId, plan.root]);
    const hasActuals = nodes.some((n) => n.act_rows != null);
    const weighed = canPlanEstimates(plan.engine) || hasActuals;
    const toggle = (id) => setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id))
            next.delete(id);
        else
            next.add(id);
        return next;
    });
    const stepMatch = (delta) => {
        if (matchedIds.length === 0)
            return;
        const nextIdx = (matchCursor + delta + matchedIds.length) % matchedIds.length;
        setMatchCursor(nextIdx);
        const id = matchedIds[nextIdx];
        if (id != null) {
            setSelected(id);
            onSelect?.(id);
        }
    };
    const rows = [];
    const visit = (node, depth) => {
        rows.push({ node, depth });
        if (expanded.has(node.id))
            node.children.forEach((c) => visit(c, depth + 1));
    };
    visit(plan.root, 0);
    return (_jsxs("div", { className: `culprit-pv plan ${className ?? ""}`, "data-theme": theme && theme !== "system" ? theme : undefined, children: [showHeader && (_jsxs("div", { className: "plan-head", children: [_jsx("span", { className: "tag", children: planKindLabel(plan) }), _jsxs("span", { children: [t("ui.common.plan_operators", { count: nodes.length }), weighed &&
                                ` · ${plan.facts.estimated_cost_unavailable
                                    ? t("ui.common.plan_cost_unavailable")
                                    : t("ui.common.plan_cost", { cost: (plan.total_cost || plan.root.subtree_cost).toFixed((plan.total_cost || plan.root.subtree_cost) < 10 ? 3 : 1) })}`] }), plan.warnings.length > 0 && (_jsxs("span", { className: "warn-chip", children: [_jsx(TriangleAlert, { size: 11 }), plan.warnings.map(warningLabel).join(", ")] })), _jsx("span", { className: "spacer" }), !compact && (_jsxs("div", { className: "search plan-search", children: [_jsx(Search, { size: 12 }), _jsx("input", { value: searchText, placeholder: t("ui.plan_diagram.search_placeholder"), onChange: (e) => setSearchText(e.target.value), onKeyDown: (e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        stepMatch(e.shiftKey ? -1 : 1);
                                    }
                                    else if (e.key === "Escape" && searchText) {
                                        e.preventDefault();
                                        setSearchText("");
                                    }
                                } }), trimmedSearch && (_jsxs(_Fragment, { children: [_jsx("span", { className: "plan-search-count num", children: matchedIds.length > 0
                                            ? t("ui.plan_diagram.search_matches", { current: String(matchCursor + 1), total: String(matchedIds.length) })
                                            : t("ui.plan_diagram.search_none") }), matchedIds.length > 1 && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "plan-search-btn", title: t("ui.plan_diagram.search_prev"), onClick: () => stepMatch(-1), children: _jsx(ChevronUp, { size: 12 }) }), _jsx("button", { type: "button", className: "plan-search-btn", title: t("ui.plan_diagram.search_next"), onClick: () => stepMatch(1), children: _jsx(ChevronDown, { size: 12 }) })] })), _jsx("button", { type: "button", className: "plan-search-btn", title: t("ui.plan_diagram.search_clear"), onClick: () => setSearchText(""), children: _jsx(X, { size: 12 }) })] }))] }))] })), showActualSummary && plan.kind === "actual" && _jsx(ActualSummary, { plan: plan, onPick: setSelected }), _jsxs("div", { className: "plan-cols", children: [_jsx("span", { children: t("ui.plan_view.operator") }), _jsx("span", { children: hasActuals ? t("ui.plan_view.rows_est_actual") : weighed ? t("ui.plan_view.est_rows") : "" }), _jsx("span", { children: shares.basis === "time" ? t("ui.plan_view.own_time") : weighed ? t("ui.plan_view.self_cost") : "" })] }), _jsx("div", { style: compact ? { maxHeight: 340, overflowY: "auto" } : undefined, children: rows.map(({ node, depth }) => {
                    const share = shareOf(node);
                    const mis = node.warnings.includes("misestimate") ? misestimate(plan, node) : null;
                    return (_jsxs("button", { type: "button", className: `pnode ${selected === node.id ? "sel" : ""} ${hotPath.has(node.id) ? "hot" : ""} ${matchedSet.has(node.id) ? "match" : ""}`, onClick: () => {
                            setSelected(node.id);
                            onSelect?.(node.id);
                        }, onDoubleClick: () => toggle(node.id), "aria-expanded": node.children.length > 0 ? expanded.has(node.id) : undefined, onKeyDown: (e) => {
                            const open = expanded.has(node.id);
                            if (node.children.length > 0 && ((e.key === "ArrowRight" && !open) || (e.key === "ArrowLeft" && open))) {
                                e.preventDefault();
                                toggle(node.id);
                            }
                        }, children: [_jsxs("span", { className: "label", children: [_jsx("span", { className: "indent", style: { width: Math.min(depth, 12) * 12 } }), _jsx("span", { className: "twisty", "aria-hidden": true, onClick: (e) => {
                                            e.stopPropagation();
                                            toggle(node.id);
                                        }, children: node.children.length > 0 ? expanded.has(node.id) ? _jsx(ChevronDown, { size: 14 }) : _jsx(ChevronRight, { size: 14 }) : null }), _jsxs("span", { className: "lines", children: [_jsxs("span", { className: "line1", children: [_jsx("span", { className: "op-icon", children: _jsx(OpIcon, { node: node, size: 13 }) }), node.id === hottest?.id && (share ?? 0) >= 0.05 && _jsx(Flame, { size: 13, color: "var(--heat-4)", className: "flame" }), _jsx("span", { className: "opname", children: node.op }), flagged.get(node.id)?.[0] && (_jsx("span", { className: `tree-flag ${flagged.get(node.id)[0].severity}`, title: flagged.get(node.id).map((i) => i.title).join("\n"), children: flagged.get(node.id).length })), node.object && (_jsxs("span", { className: "obj", children: [node.object, node.index ? ` · ${node.index}` : ""] }))] }), (node.warnings.length > 0 || node.predicate || node.seek_predicate) && (_jsxs("span", { className: "line2", children: [node.warnings.map((w) => (_jsx("span", { className: "warn-chip", children: warningLabel(w) }, w))), (node.seek_predicate || node.predicate) && (_jsx("span", { className: "pred", children: node.seek_predicate ? predicateLabel("seek", node.seek_predicate) : predicateLabel("filter", node.predicate ?? "") }))] }))] })] }), _jsx("span", { className: "rows", children: node.act_rows != null ? (_jsxs(_Fragment, { children: [rowsText(estRowsForRuns(plan, node)), " ", _jsx("span", { className: "arrow", children: "\u2192" }), " ", rowsText(node.act_rows), mis != null && (_jsx("span", { className: "mis", children: mis < 0 ? t("ui.plan_view.over", { times: count(Math.abs(mis)) }) : t("ui.plan_view.under", { times: count(Math.abs(mis)) }) }))] })) : (weighed && rowsText(estRows(plan, node))) }), _jsx("span", { className: "cost", children: weighed &&
                                    (share != null ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "num", children: percent(share) }), _jsx("span", { className: "heat", children: _jsx("span", { style: { width: `${Math.max(2, Math.min(100, share * 100))}%`, background: heatVar(share) } }) })] })) : (_jsx("span", { className: "num muted", title: reason(node) ?? undefined, children: "-" }))) })] }, node.id));
                }) }), weighed && note && _jsx("div", { className: "muted", style: { fontSize: 12, padding: "6px 10px" }, children: note }), selectedNode && showProps && (_jsx(NodeDetails, { plan: plan, estimates: weighed, actual: plan.kind === "actual", node: selectedNode, share: shareOf(selectedNode), subtreeShare: shares.statedSubtree.get(selectedNode.id) ?? null, noShare: shares.basis === "cost" ? reason(selectedNode) : null, insights: flagged.get(selectedNode.id) }))] }));
}
/** Alias of PlanView for ergonomic granular imports alongside PlanCanvas. */
export const PlanTree = PlanView;
/** The operator detail panel; kept under this name for existing callers. */
export function NodeProps({ node, share, insights }) {
    return _jsx(NodeDetails, { node: node, share: share, insights: insights });
}
