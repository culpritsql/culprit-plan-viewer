import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, Clock, Copy, Flame, Search, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { DeadlockViewer } from "./DeadlockViewer.js";
import { copyAndTell, count, digits, t, useLanguage } from "./host.js";
import { Sql } from "./Sql.js";
function problemReason(problem) {
    switch (problem.kind) {
        case "record-limit":
            return t("ui.extended_events.problem.record_limit");
        case "input-limit":
            return t("ui.extended_events.problem.input_limit");
        case "record-bytes":
            return t("ui.extended_events.problem.record_bytes");
        case "field-bytes":
            return t("ui.extended_events.problem.field_bytes");
        case "malformed-record":
            return t("ui.extended_events.problem.malformed");
        default:
            return t("ui.extended_events.problem.other");
    }
}
function formatHexOffset(location) {
    if (!location)
        return null;
    const evHex = `0x${location.event_offset.toString(16)}`;
    if (location.buffer_offset !== null) {
        return `0x${location.buffer_offset.toString(16)} / ${evHex}`;
    }
    return evHex;
}
function eventTimeLabel(row) {
    if (row.timestamp_utc) {
        return {
            text: t("ui.extended_events.time.utc", { time: row.timestamp_utc }),
            title: row.timestamp_utc,
        };
    }
    if (row.timestamp) {
        return {
            text: t("ui.extended_events.time.local", { time: row.timestamp }),
            title: row.timestamp,
        };
    }
    const unknown = t("ui.extended_events.time.unknown");
    return { text: unknown, title: unknown };
}
function matchesQuery(row, needle) {
    if (!needle)
        return true;
    const parts = [
        row.database,
        row.database_id,
        row.session_id,
        row.request_id,
        row.event_sequence,
        row.client?.application,
        row.client?.user,
        row.client?.host,
        row.timestamp_utc,
        row.timestamp,
        row.statement.state === "available" ? row.statement.text : null,
    ];
    if (row.kind.event === "error-reported") {
        parts.push(String(row.kind.number), `sev ${row.kind.severity}`);
    }
    return parts.some((p) => p?.toLowerCase().includes(needle));
}
/**
 * Interactive SQL Server Extended Events (`.xel` and XML) inspector:
 * filters `xml_deadlock_report`, `error_reported`, and `attention` records, preserves UTC vs offset-free timestamps,
 * surfaces partial/truncated block limits honestly, and embeds `DeadlockViewer` for captured deadlock graphs.
 */
