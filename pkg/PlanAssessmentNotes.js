import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, Info } from "lucide-react";
import { t } from "./host.js";
export function PlanAssessmentNotes({ note }) {
    if (!note)
        return null;
    return (_jsxs("details", { className: "ins-context", children: [_jsxs("summary", { children: [_jsx(Info, { size: 13 }), t("ui.plan_insights.assessment_notes"), _jsx(ChevronDown, { size: 13, className: "ins-context-chevron" })] }), _jsx("p", { className: "ins-note", children: note })] }));
}
