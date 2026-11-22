import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Database, FileCode, GitBranch, ListTree, Network, TableProperties } from "lucide-react";
import { useMemo, useState } from "react";
import { DocdbWork } from "./DocdbWork.js";
import { allNodes, canPlanEstimates, cost, findingNoShareReason, genericPlanContextKey, insightsByNode, noShareReason, planKindLabel, planShares, remember, rememberedChoice, t, tabListKeys, } from "./host.js";
import { NodeDetails } from "./NodeDetails.js";
import { PlanAssessmentNotes } from "./PlanAssessmentNotes.js";
import { PlanDiagram } from "./PlanDiagram.js";
import { PlanInsights } from "./PlanInsights.js";
import { PlanObjects } from "./PlanObjects.js";
import { PlanOperations } from "./PlanOperations.js";
import { PlanRaw } from "./PlanRaw.js";
import { PlanTypeSchema } from "./PlanTypeSchema.js";
import { PlanView } from "./PlanView.js";
const LOOK_KEY = "culprit.plan.look";
const ALL_LOOKS = ["diagram", "tree", "operations", "objects", "raw"];
export function rememberedLook() {
    return rememberedChoice(LOOK_KEY, "diagram", ALL_LOOKS);
}
export function rememberLook(look) {
    remember(LOOK_KEY, look);
}
const LOOKS = [
    { look: "diagram", label: () => t("ui.plan_surface.diagram"), icon: Network, hint: () => t("ui.plan_surface.diagram_hint") },
    { look: "tree", label: () => t("ui.plan_surface.tree"), icon: ListTree, hint: () => t("ui.plan_surface.tree_hint") },
    { look: "operations", label: () => t("ui.plan_surface.operations"), icon: TableProperties, hint: () => t("ui.plan_surface.operations_hint") },
    { look: "objects", label: () => t("ui.plan_surface.objects"), icon: Database, hint: () => t("ui.plan_surface.objects_hint") },
    { look: "raw", label: () => t("ui.plan_surface.raw"), icon: FileCode, hint: () => t("ui.plan_surface.raw_hint") },
];
/** Diagram · Tree · Operations · Tables · Raw. */
export function LookToggle({ look, onChange, hasRaw = true, }) {
    const visibleLooks = hasRaw ? LOOKS : LOOKS.filter((item) => item.look !== "raw");
    return (_jsx("span", { className: "seg look-toggle", role: "tablist", "aria-label": t("ui.plan_surface.label"), onKeyDown: tabListKeys, children: visibleLooks.map((l) => {
            const Icon = l.icon;
            return (_jsxs("button", { type: "button", role: "tab", "aria-selected": look === l.look, tabIndex: look === l.look ? 0 : -1, className: look === l.look ? "on" : "", title: l.hint(), onClick: () => onChange(l.look), children: [_jsx(Icon, { size: 12 }), l.label()] }, l.look));
        }) }));
}
/**
 * A plan with everything Culprit knows about it: the insights first (what's wrong, how to fix it), then the plan in the
 * chosen view. Picking an insight selects its operator in whichever view is showing, and back.
 */
