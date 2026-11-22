import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
/** Plain text with `inline code` spans, as the checks write it. Never renders HTML from the database. */
export function Prose({ text }) {
    const parts = text.split("`");
    return (_jsx(_Fragment, { children: parts.map((part, i) => i % 2 === 1 ? (_jsx("code", { className: "inline-code", children: part }, i)) : (part)) }));
}
