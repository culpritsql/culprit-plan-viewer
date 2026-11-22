import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock, Cpu, Database, Gauge, HardDrive, Scale, TriangleAlert, Users } from "lucide-react";
import { actualFacts, count, duration, estRowsForRuns, percent, rowCount, t, tx, when } from "./host.js";
function kb(value) {
    if (value >= 1024 * 1024)
        return `${(value / 1024 / 1024).toFixed(1)} GB`;
    if (value >= 1024)
        return `${(value / 1024).toFixed(value >= 10 * 1024 ? 0 : 1)} MB`;
    return `${Math.round(value)} KB`;
}
function where(node) {
    const table = node.object?.split(".").pop();
    return table ? t("ui.actual_summary.op_on", { op: node.op, table }) : node.op;
}
function Stat({ icon, value, label, title }) {
    return (_jsxs("span", { className: "as-stat", title: title, children: [icon, _jsx("b", { children: value }), _jsx("span", { children: label })] }));
}
/**
 * What a measured run cost, in words: how long it took, what it read, how much memory it was given and used, and the
 * operators that explain the time (slowest step, worst estimate, a worker doing most of the work, a spill).
 * Each callout selects its operator in the diagram.
 */
export function ActualSummary({ plan, onPick }) {
    const f = actualFacts(plan);
    if (!f)
        return null;
    const memory = f.grantedKb != null && f.grantedKb > 0 && f.usedKb != null ? { granted: f.grantedKb, used: f.usedKb } : null;
    const idle = memory ? 1 - memory.used / memory.granted : 0;
    const callouts = [];
    if (f.slowest && f.slowest.share >= 0.2) {
        callouts.push({
            key: "slowest",
            tone: "hot",
            icon: _jsx(Gauge, { size: 13 }),
            text: _jsx(_Fragment, { children: tx("ui.actual_summary.slowest", { time: duration(f.slowest.ms), share: percent(f.slowest.share) }, { operator: _jsx("b", { children: where(f.slowest.node) }) }) }),
            node: f.slowest.node.id,
            title: t("ui.actual_summary.slowest_hint"),
        });
    }
    if (f.worstEstimate) {
        const n = f.worstEstimate.node;
        const expected = estRowsForRuns(plan, n);
        callouts.push({
            key: "estimate",
            tone: "warn",
            icon: _jsx(Scale, { size: 13 }),
            text: (_jsx(_Fragment, { children: tx("ui.actual_summary.estimate", { expected: rowCount(expected), factor: count(Math.abs(f.worstEstimate.factor)) }, { actual: _jsx("b", { children: count(n.act_rows ?? 0) }), operator: _jsx("b", { children: where(n) }) }) })),
            node: f.worstEstimate.node.id,
            title: t("ui.actual_summary.estimate_hint"),
        });
    }
    if (f.skew) {
        callouts.push({
            key: "skew",
            tone: "warn",
            icon: _jsx(Users, { size: 13 }),
            text: _jsx(_Fragment, { children: tx("ui.actual_summary.skew", { threads: String(f.skew.threads), share: percent(f.skew.busiest) }, { operator: _jsx("b", { children: where(f.skew.node) }) }) }),
            node: f.skew.node.id,
            title: t("ui.actual_summary.skew_hint"),
        });
    }
    if (f.spilled) {
        callouts.push({
            key: "spill",
            tone: "warn",
            icon: _jsx(HardDrive, { size: 13 }),
            text: f.spillPages > 0 ? t("ui.actual_summary.spill_pages", { n: f.spillPages, pages: count(f.spillPages) }) : t("ui.actual_summary.spill"),
            title: t("ui.actual_summary.spill_hint"),
        });
    }
    return (_jsxs("div", { className: "actual-summary", children: [_jsxs("div", { className: "as-head", children: [_jsx("span", { className: "as-kicker", children: f.lastRunAt ? t("ui.common.last_run") : t("ui.actual_summary.measured_run") }), f.elapsedMs != null && (_jsxs("span", { className: "as-elapsed", title: t("ui.actual_summary.elapsed"), children: [_jsx(Clock, { size: 14 }), duration(f.elapsedMs)] })), _jsxs("span", { className: "as-stats", children: [f.cpuMs != null && (_jsx(Stat, { icon: _jsx(Cpu, { size: 12 }), value: duration(f.cpuMs), label: t("ui.actual_summary.cpu"), title: f.workers ? t("ui.actual_summary.across_workers", { workers: String(f.workers) }) : undefined })), f.logicalReads != null && (_jsx(Stat, { icon: _jsx(Database, { size: 12 }), value: count(f.logicalReads), label: f.physicalReads ? t("ui.actual_summary.reads_from_disk", { disk: count(f.physicalReads) }) : t("ui.actual_summary.reads"), title: t("ui.actual_summary.reads_hint") })), f.rows != null && _jsx(Stat, { icon: null, value: count(f.rows), label: t("ui.actual_summary.rows", { n: f.rows }) }), f.workers != null && f.workers > 1 && _jsx(Stat, { icon: _jsx(Users, { size: 12 }), value: String(f.workers), label: t("ui.actual_summary.workers", { n: f.workers }) })] }), f.lastRunAt && (_jsx("span", { className: "as-when", title: when(f.lastRunAt.endsWith("Z") ? f.lastRunAt : `${f.lastRunAt}Z`).full, children: when(f.lastRunAt.endsWith("Z") ? f.lastRunAt : `${f.lastRunAt}Z`).short }))] }), memory && (_jsxs("div", { className: "as-memory", title: t("ui.actual_summary.memory_hint"), children: [_jsx("span", { className: "as-label", children: t("ui.actual_summary.memory") }), _jsx("span", { className: "as-bar", "aria-hidden": true, children: _jsx("span", { style: { width: `${Math.min(100, (memory.used / memory.granted) * 100)}%` } }) }), _jsxs("span", { children: [tx("ui.actual_summary.memory_used", { granted: kb(memory.granted) }, { used: _jsx("b", { children: kb(memory.used) }) }), idle >= 0.75 && memory.granted >= 10 * 1024 && _jsxs("span", { className: "muted", children: [" \u00B7 ", t("ui.actual_summary.memory_idle", { share: percent(idle) })] })] })] })), f.grantedKb != null && f.grantedKb > 0 && f.usedKb == null && _jsx("p", { className: "as-note", children: t("ui.actual_summary.memory_unrecorded", { granted: kb(f.grantedKb) }) }), f.triggers.length > 0 && (_jsxs("section", { className: "actual-triggers", "aria-label": t("ui.actual_summary.triggers_label"), children: [_jsx("h4", { children: t("ui.actual_summary.triggers") }), _jsx("p", { className: "muted", children: t("ui.actual_summary.triggers_note") }), _jsx("ul", { children: f.triggers.map((trigger, i) => (_jsxs("li", { children: [_jsx("span", { children: trigger.relation ? tx("ui.actual_summary.trigger_on", { relation: trigger.relation }, { trigger: _jsx("b", { children: trigger.name }) }) : _jsx("b", { children: trigger.name }) }), _jsxs("span", { children: [duration(trigger.ms), " \u00B7", " ", trigger.calls == null ? t("ui.actual_summary.calls_unrecorded") : t("ui.actual_summary.calls", { n: trigger.calls, calls: count(trigger.calls) })] })] }, `${trigger.name}-${i}`))) })] })), !f.timed && (_jsxs("div", { className: "as-note", children: [_jsx(TriangleAlert, { size: 12 }), " ", f.lastRunAt ? t("ui.actual_summary.untimed_past") : t("ui.actual_summary.untimed_run")] })), callouts.length > 0 && (_jsx("div", { className: "as-callouts", children: callouts.map((c) => c.node != null && onPick ? (_jsxs("button", { type: "button", className: `as-callout ${c.tone}`, title: c.title, onClick: () => onPick(c.node), children: [c.icon, _jsx("span", { children: c.text })] }, c.key)) : (_jsxs("span", { className: `as-callout ${c.tone}`, title: c.title, children: [c.icon, _jsx("span", { children: c.text })] }, c.key))) }))] }));
}
