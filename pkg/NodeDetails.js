import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronRight, Search, TriangleAlert } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { DocdbWork } from "./DocdbWork.js";
import { cost, count, duration, estRowsForRuns, exact, misestimate, operatorRuns, operatorView, percent, propValue, shortPredicate, t } from "./host.js";
import { OpIcon } from "./OpIcon.js";
function warningLabel(warning) {
    switch (warning) {
        case "implicit-conversion":
            return t("ui.node_details.warning.implicit_conversion");
        case "spill":
            return t("ui.node_details.warning.spill");
        case "no-join-predicate":
            return t("ui.node_details.warning.no_join_predicate");
        case "missing-statistics":
            return t("ui.node_details.warning.missing_statistics");
        case "memory-grant":
            return t("ui.node_details.warning.memory_grant");
        case "misestimate":
            return t("ui.node_details.warning.misestimate");
        case "residual-predicate":
            return t("ui.node_details.warning.residual_predicate");
        default:
            return warning;
    }
}
const SHOWN = new Set([
    "PhysicalOp",
    "LogicalOp",
    "EstimateRows",
    "EstimatedRowsRead",
    "TableCardinality",
    "EstimatedTotalSubtreeCost",
    "EstimateCPU",
    "EstimateIO",
    "ActualRows",
    "ActualExecutions",
    "ActualRowsRead",
    "ActualLogicalReads",
    "ActualPhysicalReads",
    "ActualExecutionMode",
    "EstimateRebinds",
    "EstimateRewinds",
    "OutputList",
    "Rows Removed by Filter",
    "Parent Relationship",
    "Shared Hit Blocks",
    "Shared Read Blocks",
    "Shared Dirtied Blocks",
    "Shared Written Blocks",
    "Local Hit Blocks",
    "Local Read Blocks",
    "Temp Read Blocks",
    "Temp Written Blocks",
    "I/O Read Time",
    "I/O Write Time",
    "WAL Bytes",
    "WAL Records",
    "Workers Planned",
    "Workers Launched",
    "Sort Space Used",
]);
const MAX_PAGE_SERVER_METRICS = 4;
const MAX_PAGE_SERVER_LIMITATIONS = 2;
function formatKb(kb) {
    if (kb >= 1024 * 1024)
        return `${(kb / 1024 / 1024).toFixed(1)}\u00a0GB`;
    if (kb >= 1024)
        return `${(kb / 1024).toFixed(kb >= 10 * 1024 ? 0 : 1)}\u00a0MB`;
    return `${Math.round(kb)}\u00a0KB`;
}
function formatBytes(bytes) {
    if (bytes >= 1024 * 1024 * 1024)
        return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}\u00a0GB`;
    if (bytes >= 1024 * 1024)
        return `${(bytes / 1024 / 1024).toFixed(1)}\u00a0MB`;
    if (bytes >= 1024)
        return `${(bytes / 1024).toFixed(1)}\u00a0KB`;
    return `${Math.round(bytes)}\u00a0B`;
}
function uses8KbPages(engine) {
    return engine === "postgres" || engine === "mssql" || engine === "yugabyte";
}
function formatPages(pages, engine) {
    const base = exact(pages);
    if (!uses8KbPages(engine) || pages <= 0)
        return base;
    return `${base} (${formatKb(pages * 8)})`;
}
function optNumber(raw) {
    if (raw == null || raw.trim() === "")
        return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
}
function PageServerIoDetails({ view }) {
    return (_jsxs("details", { className: "nd-all nd-page-server", children: [_jsxs("summary", { children: [_jsx(ChevronRight, { size: 13, className: "chev", "aria-hidden": "true" }), " ", t("view.plan_page_server_io.title")] }), _jsxs("div", { className: "nd-card nd-page-server-body", children: [_jsx("dl", { children: view.metrics.slice(0, MAX_PAGE_SERVER_METRICS).map((metric) => (_jsxs(Fragment, { children: [_jsx("dt", { children: metric.label }), _jsx("dd", { children: metric.text ?? t("view.plan_page_server_io.unknown") })] }, metric.key || metric.label))) }), view.limitations.slice(0, MAX_PAGE_SERVER_LIMITATIONS).map((limitation) => (_jsx("p", { className: "nd-page-server-limit muted", children: limitation }, limitation)))] })] }));
}
function ratio(plan, n) {
    const factor = misestimate(plan, n);
    if (factor == null || Math.abs(factor) < 2)
        return null;
    return (_jsx("span", { className: `nd-ratio ${n.warnings.includes("misestimate") ? "bad" : ""}`, children: factor > 0
            ? t("ui.node_details.more_than_expected", { factor: exact(Math.round(Math.abs(factor))) })
            : t("ui.node_details.fewer_than_expected", { factor: exact(Math.round(Math.abs(factor))) }) }));
}
/** One operator, explained: what it does, its rows, cost, buffers/I/O, parallelism, warnings, then raw properties on demand. */
export function NodeDetails({ plan, node, share, subtreeShare, noShare, insights = [], estimates = true, actual = false, theme, className, }) {
    const [filter, setFilter] = useState("");
    const props = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return Object.entries(node.props)
            .filter(([k, v]) => v != null && v !== "" && !SHOWN.has(k))
            .filter(([k, v]) => !q || k.toLowerCase().includes(q) || v.toLowerCase().includes(q))
            .sort(([a], [b]) => a.localeCompare(b));
    }, [node, filter]);
    const cpu = Number(node.props.EstimateCPU ?? NaN);
    const io = Number(node.props.EstimateIO ?? NaN);
    const split = Number.isFinite(cpu) && Number.isFinite(io) && cpu + io > 0 ? cpu / (cpu + io) : null;
    const removed = node.props["Rows Removed by Filter"];
    const executions = operatorRuns(plan, node) ?? 0;
    const pageServerIo = operatorView(plan, node)?.page_server_io;
    const rt = node.runtime;
    const logicalReads = rt?.logical_reads ?? null;
    const physicalReads = rt?.physical_reads ?? null;
    const cachedReads = logicalReads != null && physicalReads != null ? Math.max(0, logicalReads - physicalReads) : null;
    const hitShare = logicalReads != null && logicalReads > 0 && cachedReads != null ? cachedReads / logicalReads : null;
    const spillPages = rt?.spill_pages != null && rt.spill_pages > 0 ? rt.spill_pages : null;
    const cpuMs = rt?.cpu_ms ?? null;
    const heapFetches = node.facts.heap_fetches != null && node.facts.heap_fetches > 0 ? node.facts.heap_fetches : null;
    const sortSpaceKb = node.facts.sort_space_kb != null && node.facts.sort_space_kb > 0 ? node.facts.sort_space_kb : null;
    const diskUsageKb = node.facts.disk_usage_kb != null && node.facts.disk_usage_kb > 0 ? node.facts.disk_usage_kb : null;
    const ioReadMs = optNumber(node.props["I/O Read Time"]);
    const ioWriteMs = optNumber(node.props["I/O Write Time"]);
    const walBytes = optNumber(node.props["WAL Bytes"]);
    const execMode = node.facts.actual_execution_mode ?? null;
    const hasIoCard = logicalReads != null ||
        physicalReads != null ||
        spillPages != null ||
        cpuMs != null ||
        heapFetches != null ||
        sortSpaceKb != null ||
        diskUsageKb != null ||
        ioReadMs != null ||
        ioWriteMs != null ||
        walBytes != null ||
        execMode != null;
    const workersPlanned = node.facts.workers_planned ?? null;
    const workersLaunched = node.facts.workers_launched ?? null;
    const threadRows = rt?.thread_rows ?? [];
    const maxWorkerRows = threadRows.length > 0 ? Math.max(1, ...threadRows) : 1;
    const hasParallelCard = workersPlanned != null || workersLaunched != null || threadRows.length > 1;
    return (_jsxs("div", { className: `culprit-pv nd ${className ?? ""}`, "data-theme": theme && theme !== "system" ? theme : undefined, children: [_jsxs("div", { className: "nd-head", children: [_jsx("span", { className: "nd-icon", children: _jsx(OpIcon, { node: node, size: 16 }) }), _jsxs("div", { className: "nd-title", children: [_jsxs("div", { className: "nd-op", children: [node.op, node.detail && _jsx("span", { className: "nd-detail", children: node.detail })] }), (node.object || node.index) && (_jsxs("div", { className: "nd-obj mono", children: [node.object, node.index && _jsxs("span", { className: "muted", children: [" \u00B7 ", node.index] })] }))] }), estimates &&
                        (share != null ? (_jsxs("span", { className: "nd-share", title: t("ui.node_details.share_hint"), children: [percent(share), _jsxs("span", { className: "muted", children: [" ", t("ui.node_details.of_the_work")] })] })) : (_jsx("span", { className: "nd-share muted", title: noShare ?? undefined, children: t("ui.node_details.no_share_of_work") })))] }), insights.length > 0 && (_jsx("ul", { className: "nd-insights", children: insights.map((i) => (_jsxs("li", { className: i.severity, children: [_jsx("i", {}), i.title] }, i.rule))) })), _jsx(DocdbWork, { metrics: node.facts.docdb, basis: "loop" }), _jsxs("div", { className: "nd-grid", children: [(node.seek_predicate || node.predicate) && (_jsxs("section", { className: "nd-card wide", children: [_jsx("h4", { children: t("ui.node_details.what_it_does") }), node.seek_predicate && (_jsxs("div", { className: "nd-cond", children: [_jsx("span", { className: "nd-k", children: node.kind === "seek" || node.kind === "lookup" ? t("ui.node_details.seeks_on") : t("ui.node_details.index_condition") }), _jsx("code", { children: shortPredicate(node.seek_predicate) })] })), node.predicate && (_jsxs("div", { className: "nd-cond", children: [_jsx("span", { className: "nd-k", children: t("ui.node_details.then_filters") }), _jsx("code", { children: shortPredicate(node.predicate) })] }))] })), estimates && (_jsxs("section", { className: "nd-card", children: [_jsx("h4", { children: t("ui.node_details.rows") }), _jsxs("dl", { children: [_jsx("dt", { children: t("ui.node_details.estimated") }), _jsx("dd", { title: node.act_executions != null ? t("ui.node_details.estimated_hint") : undefined, children: exact(estRowsForRuns(plan, node)) }), node.act_rows != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.actual") }), _jsxs("dd", { children: [exact(node.act_rows), " ", ratio(plan, node)] })] })), executions > 1 && (_jsxs(_Fragment, { children: [_jsx("dt", { children: node.act_executions != null ? t("ui.node_details.ran") : t("ui.node_details.expected_runs") }), _jsx("dd", { children: t("ui.node_details.times", { n: executions, count: exact(executions) }) })] })), node.rows_read != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: actual ? t("ui.node_details.read") : t("ui.node_details.expected_to_read") }), _jsx("dd", { children: exact(node.rows_read) })] })), removed && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.filtered_out") }), _jsx("dd", { children: propValue(removed) })] })), node.table_rows != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.in_table") }), _jsx("dd", { children: exact(node.table_rows) })] }))] })] })), estimates && (_jsxs("section", { className: "nd-card", children: [_jsx("h4", { children: t("ui.node_details.cost") }), _jsxs("dl", { children: [_jsx("dt", { children: t("ui.node_details.this_operator") }), _jsxs("dd", { children: [share != null ? percent(share) : t("ui.node_details.no_share"), " ", _jsxs("span", { className: "muted", children: ["\u00B7 ", plan?.facts.estimated_cost_unavailable ? t("ui.node_details.cost_unavailable") : t("ui.node_details.units", { cost: cost(node.self_cost) })] })] }), subtreeShare != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.with_inputs") }), _jsx("dd", { children: percent(subtreeShare) })] })), node.act_time_ms != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.actual_time") }), _jsx("dd", { children: duration(node.act_time_ms) })] }))] }), share == null && noShare && _jsx("p", { className: "muted", style: { margin: "6px 0 0", fontSize: 12 }, children: noShare }), split != null && (_jsxs("div", { className: "nd-split", title: t("ui.node_details.split_hint", { cpu: percent(split), io: percent(1 - split) }), children: [_jsxs("div", { className: "nd-split-bar", children: [_jsx("span", { className: "cpu", style: { width: `${split * 100}%` } }), _jsx("span", { className: "io", style: { width: `${(1 - split) * 100}%` } })] }), _jsxs("div", { className: "nd-split-legend", children: [_jsxs("span", { children: [_jsx("i", { className: "cpu" }), t("ui.node_details.cpu_share", { share: percent(split) })] }), _jsxs("span", { children: [_jsx("i", { className: "io" }), t("ui.node_details.io_share", { share: percent(1 - split) })] })] })] }))] })), hasIoCard && (_jsxs("section", { className: "nd-card", children: [_jsx("h4", { children: t("ui.node_details.io_buffers") }), _jsxs("dl", { children: [logicalReads != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.logical_reads") }), _jsx("dd", { children: formatPages(logicalReads, plan?.engine) })] })), cachedReads != null && cachedReads > 0 && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.from_cache") }), _jsx("dd", { children: formatPages(cachedReads, plan?.engine) })] })), physicalReads != null && physicalReads > 0 && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.from_disk") }), _jsx("dd", { children: formatPages(physicalReads, plan?.engine) })] })), spillPages != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.spill_pages") }), _jsx("dd", { children: _jsx("span", { className: "nd-ratio bad", children: formatPages(spillPages, plan?.engine) }) })] })), sortSpaceKb != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.sort_memory") }), _jsx("dd", { children: formatKb(sortSpaceKb) })] })), diskUsageKb != null && sortSpaceKb == null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.work_memory") }), _jsx("dd", { children: formatKb(diskUsageKb) })] })), heapFetches != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.heap_fetches") }), _jsx("dd", { children: exact(heapFetches) })] })), cpuMs != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.cpu_time") }), _jsx("dd", { children: duration(cpuMs) })] })), ioReadMs != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.io_read_time") }), _jsx("dd", { children: duration(ioReadMs) })] })), ioWriteMs != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.io_write_time") }), _jsx("dd", { children: duration(ioWriteMs) })] })), walBytes != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.wal_bytes") }), _jsx("dd", { children: formatBytes(walBytes) })] })), execMode != null && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.execution_mode") }), _jsx("dd", { children: execMode.kind === "batch"
                                                    ? t("ui.node_details.mode_batch")
                                                    : execMode.kind === "row"
                                                        ? t("ui.node_details.mode_row")
                                                        : execMode.value })] }))] }), hitShare != null && (_jsxs("div", { className: "nd-split", children: [_jsxs("div", { className: "nd-split-bar", children: [_jsx("span", { className: "hit", style: { width: `${hitShare * 100}%` } }), _jsx("span", { className: "disk", style: { width: `${(1 - hitShare) * 100}%` } })] }), _jsxs("div", { className: "nd-split-legend", children: [_jsxs("span", { children: [_jsx("i", { className: "hit" }), t("ui.node_details.cache_hit_share", { share: percent(hitShare) })] }), _jsxs("span", { children: [_jsx("i", { className: "disk" }), t("ui.node_details.disk_read_share", { share: percent(1 - hitShare) })] })] })] }))] })), hasParallelCard && (_jsxs("section", { className: "nd-card", children: [_jsx("h4", { children: t("ui.node_details.parallelism") }), _jsx("dl", { children: (workersLaunched != null || workersPlanned != null) && (_jsxs(_Fragment, { children: [_jsx("dt", { children: t("ui.node_details.workers_launched") }), _jsx("dd", { children: workersLaunched != null && workersPlanned != null
                                                ? t("ui.node_details.workers_of_planned", { launched: String(workersLaunched), planned: String(workersPlanned) })
                                                : String(workersLaunched ?? workersPlanned) })] })) }), threadRows.length > 1 && (_jsx("div", { className: "nd-workers", children: threadRows.slice(0, 8).map((wRows, idx) => (_jsxs("div", { className: "nd-worker-row", children: [_jsx("span", { className: "muted", children: t("ui.node_details.worker_rows", { worker: String(idx + 1) }) }), _jsx("span", { className: "nd-worker-bar", children: _jsx("span", { style: { width: `${Math.max(3, (wRows / maxWorkerRows) * 100)}%` } }) }), _jsx("span", { className: "num", children: count(wRows) })] }, idx))) }))] })), node.warnings.length > 0 && (_jsxs("section", { className: "nd-card nd-warn", children: [_jsxs("h4", { children: [_jsx(TriangleAlert, { size: 12 }), " ", t("ui.node_details.warnings")] }), _jsx("ul", { children: node.warnings.map((w) => (_jsx("li", { children: warningLabel(w) }, w))) })] }))] }), pageServerIo && _jsx(PageServerIoDetails, { view: pageServerIo }, node.id), Object.keys(node.props).length > 0 && (_jsxs("details", { className: "nd-all", children: [_jsxs("summary", { children: [_jsx(ChevronRight, { size: 13, className: "chev" }), " ", t("ui.node_details.all_properties"), " ", _jsx("span", { className: "muted", children: props.length })] }), _jsxs("label", { className: "search nd-search", children: [_jsx(Search, { size: 12 }), _jsx("input", { value: filter, placeholder: t("ui.node_details.find_property"), onChange: (e) => setFilter(e.target.value) })] }), _jsx("dl", { className: "nd-props", children: props.map(([k, v]) => (_jsxs("div", { className: "nd-prop", children: [_jsx("dt", { children: k }), _jsx("dd", { title: v.length > 80 ? v : undefined, children: propValue(v) })] }, k))) })] }))] }));
}
