import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChartColumn, ChevronDown, CircleCheck, Copy, Cpu, Crosshair, KeyRound, ListChecks, MemoryStick, Server, SquareCode, } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { bySeverity, canPlanEstimates, copyAndTell, percent, statedInsightShare, t } from "./host.js";
import { PlanAssessmentNotes } from "./PlanAssessmentNotes.js";
import { Prose } from "./Prose.js";
import { Sql } from "./Sql.js";
const AREA = {
    index: { icon: KeyRound, label: () => t("ui.plan_insights.area.index") },
    query: { icon: SquareCode, label: () => t("ui.plan_insights.area.query") },
    statistics: { icon: ChartColumn, label: () => t("ui.plan_insights.area.statistics") },
    memory: { icon: MemoryStick, label: () => t("ui.plan_insights.area.memory") },
    parallelism: { icon: Cpu, label: () => t("ui.plan_insights.area.parallelism") },
    server: { icon: Server, label: () => t("ui.plan_insights.area.server") },
};
const SEVERITY_LABEL = {
    high: () => t("ui.plan_insights.severity.high"),
    medium: () => t("ui.plan_insights.severity.medium"),
    low: () => t("ui.plan_insights.severity.low"),
};
const SEVERITY_COUNT = {
    high: (n) => t("ui.plan_insights.count.high", { n, count: String(n) }),
    medium: (n) => t("ui.plan_insights.count.medium", { n, count: String(n) }),
    low: (n) => t("ui.plan_insights.count.low", { n, count: String(n) }),
};
const shareOf = (plan, i) => canPlanEstimates(plan.engine) || plan.kind === "actual" ? statedInsightShare(plan, i) : null;
const SHOWN = 4;
const insightMarkdown = (i, share) => {
    const severity = SEVERITY_LABEL[i.severity]();
    const area = AREA[i.area].label();
    return [
        share != null
            ? t("ui.plan_insights.md.heading_share", { severity, area, title: i.title, share: percent(share) })
            : t("ui.plan_insights.md.heading", { severity, area, title: i.title }),
        "",
        i.detail,
        "",
        t("ui.plan_insights.md.fix", { fix: i.fix }),
        ...(i.fix_sql ? ["", "```sql", i.fix_sql, "```"] : []),
        "",
        t("ui.plan_insights.md.verify", { verify: i.verify }),
    ].join("\n");
};
const insightsMarkdown = (plan, items) => [
    t("ui.plan_insights.md.title"),
    ...(plan.statement ? [t("ui.plan_insights.md.statement"), ["```sql", plan.statement.trim(), "```"].join("\n")] : []),
    ...items.map((i, n) => `### ${n + 1}. ${insightMarkdown(i, shareOf(plan, i))}`),
].join("\n\n");
export function PlanInsights({ plan, selectedNode, onSelectNode }) {
    const items = useMemo(() => [...(plan.insights?.items ?? [])].sort(bySeverity), [plan]);
    const note = plan.insights?.note ?? null;
    const [open, setOpen] = useState(null);
    const [all, setAll] = useState(false);
    const list = useRef(null);
    const counts = useMemo(() => {
        const c = { high: 0, medium: 0, low: 0 };
        items.forEach((i) => (c[i.severity] += 1));
        return c;
    }, [items]);
    const related = (i) => selectedNode != null && i.nodes.includes(selectedNode);
    useEffect(() => {
        if (selectedNode == null)
            return;
        const index = items.findIndex((i) => i.nodes.includes(selectedNode));
        if (index >= SHOWN)
            setAll(true);
    }, [selectedNode, items]);
    if (!plan.insights)
        return null;
    if (items.length === 0) {
        return (_jsxs("div", { className: "culprit-pv insights empty-insights", children: [_jsx(CircleCheck, { size: 16, className: "ok" }), _jsxs("div", { children: [_jsx("div", { className: "ins-empty-title", children: t("ui.plan_insights.none") }), _jsx(PlanAssessmentNotes, { note: note })] })] }));
    }
    const shown = all ? items : items.slice(0, SHOWN);
    const focusRow = (index) => list.current?.querySelectorAll(".ins-row")[index]?.focus();
    return (_jsxs("section", { className: "culprit-pv insights", "aria-label": t("ui.plan_insights.label"), children: [_jsxs("header", { className: "ins-head", children: [_jsx(ListChecks, { size: 14 }), _jsx("span", { className: "ins-label", children: t("ui.plan_insights.title") }), _jsx("span", { className: "ins-counts", children: ["high", "medium", "low"]
                            .filter((s) => counts[s] > 0)
                            .map((s) => (_jsxs("span", { className: `ins-count ${s}`, children: [_jsx("i", {}), SEVERITY_COUNT[s](counts[s])] }, s))) }), _jsx("span", { className: "spacer" }), _jsxs("button", { type: "button", className: "btn ghost small ins-copy-all", onClick: () => copyAndTell(insightsMarkdown(plan, items), t("ui.plan_insights.copied_all", { count: items.length })), title: t("ui.plan_insights.copy_all_title"), children: [_jsx(Copy, { size: 12 }), " ", t("ui.common.copy")] })] }), _jsx(PlanAssessmentNotes, { note: note }), _jsx("div", { className: "ins-list", ref: list, role: "list", "aria-label": t("ui.plan_insights.list_label"), children: shown.map((i, index) => {
                    const area = AREA[i.area];
                    const Icon = area.icon;
                    const expanded = open === index;
                    return (_jsxs("div", { role: "listitem", className: `ins ${i.severity} ${expanded ? "open" : ""} ${related(i) ? "related" : ""}`, children: [_jsxs("button", { type: "button", className: "ins-row", "aria-current": related(i) || undefined, "aria-expanded": expanded, onClick: () => {
                                    setOpen(expanded ? null : index);
                                    if (i.nodes[0] != null)
                                        onSelectNode(i.nodes[0]);
                                }, onKeyDown: (e) => {
                                    if (e.key === "ArrowDown") {
                                        e.preventDefault();
                                        focusRow(Math.min(shown.length - 1, index + 1));
                                    }
                                    else if (e.key === "ArrowUp") {
                                        e.preventDefault();
                                        focusRow(Math.max(0, index - 1));
                                    }
                                    else if (e.key === "Escape" && expanded) {
                                        e.preventDefault();
                                        setOpen(null);
                                    }
                                }, children: [_jsx("span", { className: "ins-sev", title: t("ui.plan_insights.severity_title", { severity: i.severity }) }), _jsx("span", { className: "ins-area", title: area.label(), children: _jsx(Icon, { size: 13 }) }), _jsx("span", { className: "ins-title", children: i.title }), shareOf(plan, i) != null && (_jsxs("span", { className: "ins-impact", title: t("ui.plan_insights.share_title"), children: [_jsx("span", { className: "ins-bar", children: _jsx("span", { style: { width: `${Math.max(4, Math.min(100, (shareOf(plan, i) ?? 0) * 100))}%` } }) }), percent(shareOf(plan, i))] })), _jsx(ChevronDown, { size: 14, className: "ins-chev" })] }), expanded && (_jsxs("div", { className: "ins-body", children: [_jsx("p", { className: "ins-detail", children: _jsx(Prose, { text: i.detail }) }), _jsxs("div", { className: "ins-block", children: [_jsx("div", { className: "ins-block-label", children: t("ui.plan_insights.fix") }), _jsx("p", { children: _jsx(Prose, { text: i.fix }) }), i.fix_sql && (_jsxs("div", { className: "ins-sql", children: [_jsx(Sql, { text: i.fix_sql }), _jsxs("button", { type: "button", className: "btn ghost small ins-copy", onClick: () => copyAndTell(i.fix_sql, t("ui.plan_insights.fix_copied")), title: t("ui.plan_insights.copy_fix_title"), children: [_jsx(Copy, { size: 12 }), " ", t("ui.common.copy")] })] }))] }), _jsxs("div", { className: "ins-block", children: [_jsx("div", { className: "ins-block-label", children: t("ui.plan_insights.verify") }), _jsx("p", { children: i.verify })] }), _jsxs("div", { className: "ins-actions", children: [i.nodes[0] != null && (_jsxs("button", { type: "button", className: "btn ghost small", onClick: () => onSelectNode(i.nodes[0]), children: [_jsx(Crosshair, { size: 12 }), " ", t("ui.plan_insights.show_operator")] })), _jsxs("button", { type: "button", className: "btn ghost small", onClick: () => copyAndTell(insightMarkdown(i, shareOf(plan, i)), t("ui.plan_insights.copied_one")), title: t("ui.plan_insights.copy_one_title"), children: [_jsx(Copy, { size: 12 }), " ", t("ui.plan_insights.copy_one")] })] })] }))] }, `${i.rule}-${i.nodes[0] ?? index}`));
                }) }), items.length > SHOWN && (_jsx("button", { type: "button", className: "ins-more", onClick: () => setAll((v) => !v), children: all ? t("ui.plan_insights.show_fewer") : t("ui.plan_insights.show_more", { count: String(items.length - SHOWN) }) }))] }));
}
