import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, TableProperties } from "lucide-react";
import { useId } from "react";
import { digits, t } from "./host.js";
const MAX_TYPES = 8;
const MAX_PARAMETERS = 16;
const MAX_COLUMNS = 64;
const MAX_INDEXES = 8;
const MAX_INDEX_COLUMNS = 64;
const MAX_LIMITATIONS = 4;
const MAX_NATIVE_TEXT = 256;
/** The backend owns association and wording; these are separately timed current catalog fields. */
export function PlanTypeSchema({ plan }) {
    const id = useId();
    const schema = plan.facts.current_type_schema;
    const view = plan.view?.current_type_schema;
    if (!schema || !view)
        return null;
    const types = schema.types.slice(0, MAX_TYPES);
    const parameters = schema.parameters.slice(0, MAX_PARAMETERS);
    const available = schema.status === "available";
    const limited = schema.types.length > MAX_TYPES ||
        schema.parameters.length > MAX_PARAMETERS ||
        types.some((type) => type.columns.length > MAX_COLUMNS ||
            type.indexes.length > MAX_INDEXES ||
            type.indexes.reduce((acc, index) => acc + index.columns.length, 0) > MAX_INDEX_COLUMNS);
    return (_jsxs("details", { className: "ins-context plan-type-schema", children: [_jsxs("summary", { children: [_jsx(TableProperties, { size: 13 }), view.title, _jsx(ChevronDown, { size: 13, className: "ins-context-chevron" })] }), _jsxs("div", { className: "plan-type-schema-body", children: [_jsx("p", { children: view.summary }), view.limitations.slice(0, MAX_LIMITATIONS).map((limitation, index) => (_jsx("p", { className: "muted", children: limitation }, index))), available && (_jsxs(_Fragment, { children: [schema.module && (_jsxs("dl", { children: [_jsx("dt", { children: t("ui.plan_type_schema.module") }), _jsx("dd", { children: _jsx("code", { children: qualified(schema.module) }) })] })), parameters.length > 0 && (_jsx(TableRegion, { label: t("ui.plan_type_schema.parameters"), children: _jsxs("table", { children: [_jsx("caption", { children: t("ui.plan_type_schema.parameters") }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: t("ui.plan_type_schema.parameter") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.table_type") })] }) }), _jsx("tbody", { children: parameters.map((parameter, position) => {
                                                const matches = types.map((type, index) => ({ type, index })).filter(({ type }) => type.user_type_id === parameter.user_type_id);
                                                const match = matches.length === 1 ? matches[0] : null;
                                                return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("code", { children: nativeText(parameter.name) }) }), _jsx("td", { children: match ? _jsx("a", { href: `#${id}-type-${match.index}`, children: qualified(match.type) }) : t("ui.common.unknown") })] }, `${parameter.parameter_id}:${position}`));
                                            }) })] }) })), types.map((type, index) => (_jsx(TypeSchema, { type: type, id: `${id}-type-${index}` }, `${type.user_type_id}:${index}`)))] })), limited && _jsx("p", { className: "muted", children: t("ui.plan_type_schema.limited") })] })] }, `${schema.observed_at}:${schema.status}:${schema.module?.identity.object_id}`));
}
function TypeSchema({ type, id }) {
    const columns = type.columns.slice(0, MAX_COLUMNS);
    let remaining = MAX_INDEX_COLUMNS;
    const indexes = type.indexes.slice(0, MAX_INDEXES).map((index) => {
        const links = index.columns.slice(0, remaining);
        remaining -= links.length;
        return { index, links };
    });
    return (_jsxs("section", { className: "plan-type-schema-type", id: id, children: [_jsx("h4", { children: _jsx("code", { children: qualified(type) }) }), _jsxs("dl", { children: [_jsx("dt", { children: t("ui.plan_type_schema.memory_optimized") }), _jsx("dd", { children: yesNo(type.memory_optimized) })] }), _jsx(TableRegion, { label: t("ui.plan_type_schema.columns"), children: _jsxs("table", { className: "plan-type-schema-columns", children: [_jsx("caption", { children: t("ui.plan_type_schema.columns") }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: t("ui.plan_type_schema.column") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.data_type") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.length_bytes") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.precision") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.scale") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.nullable") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.collation") })] }) }), _jsx("tbody", { children: columns.map((column, index) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("code", { children: nativeText(column.name) }) }), _jsx("td", { children: _jsx("code", { children: qualified({ schema: column.type_schema, name: column.type_name }) }) }), _jsx("td", { children: digits(String(column.max_length)) }), _jsx("td", { children: digits(String(column.precision)) }), _jsx("td", { children: digits(String(column.scale)) }), _jsx("td", { children: yesNo(column.nullable) }), _jsx("td", { children: column.collation == null ? t("ui.common.unknown") : nativeText(column.collation) })] }, `${column.column_id}:${index}`))) })] }) }), indexes.length > 0 && (_jsx(TableRegion, { label: t("ui.plan_type_schema.indexes"), children: _jsxs("table", { className: "plan-type-schema-indexes", children: [_jsx("caption", { children: t("ui.plan_type_schema.indexes") }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: t("ui.plan_type_schema.index") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.native_kind") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.unique") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.column") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.key_ordinal") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.descending") }), _jsx("th", { scope: "col", children: t("ui.plan_type_schema.included") })] }) }), _jsx("tbody", { children: indexes.flatMap(({ index, links }, position) => (links.length ? links : [null]).map((column, ordinal) => (_jsxs("tr", { children: [ordinal === 0 && (_jsxs(_Fragment, { children: [_jsx("td", { rowSpan: Math.max(links.length, 1), children: _jsx("code", { children: nativeText(index.name) }) }), _jsx("td", { rowSpan: Math.max(links.length, 1), children: nativeText(index.native_type) }), _jsx("td", { rowSpan: Math.max(links.length, 1), children: yesNo(index.unique) })] })), column ? (_jsxs(_Fragment, { children: [_jsx("td", { children: _jsx("code", { children: nativeText(column.name) }) }), _jsx("td", { children: digits(String(column.key_ordinal)) }), _jsx("td", { children: yesNo(column.descending) }), _jsx("td", { children: yesNo(column.included) })] })) : (_jsx("td", { colSpan: 4, children: t("ui.common.unknown") }))] }, `${index.index_id}:${position}:${ordinal}`)))) })] }) }))] }));
}
function TableRegion({ label, children }) {
    return (_jsx("div", { className: "plan-type-schema-scroll", role: "region", "aria-label": label, tabIndex: 0, children: children }));
}
function yesNo(value) {
    return t(value ? "ui.common.yes" : "ui.common.no");
}
function qualified(value) {
    return `${nativeText(value.schema)}.${nativeText(value.name)}`;
}
function nativeText(value) {
    let text = "";
    let characters = 0;
    for (const character of value) {
        if (characters === MAX_NATIVE_TEXT)
            return `${text}…`;
        text += character;
        characters++;
    }
    return text;
}
