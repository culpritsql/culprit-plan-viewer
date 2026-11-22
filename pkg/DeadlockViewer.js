import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Copy } from "lucide-react";
import { useRef } from "react";
import { DeadlockGraph } from "./DeadlockGraph.js";
import { copyAndTell, dateLocale, t } from "./host.js";
import { Sql } from "./Sql.js";
export function deadlockPatternLabel(pattern) {
    switch (pattern) {
        case "key-lookup":
            return t("ui.deadlocks.pattern.key_lookup");
        case "lock-conversion":
            return t("ui.deadlocks.pattern.lock_conversion");
        case "opposite-order":
            return t("ui.deadlocks.pattern.opposite_order");
        case "lock-escalation":
            return t("ui.deadlocks.pattern.lock_escalation");
        case "parallelism":
            return t("ui.deadlocks.pattern.parallelism");
        case "cycle":
            return t("ui.deadlocks.pattern.cycle");
    }
}
export function deadlockWhen(iso) {
    if (!iso)
        return { short: t("ui.deadlocks.time_unknown"), full: t("ui.deadlocks.time_unknown_full") };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return { short: iso, full: iso };
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const loc = dateLocale();
    const time = d.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" });
    const short = sameDay
        ? t("ui.deadlocks.today", { time })
        : t("ui.format.when.this_year", { date: d.toLocaleDateString(loc, { month: "short", day: "numeric" }), time });
    return { short, full: d.toLocaleString(loc) };
}
/**
 * Complete deadlock investigation view: pattern classification, timestamp, interactive lock-cycle SVG graph,
 * plain-language explanation, numbered SQL fixes, and involved session/process cards.
 */
export function DeadlockViewer({ deadlock, renderRelatedFinding, theme, className }) {
    const rootRef = useRef(null);
    const at = deadlockWhen(deadlock.at);
    const handlePickProcess = (p) => {
        const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        rootRef.current?.querySelector(`[data-proc-id="${p.id}"]`)?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    };
    return (_jsxs("article", { ref: rootRef, className: `culprit-pv dl-detail ${className ?? ""}`, "data-theme": theme && theme !== "system" ? theme : undefined, children: [_jsxs("div", { className: "dl-detail-meta", children: [_jsx("span", { className: "dl-pattern", children: deadlockPatternLabel(deadlock.pattern) }), _jsx("span", { className: "muted", title: at.full, children: deadlock.source === "pasted"
                            ? deadlock.at
                                ? `${at.short} · ${t("ui.deadlocks.pasted")}`
                                : t("ui.deadlocks.pasted")
                            : `${at.short} · ${deadlock.source}` })] }), _jsx("h2", { className: "dl-headline", children: deadlock.headline }), _jsx(DeadlockGraph, { deadlock: deadlock, onPick: handlePickProcess }), _jsx("p", { className: "dl-explain", children: deadlock.explanation }), deadlock.fixes.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { className: "dl-section", children: t("ui.deadlocks.how_to_fix") }), _jsx("ol", { className: "dl-fixes", children: deadlock.fixes.map((f, i) => (_jsxs("li", { className: "dl-fix", children: [_jsx("div", { className: "dl-fix-title", children: f.title }), _jsx("p", { children: f.detail }), f.sql && (_jsxs("div", { className: "dl-fix-sql", children: [_jsx(Sql, { text: f.sql, pretty: false }), _jsxs("button", { type: "button", className: "btn ghost small", onClick: () => copyAndTell(f.sql, t("ui.common.copied")), "aria-label": t("ui.deadlocks.copy_sql"), children: [_jsx(Copy, { size: 12 }), " ", t("ui.common.copy")] })] })), renderRelatedFinding?.(f)] }, i))) })] })), _jsx("h3", { className: "dl-section", children: t("ui.deadlocks.involved") }), _jsx("div", { className: "dl-procs", children: deadlock.processes.map((p) => (_jsxs("div", { id: `dl-proc-${p.id}`, "data-proc-id": p.id, className: `dl-proc-card ${p.victim ? "victim" : ""}`, children: [_jsxs("div", { className: "dl-proc-head", children: [_jsx("strong", { children: p.session ? t("ui.deadlocks.session", { session: p.session }) : t("ui.deadlocks.process", { id: p.id }) }), p.victim && _jsx("span", { className: "pill victim", children: t("ui.deadlocks.rolled_back") })] }), _jsx("div", { className: "dl-proc-facts muted", children: [
                                p.application,
                                p.login && p.host ? `${p.login}@${p.host}` : (p.login ?? p.host),
                                p.isolation,
                                p.wait_mode ? t("ui.deadlocks.wanted", { mode: p.wait_mode }) : null,
                                p.procedure ? t("ui.deadlocks.in_procedure", { procedure: p.procedure }) : null,
                            ]
                                .filter(Boolean)
                                .join(" · ") }), p.statement ? _jsx(Sql, { text: p.statement, className: "dl-proc-sql" }) : _jsx("p", { className: "muted", children: t("ui.deadlocks.no_statement") })] }, p.id))) })] }));
}
