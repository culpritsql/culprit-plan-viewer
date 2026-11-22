import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";
import { prettySql, tokenizeSql } from "./host.js";
export function Sql({ text, pretty = true, className }) {
    const tokens = useMemo(() => tokenizeSql(pretty ? prettySql(text) : text), [text, pretty]);
    return (_jsx("pre", { dir: "ltr", className: `sql ${className ?? ""}`, children: tokens.map((tok, i) => (tok.kind === "t" ? tok.text : _jsx("span", { className: tok.kind, children: tok.text }, i))) }));
}