export function PlanSurface({ plan, query, focus, look, badge, }) {
    const [selected, setSelected] = useState(null);
    return (_jsxs("div", { className: "culprit-pv plan-surface", children: [plan.facts.constants_redacted && _jsx("p", { className: "notice", children: t("ui.plan_surface.redacted") }), !plan.insights?.note && plan.kind === "generic" && (_jsx(PlanAssessmentNotes, { note: [t("ui.plan_surface.generic"), t(genericPlanContextKey(plan.engine)), t("ui.plan_surface.generic_history")].filter(Boolean).join(" ") })), _jsx(PlanInsights, { plan: plan, selectedNode: selected, onSelectNode: setSelected }), _jsx(DocdbWork, { metrics: plan.facts.docdb, basis: "execution" }), _jsx(PlanTypeSchema, { plan: plan }), look === "diagram" && _jsx(PlanDiagram, { plan: plan, query: query, focus: focus, selectedId: selected, onSelect: setSelected, badge: badge }), look === "tree" && _jsx(PlanView, { plan: plan, query: query, focus: focus, selectedId: selected, onSelect: setSelected }), look === "operations" && _jsx(OperationsPanel, { plan: plan, query: query, focus: focus, selected: selected ?? focus ?? null, onSelect: setSelected }), look === "objects" && _jsx(ObjectsPanel, { plan: plan, query: query, focus: focus, selected: selected ?? focus ?? null, onSelect: setSelected }), look === "raw" && _jsx(PlanRaw, { plan: plan })] }));
}
function OperationsPanel({ plan, query, focus, selected, onSelect, }) {
    const shares = useMemo(() => planShares(plan, query), [plan, query]);
    const nodes = useMemo(() => allNodes(plan.root), [plan]);
    const flagged = useMemo(() => insightsByNode(plan), [plan]);
    const shareOf = (id) => shares.stated.get(id) ?? null;
    const start = shares.hottest ?? plan.root;
    const current = nodes.find((n) => n.id === (selected ?? start.id)) ?? null;
    return (_jsxs("div", { className: "plan", children: [_jsxs("div", { className: "plan-head", children: [_jsx("span", { className: "tag", children: planKindLabel(plan) }), _jsxs("span", { children: [t("ui.common.plan_operators", { count: nodes.length }), canPlanEstimates(plan.engine) &&
                                ` · ${plan.facts.estimated_cost_unavailable
                                    ? t("ui.common.plan_cost_unavailable")
                                    : t("ui.common.plan_cost", { cost: cost(plan.total_cost || plan.root.subtree_cost) })}`] }), _jsx("span", { className: "spacer" }), _jsx(GitBranch, { size: 12, className: "muted" }), _jsx("span", { className: "muted", children: t("ui.plan_surface.click_row") })] }), _jsx(PlanOperations, { plan: plan, query: query, focus: focus, selectedId: current?.id ?? null, onSelect: onSelect }), current && (_jsx(NodeDetails, { plan: plan, estimates: canPlanEstimates(plan.engine), actual: plan.kind === "actual", node: current, share: shareOf(current.id), subtreeShare: shares.statedSubtree.get(current.id) ?? null, noShare: shares.basis === "cost" ? (current.id === focus ? findingNoShareReason(plan, current, query) : noShareReason(plan, current, query)) : null, insights: flagged.get(current.id) }))] }));
}
function ObjectsPanel({ plan, query, focus, selected, onSelect, }) {
    const shares = useMemo(() => planShares(plan, query), [plan, query]);
    const nodes = useMemo(() => allNodes(plan.root), [plan]);
    const flagged = useMemo(() => insightsByNode(plan), [plan]);
    const shareOf = (id) => shares.stated.get(id) ?? null;
    const firstWithObject = nodes.find((n) => n.object != null) ?? shares.hottest ?? plan.root;
    const current = nodes.find((n) => n.id === (selected ?? firstWithObject.id)) ?? null;
    return (_jsxs("div", { className: "plan", children: [_jsxs("div", { className: "plan-head", children: [_jsx("span", { className: "tag", children: planKindLabel(plan) }), _jsx("span", { children: t("ui.plan_surface.objects_hint") }), _jsx("span", { className: "spacer" }), _jsx(GitBranch, { size: 12, className: "muted" }), _jsx("span", { className: "muted", children: t("ui.plan_surface.click_row") })] }), _jsx(PlanObjects, { plan: plan, query: query, selectedId: current?.id ?? null, onSelect: onSelect }), current && (_jsx(NodeDetails, { plan: plan, estimates: canPlanEstimates(plan.engine), actual: plan.kind === "actual", node: current, share: shareOf(current.id), subtreeShare: shares.statedSubtree.get(current.id) ?? null, noShare: shares.basis === "cost" ? (current.id === focus ? findingNoShareReason(plan, current, query) : noShareReason(plan, current, query)) : null, insights: flagged.get(current.id) }))] }));
}
