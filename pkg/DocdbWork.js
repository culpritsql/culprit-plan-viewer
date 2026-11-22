import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { count, duration, t } from "./host.js";
/** Native storage entries and RPCs retain their units; they are never PostgreSQL pages or CPU utilization. */
export function DocdbWork({ metrics, basis, runs }) {
    if (!metrics)
        return null;
    const divisor = basis === "workload" && runs != null && runs > 0 ? runs : 1;
    const said = basis === "workload" ? (runs != null && runs > 0 ? "per_run" : "retained") : basis === "loop" ? "per_loop" : "execution";
    const entries = [
        ["read_requests", t("ui.docdb_work.read_requests"), "count"],
        ["write_requests", t("ui.docdb_work.write_requests"), "count"],
        ["read_operations", t("ui.docdb_work.read_operations"), "count"],
        ["write_operations", t("ui.docdb_work.write_operations"), "count"],
        ["rows_scanned", t("ui.docdb_work.rows_scanned"), "count"],
        ["rows_returned", t("ui.docdb_work.rows_returned"), "count"],
        ["read_ms", t("ui.docdb_work.read_ms"), "time"],
        ["write_ms", t("ui.docdb_work.write_ms"), "time"],
        ["wait_ms", t("ui.docdb_work.wait_ms"), "time"],
        ["catalog_ms", t("ui.docdb_work.catalog_ms"), "time"],
        ["retries", t("ui.docdb_work.retries"), "count"],
        ["conflict_retries", t("ui.docdb_work.conflict_retries"), "count"],
        ["read_restarts", t("ui.docdb_work.read_restarts"), "count"],
        ["obsolete_rows_scanned", t("ui.docdb_work.obsolete_rows_scanned"), "count"],
        ["seeks", t("ui.docdb_work.seeks"), "count"],
        ["nexts", t("ui.docdb_work.nexts"), "count"],
        ["prevs", t("ui.docdb_work.prevs"), "count"],
    ];
    const rows = entries.flatMap(([key, title, unit]) => {
        const value = metrics[key];
        return value == null || !Number.isFinite(value) || value < 0
            ? []
            : [{ key, title, value: unit === "time" ? duration(value / divisor) : count(value / divisor) }];
    });
    if (rows.length === 0)
        return null;
    return (_jsxs("section", { className: "beyond", "aria-label": t("ui.docdb_work.title"), children: [_jsx("h3", { children: t("ui.docdb_work.title") }), _jsx("p", { className: "beyond-foot", children: t("ui.docdb_work.foot", { basis: said }) }), _jsx("div", { className: "beyond-rows", role: "list", children: rows.map((row) => (_jsxs("div", { className: "beyond-row", role: "listitem", children: [_jsx("i", { className: "sig-dot info", "aria-hidden": true }), _jsx("span", { className: "beyond-label", children: row.title }), _jsx("span", { className: "beyond-value", children: row.value })] }, row.key))) })] }));
}