export function ExtendedEventsViewer({ batch, title, defaultFilter = "all", theme, className, }) {
    useLanguage();
    const [filter, setFilter] = useState(defaultFilter);
    const [query, setQuery] = useState("");
    const locationsByPos = useMemo(() => {
        const map = new Map();
        for (const loc of batch.locations)
            map.set(loc.position, loc);
        return map;
    }, [batch.locations]);
    const deadlocksByPos = useMemo(() => {
        const map = new Map();
        for (const item of batch.deadlocks) {
            const list = map.get(item.position);
            if (list)
                list.push(item);
            else
                map.set(item.position, [item]);
        }
        return map;
    }, [batch.deadlocks]);
    const counts = useMemo(() => {
        let deadlocks = 0;
        let errors = 0;
        let attentions = 0;
        for (const row of batch.records) {
            if (row.kind.event === "deadlock-report")
                deadlocks++;
            else if (row.kind.event === "error-reported")
                errors++;
            else
                attentions++;
        }
        return { all: batch.records.length, deadlocks, errors, attentions };
    }, [batch.records]);
    const issueBreakdown = useMemo(() => {
        let skippedUnsupported = 0;
        let decodeIssues = 0;
        let firstProblem = null;
        for (const issue of batch.issues) {
            if (issue.problem.kind === "unsupported-event") {
                skippedUnsupported++;
            }
            else {
                decodeIssues++;
                if (!firstProblem)
                    firstProblem = issue.problem;
            }
        }
        return { skippedUnsupported, decodeIssues, firstProblem };
    }, [batch.issues]);
    const normalizedQuery = query.trim().toLowerCase();
    const filteredRecords = useMemo(() => batch.records.filter((row) => (filter === "all" || row.kind.event === filter) && matchesQuery(row, normalizedQuery)), [batch.records, filter, normalizedQuery]);
    return (_jsxs("section", { className: `culprit-pv xe-viewer ${className ?? ""}`, "data-theme": theme && theme !== "system" ? theme : undefined, children: [_jsxs("header", { className: "xe-head", children: [_jsxs("div", { className: "xe-head-top", children: [_jsxs("div", { className: "xe-title-group", children: [_jsx("span", { className: "xe-format-badge", children: batch.format === "xel" ? t("ui.extended_events.badge.xel") : t("ui.extended_events.badge.xml") }), _jsx("h2", { className: "xe-title", children: title || t("ui.extended_events.title.default") })] }), _jsxs("div", { className: "xe-stats", children: [_jsx("span", { children: t("ui.extended_events.summary.events", {
                                            n: batch.records.length,
                                            count: count(batch.records.length),
                                        }) }), _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { children: t("ui.extended_events.summary.examined", {
                                            n: batch.records_examined,
                                            count: count(batch.records_examined),
                                        }) }), _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { children: t("ui.extended_events.summary.deadlocks", {
                                            n: batch.deadlocks.length,
                                            count: count(batch.deadlocks.length),
                                        }) })] })] }), _jsx("p", { className: "xe-scope muted", children: t("ui.extended_events.scope_note") }), (batch.stopped !== null || issueBreakdown.decodeIssues > 0 || issueBreakdown.skippedUnsupported > 0) && (_jsxs("div", { className: "xe-banners", role: "status", children: [batch.stopped !== null && (_jsxs("div", { className: "xe-banner warn", children: [_jsx(AlertTriangle, { size: 14 }), _jsx("span", { children: t("ui.extended_events.banner.stopped", { reason: problemReason(batch.stopped) }) })] })), issueBreakdown.decodeIssues > 0 && issueBreakdown.firstProblem && (_jsxs("div", { className: "xe-banner warn", children: [_jsx(AlertTriangle, { size: 14 }), _jsx("span", { children: t("ui.extended_events.banner.issues", {
                                            n: issueBreakdown.decodeIssues,
                                            count: count(issueBreakdown.decodeIssues),
                                            reason: problemReason(issueBreakdown.firstProblem),
                                        }) })] })), issueBreakdown.skippedUnsupported > 0 && (_jsx("div", { className: "xe-banner info", children: _jsx("span", { children: t("ui.extended_events.banner.skipped_other", {
                                        n: issueBreakdown.skippedUnsupported,
                                        count: count(issueBreakdown.skippedUnsupported),
                                    }) }) }))] })), _jsxs("div", { className: "xe-toolbar", children: [_jsxs("div", { className: "seg xe-filters", role: "tablist", children: [_jsxs("button", { type: "button", role: "tab", "aria-selected": filter === "all", className: filter === "all" ? "on" : "", onClick: () => setFilter("all"), children: [t("ui.extended_events.filter.all"), " ", _jsx("span", { className: "xe-pill-count", children: count(counts.all) })] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": filter === "deadlock-report", className: filter === "deadlock-report" ? "on" : "", onClick: () => setFilter("deadlock-report"), children: [t("ui.extended_events.filter.deadlocks"), " ", _jsx("span", { className: "xe-pill-count", children: count(counts.deadlocks) })] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": filter === "error-reported", className: filter === "error-reported" ? "on" : "", onClick: () => setFilter("error-reported"), children: [t("ui.extended_events.filter.errors"), " ", _jsx("span", { className: "xe-pill-count", children: count(counts.errors) })] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": filter === "attention", className: filter === "attention" ? "on" : "", onClick: () => setFilter("attention"), children: [t("ui.extended_events.filter.attentions"), " ", _jsx("span", { className: "xe-pill-count", children: count(counts.attentions) })] })] }), _jsxs("label", { className: "plan-search xe-search", children: [_jsx(Search, { size: 13 }), _jsx("input", { type: "search", value: query, onChange: (e) => setQuery(e.target.value), placeholder: t("ui.extended_events.search.placeholder"), "aria-label": t("ui.extended_events.search.label") })] })] })] }), filteredRecords.length === 0 ? (_jsx("div", { className: "xe-empty muted", children: batch.records.length === 0
                    ? t("ui.extended_events.empty.artifact")
                    : t("ui.extended_events.empty.filtered") })) : (_jsx("div", { className: "xe-list", children: filteredRecords.map((row) => (_jsx(ExtendedEventCard, { row: row, location: locationsByPos.get(row.position), deadlocks: deadlocksByPos.get(row.position) ?? [], theme: theme }, row.position))) }))] }));
}
function ExtendedEventCard({ row, location, deadlocks, theme, }) {
    const time = eventTimeLabel(row);
    const offset = formatHexOffset(location);
    let badgeClass = "attention";
    let badgeText = t("ui.extended_events.kind.attention");
    let cardTitle = t("ui.extended_events.card.attention_title");
    let icon = _jsx(Clock, { size: 13 });
    if (row.kind.event === "deadlock-report") {
        badgeClass = "deadlock";
        badgeText = t("ui.extended_events.kind.deadlock");
        cardTitle = t("ui.extended_events.card.deadlock_title", {
            n: row.kind.graphs,
            count: count(row.kind.graphs),
        });
        icon = _jsx(Flame, { size: 13 });
    }
    else if (row.kind.event === "error-reported") {
        badgeClass = row.kind.severity >= 16 ? "error-high" : "error";
        badgeText = t("ui.extended_events.kind.error", {
            number: String(row.kind.number),
            severity: digits(String(row.kind.severity)),
        });
        cardTitle = t("ui.extended_events.card.error_title", {
            number: String(row.kind.number),
            severity: digits(String(row.kind.severity)),
            state: digits(String(row.kind.state)),
        });
        icon = _jsx(Zap, { size: 13 });
    }
    const fields = [];
    if (row.database ?? row.database_id) {
        fields.push({ label: t("ui.extended_events.field.database"), value: (row.database ?? row.database_id) });
    }
    if (row.session_id) {
        fields.push({ label: t("ui.extended_events.field.session"), value: row.session_id });
    }
    if (row.request_id) {
        fields.push({ label: t("ui.extended_events.field.request"), value: row.request_id });
    }
    if (row.event_sequence) {
        fields.push({ label: t("ui.extended_events.field.sequence"), value: row.event_sequence });
    }
    if (row.client?.application) {
        fields.push({ label: t("ui.extended_events.field.application"), value: row.client.application });
    }
    if (row.client?.user) {
        fields.push({ label: t("ui.extended_events.field.user"), value: row.client.user });
    }
    if (row.client?.host) {
        fields.push({ label: t("ui.extended_events.field.host"), value: row.client.host });
    }
    if (row.kind.event === "attention" && row.kind.native_duration) {
        fields.push({ label: t("ui.extended_events.field.duration"), value: digits(row.kind.native_duration) });
    }
    if (row.kind.event === "error-reported") {
        if (row.kind.intercepted !== null) {
            fields.push({
                label: t("ui.extended_events.field.intercepted"),
                value: row.kind.intercepted ? t("ui.extended_events.value.yes") : t("ui.extended_events.value.no"),
            });
        }
        if (row.kind.user_defined !== null) {
            fields.push({
                label: t("ui.extended_events.field.user_defined"),
                value: row.kind.user_defined ? t("ui.extended_events.value.yes") : t("ui.extended_events.value.no"),
            });
        }
    }
    if (offset) {
        fields.push({ label: t("ui.extended_events.field.offset"), value: offset });
    }
    return (_jsxs("article", { className: "xe-card", "data-event-kind": row.kind.event, "data-position": row.position, children: [_jsxs("div", { className: "xe-card-head", children: [_jsxs("span", { className: `xe-kind-pill ${badgeClass}`, children: [icon, _jsx("span", { children: badgeText })] }), _jsxs("span", { className: "xe-time muted", title: time.title, children: ["#", row.position, " \u00B7 ", time.text] })] }), _jsx("h3", { className: "xe-card-title", children: cardTitle }), row.kind.event === "attention" && (_jsx("p", { className: "xe-card-note muted", children: t("ui.extended_events.card.attention_note") })), fields.length > 0 && (_jsx("dl", { className: "xe-meta-grid", children: fields.map((f) => (_jsxs("div", { className: "xe-meta-item", children: [_jsx("dt", { children: f.label }), _jsx("dd", { children: f.value })] }, f.label))) })), row.statement.state === "available" && (_jsxs("div", { className: "xe-sql-block", children: [_jsxs("div", { className: "xe-sql-head", children: [_jsx("span", { className: "muted", children: t("ui.extended_events.statement.label") }), _jsxs("button", { type: "button", className: "btn ghost small", onClick: () => copyAndTell(row.statement.state === "available" ? row.statement.text : "", t("ui.common.copied")), children: [_jsx(Copy, { size: 12 }), " ", t("ui.common.copy")] })] }), _jsx(Sql, { text: row.statement.text, className: "xe-sql" })] })), deadlocks.map(({ graph }, idx) => (_jsxs("details", { className: "xe-deadlock-details", open: true, children: [_jsx("summary", { children: t("ui.extended_events.deadlock.toggle") }), _jsx("div", { className: "xe-deadlock-body", children: _jsx(DeadlockViewer, { deadlock: graph, theme: theme }) })] }, graph.id || idx)))] }));
}
