import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRightLeft, CircleCheck, EqualNot, FileDiff, Flag, Gauge, KeyRound, Link2, MemoryStick, Ruler, Split, Unlink2, Variable, } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { canPlanEstimates, count, duration, estRows, percent, planEngineName, stepShare, t, tabListKeys } from "./host.js";
import { PlanDiagram } from "./PlanDiagram.js";
import { PlanView } from "./PlanView.js";
const CHANGE_TONE = {
    access: "warn",
    operator: "warn",
    added: "good",
    removed: "bad",
    cost: "info",
    rows: "info",
    warning: "warn",
};
function changeLabel(kind) {
    switch (kind) {
        case "access":
            return t("ui.plan_compare.change.access");
        case "operator":
            return t("ui.plan_compare.change.operator");
        case "added":
            return t("ui.plan_compare.change.added");
        case "removed":
            return t("ui.plan_compare.change.removed");
        case "cost":
            return t("ui.plan_compare.change.cost");
        case "rows":
            return t("ui.plan_compare.change.rows");
        case "warning":
            return t("ui.plan_compare.change.warning");
    }
}
const SCENARIO_ICON = {
    statement: _jsx(FileDiff, { size: 15 }),
    "plan-kind": _jsx(Flag, { size: 15 }),
    estimator: _jsx(Gauge, { size: 15 }),
    parameters: _jsx(Variable, { size: 15 }),
    estimates: _jsx(Ruler, { size: 15 }),
    index: _jsx(KeyRound, { size: 15 }),
    conversion: _jsx(ArrowRightLeft, { size: 15 }),
    parallelism: _jsx(Split, { size: 15 }),
    memory: _jsx(MemoryStick, { size: 15 }),
};
function scenarioLabel(kind) {
    switch (kind) {
        case "statement":
            return t("ui.plan_compare.scenario.statement");
        case "plan-kind":
            return t("ui.plan_compare.scenario.plan_kind");
        case "estimator":
            return t("ui.plan_compare.scenario.estimator");
        case "parameters":
            return t("ui.plan_compare.scenario.parameters");
        case "estimates":
            return t("ui.plan_compare.scenario.estimates");
        case "index":
            return t("ui.plan_compare.scenario.index");
        case "conversion":
            return t("ui.plan_compare.scenario.conversion");
        case "parallelism":
            return t("ui.plan_compare.scenario.parallelism");
        case "memory":
            return t("ui.plan_compare.scenario.memory");
    }
}
function formatCost(value) {
    if (value < 10)
        return value.toFixed(3);
    if (value < 100)
        return value.toFixed(1);
    if (value >= 1e6)
        return `${(value / 1e6).toFixed(1)}M`;
    return value >= 1e4 ? `${Math.round(value / 1e3)}K` : value.toFixed(0);
}
function nodesOf(plan) {
    const out = [];
    const walk = (n) => {
        out.push(n);
        n.children.forEach(walk);
    };
    walk(plan.root);
    return out;
}
function verdict(diff) {
    const timed = diff.time_a_ms != null && diff.time_b_ms != null && diff.time_a_ms > 0 && diff.time_b_ms > 0;
    const r = timed ? diff.time_b_ms / diff.time_a_ms : diff.cost_ratio;
    if (r == null)
        return { tone: "same", text: diff.comparable ? t("ui.plan_compare.verdict.no_costs") : t("ui.plan_compare.verdict.different_engines") };
    const x = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, "")}K×` : v >= 10 ? `${Math.round(v)}×` : `${v.toFixed(1)}×`);
    if (r >= 1.25)
        return { tone: "worse", text: timed ? t("ui.plan_compare.verdict.slower", { ratio: x(r) }) : t("ui.plan_compare.verdict.costlier", { ratio: x(r) }) };
    if (r <= 0.8)
        return { tone: "better", text: timed ? t("ui.plan_compare.verdict.faster", { ratio: x(1 / r) }) : t("ui.plan_compare.verdict.cheaper", { ratio: x(1 / r) }) };
    return { tone: "same", text: t("ui.plan_compare.verdict.same") };
}
/**
 * Side-by-side execution plan comparison viewer: verdict summary, structural & access-path changes,
 * root-cause scenarios, operator property diff table, and synchronized dual-plan pan/zoom.
 */
export function PlanDiffViewer({ a, b, diff, nameA, nameB, queryA, queryB, defaultLook = "diagram", defaultSync = true, toolbarStart, toolbarActions, theme, className, }) {
    const [pickA, setPickA] = useState(null);
    const [pickB, setPickB] = useState(null);
    const [active, setActive] = useState(null);
    const [tab, setTab] = useState("changes");
    const [look, setLook] = useState(defaultLook);
    const [sync, setSync] = useState(defaultSync);
    const [zoom, setZoom] = useState(0.8);
    const sideA = useRef(null);
    const sideB = useRef(null);
    const labelA = nameA ?? t("ui.plan_compare.plan_a");
    const labelB = nameB ?? t("ui.plan_compare.plan_b");
    const names = labelA === labelB ? [t("ui.plan_compare.plan_a"), t("ui.plan_compare.plan_b")] : [labelA, labelB];
    useEffect(() => {
        setActive(null);
        setPickA(null);
        setPickB(null);
    }, [a, b, diff]);
    const view = useMemo(() => {
        const marksA = new Map();
        const marksB = new Map();
        const tintsA = new Map();
        const tintsB = new Map();
        const aToB = new Map();
        const bToA = new Map();
        diff.matches.forEach((m) => {
            aToB.set(m.a, m.b);
            bToA.set(m.b, m.a);
        });
        diff.regions.forEach((r, i) => {
            r.a.forEach((id) => tintsA.set(id, i % 6));
            r.b.forEach((id) => tintsB.set(id, i % 6));
        });
        diff.changes.forEach((c) => {
            if (c.kind === "access" || c.kind === "operator") {
                if (c.a != null)
                    marksA.set(c.a, "changed");
                if (c.b != null)
                    marksB.set(c.b, "changed");
            }
        });
        diff.only_a.forEach((id) => marksA.set(id, "removed"));
        diff.only_b.forEach((id) => marksB.set(id, "added"));
        return { marksA, marksB, tintsA, tintsB, aToB, bToA };
    }, [diff]);
    useEffect(() => {
        const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const show = (side, id) => {
            if (id == null || !side)
                return;
            requestAnimationFrame(() => side.querySelector(`[data-node="${id}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" }));
        };
        show(sideA.current, pickA);
        show(sideB.current, pickB);
    }, [pickA, pickB]);
    useEffect(() => {
        if (!sync || look !== "diagram")
            return;
        const boxes = [sideA.current, sideB.current].map((s) => s?.querySelector(".diagram-scroll") ?? null);
        if (!boxes[0] || !boxes[1])
            return;
        let mirroring = false;
        const handlers = boxes.map((from, i) => () => {
            const to = boxes[1 - i];
            if (!from || !to || mirroring)
                return;
            mirroring = true;
            const fx = from.scrollWidth - from.clientWidth;
            const fy = from.scrollHeight - from.clientHeight;
            to.scrollLeft = fx > 0 ? (from.scrollLeft / fx) * (to.scrollWidth - to.clientWidth) : 0;
            to.scrollTop = fy > 0 ? (from.scrollTop / fy) * (to.scrollHeight - to.clientHeight) : 0;
            requestAnimationFrame(() => (mirroring = false));
        });
        boxes.forEach((box, i) => box?.addEventListener("scroll", handlers[i], { passive: true }));
        return () => boxes.forEach((box, i) => box?.removeEventListener("scroll", handlers[i]));
    }, [sync, look, diff, a, b]);
    const pickChange = (i) => {
        const c = diff.changes[i];
        if (!c)
            return;
        setActive(i);
        setPickA(c.a ?? (c.b != null ? view.bToA.get(c.b) ?? null : null));
        setPickB(c.b ?? (c.a != null ? view.aToB.get(c.a) ?? null : null));
    };
    const nodeA = pickA != null ? nodesOf(a).find((n) => n.id === pickA) ?? null : null;
    const nodeB = pickB != null ? nodesOf(b).find((n) => n.id === pickB) ?? null : null;
    const v = verdict(diff);
    return (_jsxs("div", { className: `culprit-pv pv-diff cmp ${className ?? ""}`, "data-theme": theme && theme !== "system" ? theme : undefined, children: [(toolbarStart || toolbarActions || names[0] || names[1]) && (_jsxs("div", { className: "compare-pickers", children: [toolbarStart ?? (_jsxs("div", { className: "pv-meta", children: [_jsx("span", { className: "side-badge", children: "A" }), " ", _jsx("b", { children: names[0] }), _jsx("span", { className: "muted", children: "vs" }), _jsx("span", { className: "side-badge", children: "B" }), " ", _jsx("b", { children: names[1] })] })), toolbarActions && (_jsxs(_Fragment, { children: [_jsx("span", { className: "spacer" }), toolbarActions] }))] })), _jsxs("section", { className: "cmp-verdict", "aria-live": "polite", children: [_jsxs("p", { className: "cmp-lead", children: [_jsx("span", { className: `cmp-pill ${v.tone}`, children: v.text }), diff.headlines[0]] }), diff.headlines.length > 1 && (_jsx("ul", { className: "cmp-more", children: diff.headlines.slice(1).map((h, i) => (_jsx("li", { children: h }, i))) })), _jsxs("div", { className: "cmp-figures", children: [_jsx(Figure, { label: t("ui.plan_compare.figure.cost", { plan: names[0] }), value: diff.cost_a == null ? t("ui.plan_compare.unavailable") : formatCost(diff.cost_a) }), _jsx(Figure, { label: t("ui.plan_compare.figure.cost", { plan: names[1] }), value: diff.cost_b == null ? t("ui.plan_compare.unavailable") : formatCost(diff.cost_b), tone: v.tone }), diff.time_a_ms != null && diff.time_b_ms != null && (_jsxs(_Fragment, { children: [_jsx(Figure, { label: t("ui.plan_compare.figure.time", { plan: names[0] }), value: duration(diff.time_a_ms) }), _jsx(Figure, { label: t("ui.plan_compare.figure.time", { plan: names[1] }), value: duration(diff.time_b_ms), tone: v.tone })] })), _jsx(Figure, { label: t("ui.plan_compare.figure.operators"), value: `${nodesOf(a).length} → ${nodesOf(b).length}` }), _jsx(Figure, { label: t("ui.plan_compare.figure.regions"), value: String(diff.regions.length) })] })] }), _jsxs("section", { className: "cmp-panel", children: [_jsxs("div", { className: "cmp-tabs", role: "tablist", "aria-label": t("ui.plan_compare.details"), onKeyDown: tabListKeys, children: [_jsx(TabButton, { id: "changes", tab: tab, onPick: setTab, label: t("ui.plan_compare.tab.changes"), count: diff.changes.length }), _jsx(TabButton, { id: "why", tab: tab, onPick: setTab, label: t("ui.plan_compare.tab.why"), count: diff.scenarios.length }), _jsx(TabButton, { id: "props", tab: tab, onPick: setTab, label: t("ui.plan_compare.tab.props") })] }), _jsxs("div", { className: "cmp-body", role: "tabpanel", children: [tab === "changes" &&
                                (diff.changes.length === 0 ? (_jsxs("div", { className: "cmp-empty", children: [_jsx(CircleCheck, { size: 18 }), _jsxs("div", { children: [_jsx("b", { children: diff.same_shape ? t("ui.plan_compare.same_steps") : t("ui.plan_compare.minor_steps") }), _jsx("div", { className: "muted", children: t("ui.plan_compare.same_steps_detail") })] })] })) : (_jsx("ul", { className: "cmp-changes", children: diff.changes.map((c, i) => (_jsx("li", { children: _jsxs("button", { type: "button", className: `cmp-change ${active === i ? "on" : ""}`, onClick: () => pickChange(i), children: [_jsx("span", { className: `cmp-tag ${CHANGE_TONE[c.kind]}`, children: changeLabel(c.kind) }), _jsxs("span", { className: "cmp-change-text", children: [_jsx("span", { className: "cmp-title", children: c.title }), c.detail && _jsx("span", { className: "cmp-detail", children: c.detail })] })] }) }, i))) }))), tab === "why" &&
                                (diff.scenarios.length === 0 ? (_jsxs("div", { className: "cmp-empty", children: [_jsx(CircleCheck, { size: 18 }), _jsxs("div", { children: [_jsx("b", { children: t("ui.plan_compare.same_conditions") }), _jsx("div", { className: "muted", children: t("ui.plan_compare.same_conditions_detail") })] })] })) : (_jsx("ul", { className: "cmp-scenarios", children: diff.scenarios.map((s, i) => (_jsxs("li", { className: "cmp-scenario", children: [_jsx("span", { className: "cmp-scenario-icon", "aria-hidden": true, children: SCENARIO_ICON[s.kind] }), _jsxs("div", { children: [_jsx("div", { className: "cmp-scenario-kind", children: scenarioLabel(s.kind) }), _jsx("div", { className: "cmp-title", children: s.title }), s.detail && _jsx("div", { className: "cmp-detail wrap", children: s.detail }), (s.a != null || s.b != null) && (_jsx("button", { type: "button", className: "link", onClick: () => {
                                                            setPickA(s.a ?? (s.b != null ? view.bToA.get(s.b) ?? null : null));
                                                            setPickB(s.b ?? (s.a != null ? view.aToB.get(s.a) ?? null : null));
                                                            setTab("props");
                                                        }, children: t("ui.plan_compare.show_step") }))] })] }, i))) }))), tab === "props" && _jsx(PropsCompare, { a: nodeA, b: nodeB, planA: a, planB: b, names: names })] })] }), _jsxs("div", { className: "cmp-canvas-bar", children: [_jsxs("div", { className: "cmp-canvas-controls", children: [_jsxs("span", { className: "seg", role: "group", "aria-label": t("ui.plan_compare.plan_view"), children: [_jsx("button", { type: "button", className: look === "diagram" ? "on" : "", onClick: () => setLook("diagram"), children: t("ui.plan_compare.diagram") }), _jsx("button", { type: "button", className: look === "tree" ? "on" : "", onClick: () => setLook("tree"), children: t("ui.plan_compare.tree") })] }), look === "diagram" && (_jsxs("button", { type: "button", className: `btn ghost cmp-sync ${sync ? "on" : ""}`, "aria-pressed": sync, title: sync ? t("ui.plan_compare.sync_on") : t("ui.plan_compare.sync_off"), onClick: () => setSync(!sync), children: [sync ? _jsx(Link2, { size: 13 }) : _jsx(Unlink2, { size: 13 }), " ", t("ui.plan_compare.sync")] }))] }), look === "diagram" && (_jsxs("div", { className: "cmp-legend", "aria-hidden": true, children: [_jsxs("span", { className: "cmp-key", children: [_jsx("i", { className: "tint" }), " ", t("ui.plan_compare.legend.same")] }), _jsxs("span", { className: "cmp-key", children: [_jsx("i", { className: "changed" }), " ", t("ui.plan_compare.legend.changed")] }), _jsxs("span", { className: "cmp-key", children: [_jsx("i", { className: "only" }), " ", t("ui.plan_compare.legend.only")] })] }))] }), _jsxs("div", { className: "compare-sides", children: [_jsx(Side, { label: "A", name: names[0], plan: a, innerRef: sideA, children: look === "diagram" ? (_jsx(PlanDiagram, { plan: a, query: queryA, marks: view.marksA, tints: view.tintsA, selectedId: pickA, initialZoom: 0.8, zoom: sync ? zoom : undefined, onZoomChange: setZoom, showProps: false, onSelect: (id) => {
                                setActive(null);
                                setPickA(id);
                                setPickB(view.aToB.get(id) ?? null);
                                setTab("props");
                            } })) : (_jsx(PlanView, { plan: a, query: queryA, selectedId: pickA, onSelect: (id) => {
                                setActive(null);
                                setPickA(id);
                                setPickB(view.aToB.get(id) ?? null);
                            } })) }), _jsx(Side, { label: "B", name: names[1], plan: b, innerRef: sideB, children: look === "diagram" ? (_jsx(PlanDiagram, { plan: b, query: queryB, marks: view.marksB, tints: view.tintsB, selectedId: pickB, initialZoom: 0.8, zoom: sync ? zoom : undefined, onZoomChange: setZoom, showProps: false, onSelect: (id) => {
                                setActive(null);
                                setPickB(id);
                                setPickA(view.bToA.get(id) ?? null);
                                setTab("props");
                            } })) : (_jsx(PlanView, { plan: b, query: queryB, selectedId: pickB, onSelect: (id) => {
                                setActive(null);
                                setPickB(id);
                                setPickA(view.bToA.get(id) ?? null);
                            } })) })] })] }));
}
function TabButton({ id, tab, onPick, label, count: n }) {
    return (_jsxs("button", { type: "button", role: "tab", "aria-selected": tab === id, tabIndex: tab === id ? 0 : -1, className: `cmp-tab ${tab === id ? "on" : ""}`, onClick: () => onPick(id), children: [label, n != null && _jsx("span", { className: "cmp-count", children: n })] }));
}
function Figure({ label, value, tone }) {
    return (_jsxs("div", { className: `cmp-figure ${tone === "worse" || tone === "better" ? tone : ""}`, children: [_jsx("div", { className: "value", children: value }), _jsx("div", { className: "label", title: label, children: label })] }));
}
function Side({ label, name, plan, innerRef, children }) {
    return (_jsxs("div", { className: "compare-side", ref: innerRef, children: [_jsxs("div", { className: "compare-side-head", children: [_jsx("span", { className: "side-badge", children: label }), _jsx("b", { children: name }), _jsx("span", { className: "muted", children: t("ui.plan_compare.side_meta", { engine: planEngineName(plan), kind: plan.kind }) })] }), children] }));
}
function norm(value) {
    return value.replace(/\[[^\]]+\]\.(?=\[[^\]]+\]\.\[[^\]]+\]\.\[[^\]]+\])/g, "").replace(/\s+/g, " ").trim();
}
function rowsFor(node, plan) {
    if (!node)
        return {};
    const est = estRows(plan, node);
    const weighed = canPlanEstimates(plan.engine) || plan.kind === "actual";
    return {
        operator: node.op,
        table: node.object,
        index: node.index,
        seek: node.seek_predicate ? norm(node.seek_predicate) : null,
        filter: node.predicate ? norm(node.predicate) : null,
        est_rows: weighed && est != null ? count(est) : null,
        est_executions: weighed && est != null ? count(node.est_executions) : null,
        act_rows: node.act_rows != null ? count(node.act_rows) : null,
        rows_read: node.rows_read != null ? count(node.rows_read) : null,
        table_rows: node.table_rows != null ? count(node.table_rows) : null,
        act_time: node.act_time_ms != null ? duration(node.act_time_ms) : null,
        cost_share: weighed ? percent(stepShare(plan, node)) : null,
        subtree_cost: weighed && !plan.facts.estimated_cost_unavailable ? formatCost(node.subtree_cost) : null,
        warnings: node.warnings.length ? node.warnings.map((w) => w.replace(/-/g, " ")).join(", ") : null,
    };
}
function propLabel(prop) {
    switch (prop) {
        case "operator":
            return t("ui.plan_compare.prop.operator");
        case "table":
            return t("ui.plan_compare.prop.table");
        case "index":
            return t("ui.plan_compare.prop.index");
        case "seek":
            return t("ui.plan_compare.prop.seek");
        case "filter":
            return t("ui.plan_compare.prop.filter");
        case "est_rows":
            return t("ui.plan_compare.prop.est_rows");
        case "est_executions":
            return t("ui.plan_compare.prop.est_executions");
        case "act_rows":
            return t("ui.plan_compare.prop.act_rows");
        case "rows_read":
            return t("ui.plan_compare.prop.rows_read");
        case "table_rows":
            return t("ui.plan_compare.prop.table_rows");
        case "act_time":
            return t("ui.plan_compare.prop.act_time");
        case "cost_share":
            return t("ui.plan_compare.prop.cost_share");
        case "subtree_cost":
            return t("ui.plan_compare.prop.subtree_cost");
        case "warnings":
            return t("ui.plan_compare.prop.warnings");
    }
}
const GROUPS = [
    { group: "does", props: ["operator", "table", "index", "seek", "filter"] },
    { group: "rows", props: ["est_rows", "est_executions", "act_rows", "rows_read", "table_rows"] },
    { group: "cost", props: ["cost_share", "subtree_cost", "act_time"] },
    { group: "warnings", props: ["warnings"] },
];
function groupTitle(group) {
    switch (group) {
        case "does":
            return t("ui.plan_compare.group.does");
        case "rows":
            return t("ui.plan_compare.group.rows");
        case "cost":
            return t("ui.plan_compare.group.cost");
        case "warnings":
            return t("ui.plan_compare.group.warnings");
    }
}
export function PropsCompare({ a, b, planA, planB, names, }) {
    const [showSame, setShowSame] = useState(false);
    if (!a && !b) {
        return (_jsxs("div", { className: "cmp-empty", children: [_jsx(EqualNot, { size: 18 }), _jsxs("div", { children: [_jsx("b", { children: t("ui.plan_compare.select_step") }), _jsx("div", { className: "muted", children: t("ui.plan_compare.select_step_detail") })] })] }));
    }
    const ra = rowsFor(a, planA);
    const rb = rowsFor(b, planB);
    const label = (n) => (n ? `${n.op}${n.object ? ` · ${n.object.split(".").pop()}` : ""}` : "—");
    const groups = GROUPS.map((g) => ({
        title: groupTitle(g.group),
        rows: g.props
            .map((k) => ({ label: propLabel(k), a: ra[k] ?? null, b: rb[k] ?? null }))
            .filter((r) => r.a != null || r.b != null),
    })).filter((g) => g.rows.length > 0);
    const keys = [...new Set([...Object.keys(a?.props ?? {}), ...Object.keys(b?.props ?? {})])].sort();
    const other = keys.map((k) => ({
        label: k,
        a: a?.props[k] != null ? norm(a.props[k]) : null,
        b: b?.props[k] != null ? norm(b.props[k]) : null,
    }));
    const differs = (r) => (r.a ?? "") !== (r.b ?? "");
    const changed = other.filter(differs);
    const same = other.filter((r) => !differs(r));
    const line = (r) => (_jsxs("div", { className: `cmp-prop ${differs(r) ? "diff" : ""}`, children: [_jsx("span", { className: "cmp-prop-label", title: r.label, children: r.label }), _jsx("span", { className: `cmp-prop-value ${r.a == null ? "none" : ""}`, children: r.a ?? "—" }), _jsx("span", { className: "cmp-prop-sign", role: "img", "aria-label": differs(r) ? t("ui.plan_compare.differs") : t("ui.plan_compare.same"), children: differs(r) ? "≠" : "" }), _jsx("span", { className: `cmp-prop-value ${r.b == null ? "none" : ""}`, children: r.b ?? "—" })] }, r.label));
    return (_jsxs("div", { className: "cmp-props", children: [_jsxs("div", { className: "cmp-prop head", children: [_jsx("span", {}), _jsxs("span", { children: [_jsx("span", { className: "side-badge", children: "A" }), " ", label(a), !a && _jsxs("span", { className: "muted", children: [" \u00B7 ", t("ui.plan_compare.only_in", { plan: names[1] })] })] }), _jsx("span", {}), _jsxs("span", { children: [_jsx("span", { className: "side-badge", children: "B" }), " ", label(b), !b && _jsxs("span", { className: "muted", children: [" \u00B7 ", t("ui.plan_compare.only_in", { plan: names[0] })] })] })] }), groups.map((g) => (_jsxs("div", { className: "cmp-prop-group", children: [_jsx("div", { className: "cmp-prop-title", children: g.title }), g.rows.map(line)] }, g.title))), other.length > 0 && (_jsxs("div", { className: "cmp-prop-group", children: [_jsxs("div", { className: "cmp-prop-title", children: [t("ui.plan_compare.engine_props"), " ", _jsxs("span", { className: "muted", children: ["\u00B7 ", t("ui.plan_compare.differ_count", { n: changed.length, count: String(changed.length) })] })] }), changed.map(line), same.length > 0 && (_jsx("button", { type: "button", className: "link cmp-prop-more", onClick: () => setShowSame((v) => !v), children: showSame
                            ? t("ui.plan_compare.hide_identical", { count: String(same.length) })
                            : t("ui.plan_compare.show_identical", { count: String(same.length) }) })), showSame && same.map(line)] }))] }));
}
