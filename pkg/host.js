import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { Fragment, useSyncExternalStore } from "react";
import { CARDINAL_LANGUAGES, CARDINAL_RULES, DEFAULT_ENGINES, DEFAULT_LOCALE, DEFAULT_MESSAGES, } from "./defaults.js";
let customI18n = null;
let customClipboard = null;
const noopUnsubscribe = () => () => { };
/** Plug in the host application's live localization store (used by Culprit's desktop UI). */
export function bindPlanViewerI18n(adapter) {
    customI18n = adapter;
}
/** Plug in the host application's clipboard and toast notification handler. */
export function bindPlanViewerClipboard(handler) {
    customClipboard = handler;
}
function pluralRuleIndex(code) {
    let tag = code;
    for (;;) {
        const idx = CARDINAL_LANGUAGES[tag];
        if (idx !== undefined)
            return idx;
        const dash = tag.lastIndexOf("-");
        if (dash < 0)
            return undefined;
        tag = tag.slice(0, dash);
    }
}
function pluralOperands(num) {
    const [mantissa = "", exponent = "0"] = String(num).split("e");
    const whole = mantissa.includes(".") ? mantissa.indexOf(".") : mantissa.length;
    const rawDigits = mantissa.replace(".", "");
    const decimal = whole + Number(exponent);
    const length = Math.max(0, rawDigits.length - decimal);
    const fraction = length === 0 ? 0 : Number(rawDigits.slice(Math.max(0, decimal)));
    return { n: num, i: Math.floor(num), v: length, w: length, f: fraction, t: fraction, c: 0, e: 0 };
}
function cardinalCategory(num, code) {
    const idx = pluralRuleIndex(code);
    if (idx === undefined || !Number.isFinite(num))
        return "other";
    const values = pluralOperands(Math.abs(num));
    const matches = ([operand, modulus, negate, ranges]) => {
        const value = modulus ? values[operand] % modulus : values[operand];
        return (Number.isInteger(value) && ranges.some(([start, end]) => value >= start && value <= end)) !== negate;
    };
    return CARDINAL_RULES[idx]?.find(([, alternatives]) => alternatives.some((terms) => terms.every(matches)))?.[0] ?? "other";
}
const parsedMessages = new Map();
function parseMessage(message) {
    let i = 0;
    const skipSpace = () => {
        while (i < message.length && /\s/.test(message[i]))
            i++;
    };
    const word = () => {
        skipSpace();
        const start = i;
        while (i < message.length && /[A-Za-z0-9_=.-]/.test(message[i]))
            i++;
        return message.slice(start, i);
    };
    const readNodes = (inPlural, nested) => {
        const out = [];
        let text = "";
        const flush = () => {
            if (text)
                out.push({ kind: "text", text });
            text = "";
        };
        while (i < message.length) {
            const c = message[i];
            if (c === "}") {
                if (nested)
                    break;
                text += c;
                i++;
                continue;
            }
            if (c === "#" && inPlural) {
                flush();
                out.push({ kind: "pound" });
                i++;
                continue;
            }
            if (c !== "{") {
                text += c;
                i++;
                continue;
            }
            flush();
            i++;
            const name = word();
            skipSpace();
            if (message[i] === "}") {
                i++;
                out.push({ kind: "arg", name });
                continue;
            }
            i++;
            const kind = word();
            skipSpace();
            i++;
            const cases = {};
            while (i < message.length) {
                skipSpace();
                if (message[i] === "}") {
                    i++;
                    break;
                }
                const caseKey = word();
                skipSpace();
                if (message[i] === "{")
                    i++;
                cases[caseKey] = readNodes(kind === "plural", true);
                if (message[i] === "}")
                    i++;
            }
            out.push({ kind: kind === "plural" ? "plural" : "select", name, cases });
        }
        flush();
        return out;
    };
    return readNodes(false, false);
}
function formatNumber(n, loc) {
    if (!Number.isFinite(n))
        return String(n);
    const neg = n < 0;
    const [whole, fraction = ""] = Math.abs(n).toFixed(2).replace(/0+$/, "").replace(/\.$/, "").split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, loc.group);
    return `${neg ? "-" : ""}${grouped}${fraction ? loc.decimal + fraction : ""}`;
}
function renderMessage(nodes, args, loc, pound) {
    let out = "";
    for (const n of nodes) {
        switch (n.kind) {
            case "text":
                out += n.text;
                break;
            case "pound":
                out += pound === null ? "#" : formatNumber(pound, loc);
                break;
            case "arg": {
                const v = args[n.name];
                out += v === undefined ? `{${n.name}}` : typeof v === "number" ? formatNumber(v, loc) : v;
                break;
            }
            case "plural": {
                const v = Number(args[n.name]);
                const chosen = n.cases[`=${v}`] ?? n.cases[cardinalCategory(v, loc.plural)] ?? n.cases.other ?? [];
                out += renderMessage(chosen, args, loc, v);
                break;
            }
            case "select": {
                const v = String(args[n.name] ?? "");
                out += renderMessage(n.cases[v] ?? n.cases.other ?? [], args, loc, pound);
                break;
            }
        }
    }
    return out;
}
export function locale() {
    return customI18n ? customI18n.locale() : DEFAULT_LOCALE;
}
export function language() {
    return customI18n ? customI18n.language() : "en";
}
export function useLanguage() {
    const sub = customI18n ? customI18n.subscribe : noopUnsubscribe;
    const snap = customI18n ? customI18n.language : () => "en";
    return useSyncExternalStore(sub, snap, snap);
}
export function t(key, args = {}) {
    if (customI18n)
        return customI18n.t(key, args);
    const msg = DEFAULT_MESSAGES[key];
    if (typeof msg !== "string")
        return key;
    let nodes = parsedMessages.get(msg);
    if (!nodes) {
        nodes = parseMessage(msg);
        parsedMessages.set(msg, nodes);
    }
    return renderMessage(nodes, args, DEFAULT_LOCALE, null);
}
export async function copyAndTell(text, message) {
    if (customClipboard) {
        const res = await customClipboard(text, message);
        return res !== false;
    }
    try {
        await globalThis.navigator?.clipboard?.writeText(text);
        return true;
    }
    catch {
        return false;
    }
}
const SLOT_MARK = "\u0001";
const SLOT_RE = new RegExp(`${SLOT_MARK}(\\d+)${SLOT_MARK}`);
export function slot(i) {
    return `${SLOT_MARK}${i}${SLOT_MARK}`;
}
export function withElements(message, elements) {
    const parts = message.split(SLOT_RE);
    return (_jsx(_Fragment, { children: parts.map((part, i) => (i % 2 === 0 ? part : _jsx(Fragment, { children: elements[Number(part)] }, i))) }));
}
export function tx(key, args, elements) {
    const names = Object.keys(elements);
    const slots = Object.fromEntries(names.map((name, i) => [name, slot(i)]));
    return withElements(t(key, { ...args, ...slots }), names.map((name) => elements[name]));
}
// ── Engine presentation facts ──
export function canPlanEstimates(engine) {
    return Boolean(DEFAULT_ENGINES[engine]?.abilities.plan_estimates);
}
export function genericPlanContextKey(engine) {
    return DEFAULT_ENGINES[engine]?.evidence_presentation.generic_plan_context ?? "";
}
export function serverName(engine, product) {
    const spec = DEFAULT_ENGINES[engine];
    if (!spec)
        return engine;
    const matched = spec.products.find((p) => p.prefix !== null && product?.startsWith(p.prefix)) ?? spec.products[0];
    return matched?.label ?? spec.label;
}
export function planEngineName(plan) {
    return serverName(plan.engine, plan.props?.flavor);
}
// ── Number and duration formatting ──
function fixed(x, places) {
    const text = x.toFixed(places);
    const halves = Math.abs(x) * 2 ** (places + 1);
    if (!Number.isInteger(halves) || halves % 2 !== 1)
        return text;
    const scale = 10 ** places;
    const up = Math.round(Math.abs(Number(text)) * scale);
    if (up % 2 === 0)
        return text;
    return `${x < 0 ? "-" : ""}${((up - 1) / scale).toFixed(places)}`;
}
function roundHalfAway(x) {
    return Math.sign(x) * Math.round(Math.abs(x));
}
export function digits(text) {
    const { decimal, group } = locale();
    if (decimal === "." && group === ",")
        return text;
    return text.replace(/[.,]/g, (c) => (c === "." ? decimal : group));
}
export function dateLocale() {
    const code = language();
    const base = code.split("-")[0];
    const system = typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
    return system.find((tag) => tag && (tag === code || tag.split("-")[0] === base)) ?? code;
}
export function duration(ms) {
    if (ms == null)
        return "—";
    const v = Math.max(0, ms);
    if (v === 0)
        return t("ui.format.duration.ms", { value: "0" });
    if (v < 0.01)
        return t("ui.format.duration.us", { value: digits(fixed(Math.max(1, v * 1000), 0)) });
    if (v < 1)
        return t("ui.format.duration.ms", { value: digits(fixed(v, 2)) });
    if (v < 9.95) {
        const tenths = fixed(v, 1);
        return t("ui.format.duration.ms", { value: digits(tenths.endsWith(".0") ? tenths.slice(0, -2) : tenths) });
    }
    if (v < 1000)
        return t("ui.format.duration.ms", { value: digits(fixed(v, 0)) });
    const s = v / 1000;
    if (s < 60)
        return t("ui.format.duration.s", { value: digits(fixed(s, 1)) });
    const m = s / 60;
    if (m < 60)
        return t("ui.format.duration.min", { value: digits(fixed(m, 0)) });
    const h = m / 60;
    if (h < 48) {
        const whole = Math.floor(h);
        const minutes = roundHalfAway((h - whole) * 60);
        return minutes >= 1 ? t("ui.format.duration.h_min", { hours: whole, minutes }) : t("ui.format.duration.h", { hours: whole });
    }
    const dayStr = fixed(h / 24, 1);
    return t("ui.format.days", { n: Number(dayStr), count: digits(dayStr) });
}
export function count(value) {
    if (value == null)
        return "—";
    const n = value === 0 ? 0 : value;
    const v = Math.abs(n);
    if (v >= 1e9)
        return t("ui.format.count.billions", { value: digits(fixed(n / 1e9, 1)) });
    if (v >= 1e6)
        return t("ui.format.count.millions", { value: digits(fixed(n / 1e6, 1)) });
    if (v >= 1e4)
        return t("ui.format.count.thousands", { value: digits(fixed(n / 1e3, 0)) });
    if (v >= 1e3)
        return t("ui.format.count.thousands", { value: digits(fixed(n / 1e3, 1)) });
    if (v >= 100 || Number.isInteger(n))
        return digits(fixed(n, 0));
    return digits(fixed(n, 1));
}
export function rowCount(value) {
    return t("ui.format.row_count", { n: value ?? Number.NaN, count: count(value) });
}
export function percent(ratio) {
    if (ratio == null)
        return "—";
    const p = ratio * 100;
    if (p > 0 && p < 1)
        return t("ui.format.percent.under", { value: digits("1") });
    return t("ui.format.percent.value", { value: digits(fixed(p, 0)) });
}
export function when(iso, now = new Date()) {
    if (!iso)
        return { short: "", full: "" };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return { short: iso, full: iso };
    const loc = dateLocale();
    const time = d.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" });
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((day(now) - day(d)) / 86_400_000);
    const short = diffDays === 0
        ? t("ui.format.when.today", { time })
        : diffDays === 1
            ? t("ui.format.when.yesterday", { time })
            : d.getFullYear() === now.getFullYear()
                ? t("ui.format.when.this_year", { date: d.toLocaleDateString(loc, { month: "short", day: "numeric" }), time })
                : d.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" });
    return { short, full: d.toLocaleString(loc, { dateStyle: "full", timeStyle: "short" }) };
}
// ── SQL tokenization ──
const SQL_KEYWORDS = new Set("select from where and or not in is null as join inner left right full outer cross apply on group by order having union all distinct top limit offset fetch next rows only insert into values update set delete merge with case when then else end exists between like asc desc over partition count sum avg min max cast convert coalesce isnull returning create index nonclustered clustered unique include online concurrently table alter drop primary key foreign references begin commit rollback transaction declare exec execute option recompile nolock if".split(" "));
const SQL_PATTERN = /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^']|'')*')|(\$\d+|@@?[A-Za-z_][\w]*|:[A-Za-z_]\w*|\?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w$]*)|(\s+|::|[^\sA-Za-z_\d'$@:?-]+|-)|[\s\S]/gu;
export function tokenizeSql(sql) {
    const out = [];
    for (const m of sql.matchAll(SQL_PATTERN)) {
        const [text, comment, str, param, num, word] = m;
        if (comment)
            out.push({ kind: "c", text });
        else if (str)
            out.push({ kind: "s", text });
        else if (param)
            out.push({ kind: "p", text });
        else if (num)
            out.push({ kind: "n", text });
        else if (word && SQL_KEYWORDS.has(word.toLowerCase()))
            out.push({ kind: "k", text });
        else
            out.push({ kind: "t", text });
    }
    return out;
}
const SQL_BREAK_BEFORE = /\s+(FROM|WHERE|GROUP BY|ORDER BY|HAVING|UNION ALL|UNION|LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN|CROSS APPLY|OUTER APPLY|JOIN|LIMIT|OFFSET|VALUES|SET|RETURNING|OPTION)\b/gi;
export function prettySql(sql) {
    const trimmed = sql.trim();
    if (trimmed.includes("\n"))
        return trimmed;
    return trimmed
        .replace(SQL_BREAK_BEFORE, (_, kw) => `\n${kw.toUpperCase()}`)
        .replace(/\s+(AND|OR)\s+/gi, (_, op) => `\n  ${op.toUpperCase()} `);
}
// ── Keyboard & local storage helpers ──
const TAB_MOVES = {
    ArrowRight: (at, last) => (at === last ? 0 : at + 1),
    ArrowLeft: (at, last) => (at === 0 ? last : at - 1),
    Home: () => 0,
    End: (_, last) => last,
};
export function tabListKeys(e) {
    const tabs = [...e.currentTarget.querySelectorAll('[role="tab"]:not(:disabled)')];
    const at = tabs.findIndex((tab) => tab.contains(document.activeElement));
    const move = TAB_MOVES[e.key];
    if (at < 0 || !move)
        return;
    e.preventDefault();
    e.stopPropagation();
    const next = tabs[move(at, tabs.length - 1)];
    next?.focus();
    next?.click();
}
export function rememberedChoice(key, fallback, allowed) {
    try {
        const val = globalThis.localStorage?.getItem(key) ?? null;
        return val !== null && allowed.includes(val) ? val : fallback;
    }
    catch {
        return fallback;
    }
}
export function remember(key, value) {
    try {
        if (value === null)
            globalThis.localStorage?.removeItem(key);
        else
            globalThis.localStorage?.setItem(key, value);
    }
    catch { }
}
// ── Plan model projection helpers ──
export function allNodes(n, out = []) {
    out.push(n);
    n.children.forEach((c) => allNodes(c, out));
    return out;
}
const nodesCache = new WeakMap();
export function operatorView(plan, node) {
    if (!plan?.view)
        return null;
    let cached = nodesCache.get(plan);
    if (!cached || cached.source !== plan.view) {
        cached = { source: plan.view, nodes: new Map(plan.view.nodes.map((n) => [n.id, n])) };
        nodesCache.set(plan, cached);
    }
    return cached.nodes.get(node.id) ?? null;
}
export const costBasis = (plan) => plan.view?.cost_basis ?? 1;
export const uncostedSteps = (plan) => allNodes(plan.root).filter((n) => operatorView(plan, n)?.uncosted);
export const stepShare = (plan, node) => operatorView(plan, node)?.cost_share ?? null;
export const guesses = (plan) => new Map((plan.view?.nodes ?? []).flatMap((n) => (n.guess ? [[n.id, n.guess]] : [])));
export function statedInsightShare(plan, insight) {
    return (plan.view?.insights.find((i) => i.rule === insight.rule && i.nodes.length === insight.nodes.length && i.nodes.every((id, at) => id === insight.nodes[at]))?.share ?? null);
}
const matchesQuery = (plan, query) => !query ||
    !plan.view?.query ||
    (plan.view.query.query_id === query.id &&
        (plan.view.query.plan_id == null || query.plan_id == null || plan.view.query.plan_id === query.plan_id));
export function noShareReason(plan, node, query) {
    if (!plan.view)
        return t("ui.plan_format.missing_view");
    return matchesQuery(plan, query) ? operatorView(plan, node)?.no_share_reason ?? null : t("ui.plan_format.other_measurements");
}
export function findingNoShareReason(plan, node, query) {
    if (!plan.view)
        return t("ui.plan_format.missing_view");
    return matchesQuery(plan, query) ? operatorView(plan, node)?.finding_no_share_reason ?? null : t("ui.plan_format.other_measurements");
}
export function sharesNote(plan, query) {
    if (!plan.view)
        return t("ui.plan_format.missing_view");
    return matchesQuery(plan, query) ? plan.view.cost_note : t("ui.plan_format.other_measurements");
}
export const estRows = (plan, node) => {
    const view = operatorView(plan, node);
    return view ? view.estimated_rows : node.facts.estimated_rows_unavailable ? null : node.est_rows * Math.max(1, node.est_executions);
};
export const rowsOut = (plan, node) => {
    const view = operatorView(plan, node);
    return view ? view.rows_out : node.act_rows ?? estRows(plan, node);
};
export const estRowsForRuns = (plan, node) => {
    const view = operatorView(plan, node);
    return view ? view.estimated_rows_for_runs : node.act_executions == null ? estRows(plan, node) : null;
};
export const operatorRuns = (plan, node) => {
    const view = operatorView(plan, node);
    return view
        ? view.runs
        : node.facts.estimated_rows_unavailable
            ? node.act_executions
            : node.act_executions == null
                ? Math.max(1, node.est_executions)
                : null;
};
export const misestimate = (plan, node) => operatorView(plan, node)?.misestimate ?? null;
export function exact(value) {
    if (value == null || !Number.isFinite(value))
        return "—";
    if (Math.abs(value) >= 100 || Number.isInteger(value))
        return digits(Math.round(value).toLocaleString("en-US"));
    return digits(value.toLocaleString("en-US", { maximumFractionDigits: 2 }));
}
export function cost(value) {
    if (value === 0)
        return "0";
    if (Math.abs(value) >= 1000)
        return count(value);
    return digits(Number(value.toPrecision(3)).toLocaleString("en-US"));
}
export function rows(value) {
    if (value == null)
        return "—";
    return value >= 10 ? count(Math.round(value)) : count(Math.round(value * 10) / 10);
}
export function propValue(value) {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(trimmed)) {
        const n = Number(trimmed);
        if (Number.isFinite(n))
            return Math.abs(n) >= 1e4 || Number.isInteger(n) ? exact(n) : digits(Number(n.toPrecision(4)).toLocaleString("en-US"));
    }
    if (trimmed === "1" || trimmed.toLowerCase() === "true")
        return t("ui.plan_format.true");
    if (trimmed.toLowerCase() === "false")
        return t("ui.plan_format.false");
    return value;
}
const SEVERITY_RANK = { high: 3, medium: 2, low: 1 };
export function bySeverity(a, b) {
    return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.impact - a.impact;
}
export function insightsByNode(plan) {
    const map = new Map();
    (plan.insights?.items ?? []).forEach((i) => i.nodes.forEach((id) => {
        const list = map.get(id) ?? [];
        list.push(i);
        list.sort(bySeverity);
        map.set(id, list);
    }));
    return map;
}
export function isWrapper(n, total) {
    if (n.children.length !== 1 || n.warnings.length > 0)
        return false;
    const free = n.self_cost / total < 0.001;
    const op = n.op.toLowerCase();
    return free && (op === "query block" || op === "compute scalar" || op === "query" || op === "result" || op === "stream results");
}
export function planKindLabel(plan) {
    return plan.kind === "actual"
        ? t("ui.common.plan_kind.actual")
        : plan.kind === "generic"
            ? t("ui.common.plan_kind.generic")
            : t("ui.common.plan_kind.estimated");
}
export function shortPredicate(text) {
    return text
        .replace(/(\[[^\]]+\]\.)+(?=\[)/g, "")
        .replace(/\b\w+\.\w+\.(?=\w)/g, "")
        .replace(/[[\]]/g, "")
        .replace(/\s*(>=|<=|<>|=|<|>)\s*/g, " $1 ")
        .replace(/\s+/g, " ")
        .trim();
}
export function predicateLabel(kind, predicate) {
    return kind === "seek"
        ? t("ui.common.plan_seek", { predicate: shortPredicate(predicate) })
        : t("ui.common.plan_filter", { predicate: shortPredicate(predicate) });
}
export function planShares(plan, query) {
    const view = plan.view;
    const timed = plan.kind === "actual" && view?.kind === "actual" && view.timed_total_ms != null;
    const entries = view?.nodes ?? [];
    const nodes = allNodes(plan.root);
    const own = new Map(entries.map((n) => [n.id, timed ? n.time_share ?? 0 : n.layout_own_share]));
    const subtree = new Map(entries.map((n) => [n.id, timed ? n.subtree_time_share ?? 0 : n.layout_subtree_share]));
    const stated = new Map(entries.map((n) => [n.id, timed ? n.time_share : n.cost_share]));
    const statedSubtree = new Map(entries.map((n) => [n.id, timed ? n.subtree_time_share : n.subtree_cost_share]));
    const hot = timed ? view?.hottest_time : view?.hottest_cost;
    return {
        basis: timed ? "time" : "cost",
        own,
        subtree,
        stated,
        statedSubtree,
        hottest: nodes.find((n) => n.id === hot) ?? null,
        ms: new Map(entries.flatMap((n) => (timed && n.own_ms != null ? [[n.id, n.own_ms]] : []))),
        note: timed ? view?.time_note ?? null : sharesNote(plan, query),
        total: (timed ? view?.timed_total_ms : view?.cost_basis) ?? 1,
    };
}
export function actualFacts(plan) {
    const actual = plan.kind === "actual" && plan.view?.kind === "actual" ? plan.view.actual : null;
    if (!actual)
        return null;
    const nodes = allNodes(plan.root);
    const node = (id) => nodes.find((n) => n.id === id) ?? null;
    const slowest = node(actual.slowest_node);
    const worst = node(actual.worst_estimate_node);
    const skew = actual.skew ? node(actual.skew.node) : null;
    const share = plan.view?.nodes.find((n) => n.id === actual.slowest_node)?.time_share;
    return {
        triggers: actual.triggers.map((tr) => ({ name: tr.name, relation: tr.relation, ms: tr.time_ms, calls: tr.calls })),
        elapsedMs: actual.elapsed_ms,
        cpuMs: actual.cpu_ms,
        logicalReads: actual.logical_reads,
        physicalReads: actual.physical_reads,
        rows: actual.rows,
        grantedKb: actual.memory_granted_kb,
        usedKb: actual.memory_used_kb,
        spilled: actual.spilled,
        spillPages: actual.spill_pages ?? 0,
        timed: actual.timed,
        slowest: slowest && actual.slowest_ms != null && share != null ? { node: slowest, ms: actual.slowest_ms, share } : null,
        worstEstimate: worst && actual.worst_estimate != null ? { node: worst, factor: actual.worst_estimate } : null,
        skew: skew && actual.skew ? { node: skew, busiest: actual.skew.busiest, threads: actual.skew.threads } : null,
        lastRunAt: actual.last_run_at,
        workers: actual.workers,
    };
}
