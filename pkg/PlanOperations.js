import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { allNodes, canPlanEstimates, duration, estRowsForRuns, findingNoShareReason, insightsByNode, misestimate, noShareReason, operatorRuns, percent, planShares, rows, shortPredicate, t, } from "./host.js";
import { OpIcon } from "./OpIcon.js";
const COLUMNS = [
    { key: "cost", label: () => t("ui.plan_operations.column.self"), title: () => t("ui.plan_operations.column.self_title") },
    { key: "subtree", label: () => t("ui.plan_operations.column.subtree"), title: () => t("ui.plan_operations.column.subtree_title") },
    { key: "est", label: () => t("ui.plan_operations.column.est"), title: () => t("ui.plan_operations.column.est_title") },
    { key: "act", label: () => t("ui.plan_operations.column.act"), title: () => t("ui.plan_operations.column.act_title"), actual: true },
    { key: "error", label: () => t("ui.plan_operations.column.error"), title: () => t("ui.plan_operations.column.error_title"), actual: true },
    { key: "runs", label: () => t("common.metric.runs"), title: () => t("ui.plan_operations.column.runs_title") },
    { key: "read", label: () => t("ui.plan_operations.column.read"), title: () => t("ui.plan_operations.column.read_title") },
    { key: "time", label: () => t("ui.plan_operations.column.time"), title: () => t("ui.plan_operations.column.time_title"), actual: true },
    { key: "issues", label: () => t("ui.plan_operations.column.issues"), title: () => t("ui.plan_operations.column.issues_title") },
];
export function PlanOperations({ plan, query: statement, focus, selectedId, onSelect, }) {
    const [sort, setSort] = useState({ key: "cost", desc: true });
    const [query, setQuery] = useState("");
    const [issuesOnly, setIssuesOnly] = useState(false);
    const body = useRef(null);
    const shares = useMemo(() => planShares(plan, statement), [plan, statement]);
    const actual = allNodes(plan.root).some((n) => n.act_rows != null);
    const timed = allNodes(plan.root).some((n) => n.act_time_ms != null);
    const flagged = useMemo(() => insightsByNode(plan), [plan]);
    const all = useMemo(() => {
        const out = [];
        const visit = (n, depth) => {
            const list = flagged.get(n.id) ?? [];
            const err = misestimate(plan, n);
            out.push({
                node: n,
                depth,
                self: shares.stated.get(n.id) ?? null,
                subtree: shares.statedSubtree.get(n.id) ?? null,
                error: err != null ? Math.abs(err) : 0,
                issues: list.length + n.warnings.length,
                worst: list[0]?.severity ?? (n.warnings.length ? "low" : null),
            });
            n.children.forEach((c) => visit(c, depth + 1));
        };
        visit(plan.root, 0);
        return out;
    }, [plan, shares, flagged]);
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const value = (r) => {
            switch (sort.key) {
                case "cost":
                    return r.self ?? -1;
                case "subtree":
                    return r.subtree ?? -1;
                case "est":
                    return estRowsForRuns(plan, r.node) ?? -1;
                case "act":
                    return r.node.act_rows ?? -1;
                case "error":
                    return r.error;
                case "runs":
                    return operatorRuns(plan, r.node) ?? -1;
                case "read":
                    return r.node.rows_read ?? -1;
                case "time":
                    return r.node.act_time_ms ?? -1;
                case "issues":
                    return r.issues * 10 + (r.worst === "high" ? 3 : r.worst === "medium" ? 2 : r.worst ? 1 : 0);
            }
        };
        return all
            .filter((r) => !issuesOnly || r.issues > 0)
            .filter((r) => !q || `${r.node.op} ${r.node.object ?? ""} ${r.node.index ?? ""} ${r.node.predicate ?? ""}`.toLowerCase().includes(q))
            .sort((a, b) => (sort.desc ? value(b) - value(a) : value(a) - value(b)));
    }, [all, plan, sort, query, issuesOnly]);
    useEffect(() => {
        body.current?.querySelector("tr.sel")?.scrollIntoView({ block: "nearest" });
    }, [selectedId]);
    const hasRead = all.some((r) => r.node.rows_read != null);
    const hasRuns = all.some((r) => (r.node.act_executions ?? r.node.est_executions) > 1);
    const hasIssues = all.some((r) => r.issues > 0);
    const weighed = canPlanEstimates(plan.engine) || actual;
    const columns = COLUMNS.filter((c) => (!c.actual || actual) &&
        (weighed || (c.key !== "cost" && c.key !== "subtree" && c.key !== "est")) &&
        (c.key !== "time" || timed) &&
        (c.key !== "read" || hasRead) &&
        (c.key !== "runs" || hasRuns) &&
        (c.key !== "issues" || hasIssues));
    const move = (delta) => {
        const index = visible.findIndex((r) => r.node.id === selectedId);
        const next = visible[Math.min(visible.length - 1, Math.max(0, index + delta))];
        if (next)
            onSelect(next.node.id);
    };
    return (_jsxs("div", { className: "culprit-pv ops", children: [_jsxs("div", { className: "ops-tools", children: [_jsxs("label", { className: "search ops-search", children: [_jsx(Search, { size: 12 }), _jsx("input", { value: query, placeholder: t("ui.plan_operations.filter"), onChange: (e) => setQuery(e.target.value) })] }), _jsxs("label", { className: "ops-toggle", children: [_jsx("input", { type: "checkbox", checked: issuesOnly, onChange: (e) => setIssuesOnly(e.target.checked) }), t("ui.plan_operations.issues_only")] }), _jsx("span", { className: "spacer" }), _jsx("span", { className: "muted", children: t("ui.plan_operations.shown", { shown: visible.length, count: all.length }) })] }), _jsxs("div", { className: "ops-scroll", 
                // biome-ignore lint/a11y/noNoninteractiveTabindex: arrow keys and j/k move the selected operation from here
                tabIndex: 0, onKeyDown: (e) => {
                    if (e.key === "ArrowDown" || e.key === "j") {
                        e.preventDefault();
                        move(1);
                    }
                    else if (e.key === "ArrowUp" || e.key === "k") {
                        e.preventDefault();
                        move(-1);
                    }
                }, children: [_jsxs("table", { className: "ops-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "ops-op", children: t("ui.plan_operations.operator") }), columns.map((c) => (_jsxs("th", { className: `r sortable col-${c.key}`, title: c.title(), "aria-sort": sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none", onClick: () => setSort((s) => (s.key === c.key ? { key: c.key, desc: !s.desc } : { key: c.key, desc: true })), children: [c.key === "read" && plan.kind !== "actual" ? t("ui.plan_operations.column.est_read") : c.label(), sort.key === c.key && (sort.desc ? _jsx(ArrowDown, { size: 11 }) : _jsx(ArrowUp, { size: 11 }))] }, c.key)))] }) }), _jsx("tbody", { ref: body, children: visible.map((r) => {
                                    const n = r.node;
                                    const err = misestimate(plan, n);
                                    const runs = operatorRuns(plan, n);
                                    return (_jsxs("tr", { className: `${n.id === selectedId ? "sel" : ""}`, onClick: () => onSelect(n.id), children: [_jsx("td", { className: "ops-op", children: _jsxs("span", { className: "ops-name", children: [_jsx("span", { className: "ops-icon", children: _jsx(OpIcon, { node: n, size: 13 }) }), _jsxs("span", { className: "ops-text", children: [_jsx("b", { children: n.op }), (n.object || n.index) && (_jsxs("span", { className: "mono muted", children: [" ", n.object?.split(".").pop(), n.index ? ` · ${n.index}` : ""] })), (n.seek_predicate || n.predicate) && _jsx("span", { className: "ops-pred mono", children: shortPredicate(n.seek_predicate ?? n.predicate ?? "") })] })] }) }), columns.map((c) => (_jsxs("td", { className: `r num col-${c.key}`, children: [c.key === "cost" &&
                                                        (r.self != null ? (_jsxs("span", { className: "ops-cost", children: [_jsx("span", { className: "ops-cost-bar", children: _jsx("span", { style: { width: `${Math.min(100, r.self * 100)}%` } }) }), percent(r.self)] })) : (_jsx("span", { className: "muted", title: shares.basis === "cost"
                                                                ? (focus === n.id ? findingNoShareReason(plan, n, statement) : noShareReason(plan, n, statement)) ?? undefined
                                                                : undefined, children: "\u2014" }))), c.key === "subtree" && (r.subtree != null ? percent(r.subtree) : _jsx("span", { className: "muted", children: "\u2014" })), c.key === "est" && rows(estRowsForRuns(plan, n)), c.key === "act" && (n.act_rows != null ? rows(n.act_rows) : "—"), c.key === "error" &&
                                                        (err != null && Math.abs(err) >= 2 ? (_jsx("span", { className: `ops-err ${n.warnings.includes("misestimate") ? "bad" : ""}`, children: err > 0 ? t("ui.plan_operations.more", { times: rows(Math.abs(err)) }) : t("ui.plan_operations.fewer", { times: rows(Math.abs(err)) }) })) : (_jsx("span", { className: "muted", children: "\u2014" }))), c.key === "runs" && (runs == null ? "—" : runs > 1 ? rows(runs) : _jsx("span", { className: "muted", children: rows(runs) })), c.key === "read" && (n.rows_read != null ? rows(n.rows_read) : _jsx("span", { className: "muted", children: "\u2014" })), c.key === "time" && (n.act_time_ms != null ? duration(n.act_time_ms) : _jsx("span", { className: "muted", children: "\u2014" })), c.key === "issues" && (r.issues > 0 ? _jsx("span", { className: `ops-issues ${r.worst ?? ""}`, children: r.issues }) : _jsx("span", { className: "muted", children: "\u2014" }))] }, c.key)))] }, n.id));
                                }) })] }), visible.length === 0 && _jsx("div", { className: "empty", style: { padding: 24 }, children: t("ui.plan_operations.none") })] })] }));
}
