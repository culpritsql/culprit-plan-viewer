import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Copy, FileCode } from "lucide-react";
import { useMemo } from "react";
import { copyAndTell, exact, planEngineName, t } from "./host.js";
import { Sql } from "./Sql.js";
function rawFormatLabel(raw) {
    const trimmed = raw.trimStart();
    if (trimmed.startsWith("<"))
        return "XML";
    if (trimmed.startsWith("{") || trimmed.startsWith("["))
        return "JSON";
    return "TEXT";
}
export function PlanRaw({ plan }) {
    const raw = plan.raw;
    const formatted = useMemo(() => {
        if (!raw)
            return null;
        const trimmed = raw.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
                return JSON.stringify(JSON.parse(trimmed), null, 2);
            }
            catch {
                return raw;
            }
        }
        return raw;
    }, [raw]);
    if (!formatted) {
        return (_jsxs("div", { className: "culprit-pv plan plan-raw", children: [_jsxs("div", { className: "plan-head", children: [_jsx(FileCode, { size: 13, className: "muted" }), _jsx("span", { className: "tag", children: planEngineName(plan) }), _jsx("span", { className: "muted", children: t("ui.plan_raw.unavailable") })] }), plan.statement && (_jsx("div", { className: "plan-raw-sql", children: _jsx(Sql, { text: plan.statement }) }))] }));
    }
    const lineCount = formatted.split("\n").length;
    return (_jsxs("div", { className: "culprit-pv plan plan-raw", children: [_jsxs("div", { className: "plan-head", children: [_jsx("span", { className: "tag", children: rawFormatLabel(formatted) }), _jsxs("span", { className: "muted", children: [planEngineName(plan), " \u00B7 ", t("ui.plan_raw.lines", { n: lineCount, count: exact(lineCount) })] }), _jsx("span", { className: "spacer" }), _jsxs("button", { type: "button", className: "btn ghost small", onClick: () => copyAndTell(formatted, t("ui.plan_raw.copied")), children: [_jsx(Copy, { size: 12 }), " ", t("ui.plan_raw.copy")] })] }), _jsx("pre", { className: "plan-raw-code selectable", children: formatted })] }));
}
