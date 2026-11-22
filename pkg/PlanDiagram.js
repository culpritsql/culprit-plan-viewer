import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, ChevronUp, Flame, Map as MapIcon, Maximize2, Minus, Plus, Scan, Search, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActualSummary } from "./ActualSummary.js";
import { allNodes, costBasis as basis, canPlanEstimates, cost, duration, estRows, estRowsForRuns, findingNoShareReason, insightsByNode, isWrapper, misestimate, noShareReason, operatorView, percent, planKindLabel, planShares, predicateLabel, rows, rowsOut, serverName, t, uncostedSteps, } from "./host.js";
import { NodeDetails } from "./NodeDetails.js";
import { OpIcon } from "./OpIcon.js";
const CARD_W = 196;
export function compactOp(op) {
    return op
        .replace(/^(Clustered|Nonclustered|Columnstore|Clustered Columnstore) Index (?=\S)/i, "$1 ")
        .replace(/^(Unique|Subquery) index lookup$/i, "$1 lookup")
        .replace(/^Table-valued function$/i, "Table function");
}
const CARD_H = 74;
const GAP_X = 28;
const GAP_Y = 62;
const PAD = 26;
const CHEAP_SHARE = 0.005;
const MIN_FIT = 0.45;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.8;
const MARK_LABEL = {
    changed: () => t("ui.plan_diagram.mark_changed"),
    added: () => t("ui.plan_diagram.mark_only_here"),
    removed: () => t("ui.plan_diagram.mark_only_here"),
};
export const costBasis = basis;
function subtreeSize(n) {
    return 1 + n.children.reduce((s, c) => s + subtreeSize(c), 0);
}
function heat(share) {
    if (share >= 0.3)
        return "var(--heat-4)";
    if (share >= 0.15)
        return "var(--heat-3)";
    if (share >= 0.05)
        return "var(--heat-2)";
    if (share >= 0.01)
        return "var(--heat-1)";
    return "transparent";
}
function pathTo(node, id) {
    const walk = (n) => {
        if (n.id === id)
            return [n.id];
        for (const c of n.children) {
            const p = walk(c);
            if (p)
                return [n.id, ...p];
        }
        return null;
    };
    return new Set(walk(node) ?? []);
}
function drawn(n, total, keep) {
    const via = [];
    let cur = n;
    while (isWrapper(cur, total) && !keep.has(cur.id) && cur.children[0]) {
        via.push(cur.op);
        cur = cur.children[0];
    }
    return { node: cur, via };
}
function layout(root, total, expanded, keep, weighed, subtreeShare) {
    const boxes = [];
    const folds = [];
    const parentOf = new Map();
    let slot = 0;
    const place = (n, via, depth) => {
        const kids = n.children.map((c) => drawn(c, total, keep));
        const visible = kids.filter((k) => !weighed || expanded.has(k.node.id) || keep.has(k.node.id) || k.node.subtree_cost / total >= CHEAP_SHARE);
        const hidden = kids.filter((k) => !visible.includes(k));
        const xs = visible.map((k) => {
            parentOf.set(k.node.id, n.id);
            return place(k.node, k.via, depth + 1);
        });
        if (hidden.length > 0) {
            const fx = slot++;
            const shares = hidden.map((k) => subtreeShare(k.node));
            folds.push({
                id: `fold-${n.id}`,
                parent: n.id,
                count: hidden.reduce((s, k) => s + subtreeSize(k.node) + k.via.length, 0),
                share: shares.every((v) => v != null) ? shares.reduce((s, v) => s + (v ?? 0), 0) : null,
                x: fx,
                y: depth + 1,
            });
            xs.push(fx);
        }
        const x = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : slot++;
        boxes.push({ node: n, x, y: depth, via });
        return x;
    };
    const top = drawn(root, total, keep);
    place(top.node, top.via, 0);
    const maxX = Math.max(0, ...boxes.map((b) => b.x), ...folds.map((f) => f.x));
    const maxY = Math.max(0, ...boxes.map((b) => b.y), ...folds.map((f) => f.y));
    return {
        boxes,
        folds,
        parentOf,
        rootVia: top.via,
        width: PAD * 2 + (maxX + 1) * CARD_W + maxX * GAP_X,
        height: PAD * 2 + 24 + (maxY + 1) * CARD_H + maxY * GAP_Y,
    };
}
const px = (x) => PAD + x * (CARD_W + GAP_X);
const py = (y) => PAD + 24 + y * (CARD_H + GAP_Y);
function nodeMatchesQuery(n, q) {
    const hay = `${n.op} ${n.object ?? ""} ${n.index ?? ""} ${n.detail ?? ""} ${n.predicate ?? ""} ${n.seek_predicate ?? ""}`.toLowerCase();
    return hay.includes(q);
}
function nodeReadsValue(n) {
    return n.runtime?.logical_reads ?? n.rows_read ?? null;
}
export function CostStrip({ plan, query, focus, onPick }) {
    const shares = useMemo(() => planShares(plan, query), [plan, query]);
    const focused = allNodes(plan.root).find((n) => n.id === focus);
    const note = shares.basis === "cost" && focused ? findingNoShareReason(plan, focused, query) ?? shares.note : shares.note;
    if (shares.basis !== "time" && !canPlanEstimates(plan.engine)) {
        return (_jsx("div", { className: "cost-strip", children: _jsx("div", { className: "eyebrow", children: t("ui.plan_diagram.access_path_only", { engine: serverName(plan.engine) }) }) }));
    }
    const own = (n) => shares.stated.get(n.id) ?? 0;
    const top = allNodes(plan.root)
        .filter((n) => own(n) > 0)
        .sort((a, b) => own(b) - own(a))
        .slice(0, 4);
    if (top.length === 0 && note) {
        return (_jsx("div", { className: "cost-strip", children: _jsx("div", { className: "eyebrow", children: t("ui.plan_diagram.cost_goes_note", { note }) }) }));
    }
    const rest = Math.max(0, 1 - top.reduce((s, n) => s + own(n), 0));
    return (_jsxs("div", { className: "cost-strip", children: [_jsx("div", { className: "eyebrow", children: shares.basis === "time" ? t("ui.plan_diagram.time_went", { time: duration(shares.total) }) : t("ui.plan_diagram.cost_goes") }), _jsxs("div", { className: "cost-bar", children: [top.map((n) => (_jsx("button", { type: "button", className: n.id === shares.hottest?.id ? "hottest" : "", style: { flex: own(n), background: heat(own(n)) === "transparent" ? "var(--sunken)" : heat(own(n)) }, title: `${n.op} ${percent(own(n))}`, onClick: () => onPick(n.id) }, n.id))), rest > 0.005 && _jsx("span", { style: { flex: rest, background: "var(--sunken)" }, title: t("ui.plan_diagram.everything_else", { share: percent(rest) }) })] }), _jsx("div", { className: "cost-legend", children: top.map((n) => (_jsxs("button", { type: "button", onClick: () => onPick(n.id), children: [_jsx(OpIcon, { node: n, size: 12 }), _jsx("b", { children: percent(own(n)) }), " ", n.op, n.object && _jsxs("span", { className: "mono muted", children: [" ", n.object.split(".").pop()] }), n.kind === "parallelism" && _jsxs("span", { className: "muted", children: [" \u00B7 ", t("ui.plan_diagram.passing_rows")] })] }, n.id))) }), shares.note && _jsx("div", { className: "muted", style: { fontSize: 12, marginTop: 4 }, children: shares.note })] }));
}
export function PlanDiagram(props) {
    const { plan, query, focus, marks, selectedId, onSelect, initialZoom, badge, bare, tints, onZoomChange, overlay, kindLabel, showHeader = !bare, showActualSummary = !bare, showCostStrip = !bare, showInsights = true, showControls = true, height: customHeight, theme, className, } = props;
    const reason = (n) => (focus === n.id ? findingNoShareReason(plan, n, query) : noShareReason(plan, n, query));
    const total = basis(plan);
    const shares = useMemo(() => planShares(plan, query), [plan, query]);
    const shareOf = (n) => shares.stated.get(n.id) ?? null;
    const planCost = plan.total_cost || plan.root.subtree_cost;
    const estimates = canPlanEstimates(plan.engine) || shares.basis === "time";
    const nodes = useMemo(() => allNodes(plan.root), [plan]);
    const flagged = useMemo(() => (showInsights ? insightsByNode(plan) : new Map()), [plan, showInsights]);
    const hottest = shares.hottest;
    const target = selectedId ?? focus ?? hottest?.id ?? plan.root.id;
    // Available metric lenses for coloring cards
    const availableLenses = useMemo(() => {
        const out = [];
        if (shares.basis === "time")
            out.push("time");
        if (canPlanEstimates(plan.engine) && !plan.facts.estimated_cost_unavailable)
            out.push("cost");
        if (nodes.some((n) => (rowsOut(plan, n) ?? 0) > 0))
            out.push("rows");
        if (nodes.some((n) => (nodeReadsValue(n) ?? 0) > 0))
            out.push("reads");
        return out;
    }, [plan, nodes, shares.basis]);
    const fallbackLens = props.defaultLens && availableLenses.includes(props.defaultLens)
        ? props.defaultLens
        : shares.basis === "time"
            ? "time"
            : availableLenses[0] ?? "cost";
    const [ownLens, setOwnLens] = useState(fallbackLens);
    const lens = props.lens && availableLenses.includes(props.lens) ? props.lens : ownLens;
    const setLens = setOwnLens;
    useEffect(() => {
        if (!props.lens && !availableLenses.includes(ownLens))
            setOwnLens(fallbackLens);
    }, [availableLenses, ownLens, fallbackLens, props.lens]);
    // Search & match navigation across the diagram
    const [searchText, setSearchText] = useState("");
    const [matchCursor, setMatchCursor] = useState(0);
    const trimmedSearch = searchText.trim().toLowerCase();
    const matchedIds = useMemo(() => {
        if (!trimmedSearch)
            return [];
        return nodes.filter((n) => nodeMatchesQuery(n, trimmedSearch)).map((n) => n.id);
    }, [nodes, trimmedSearch]);
    const matchedSet = useMemo(() => new Set(matchedIds), [matchedIds]);
    const keep = useMemo(() => new Set([...(marks?.keys() ?? []), ...flagged.keys(), ...uncostedSteps(plan).map((n) => n.id), ...matchedIds]), [marks, flagged, plan, matchedIds]);
    const [expanded, setExpanded] = useState(() => {
        const open = pathTo(plan.root, target);
        keep.forEach((id) => pathTo(plan.root, id).forEach((n) => open.add(n)));
        return open;
    });
    useEffect(() => {
        if (matchedIds.length === 0)
            return;
        setMatchCursor(0);
        setExpanded((prev) => {
            const next = new Set(prev);
            matchedIds.forEach((id) => pathTo(plan.root, id).forEach((anc) => next.add(anc)));
            return next;
        });
    }, [matchedIds, plan.root]);
    const [selected, setSelected] = useState(target);
    const [ownZoom, setOwnZoom] = useState(initialZoom ?? 1);
    const zoom = props.zoom ?? ownZoom;
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
    const setZoom = useCallback((next) => {
        const value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, typeof next === "function" ? next(zoomRef.current) : next));
        setOwnZoom(value);
        onZoomChange?.(value);
    }, [onZoomChange]);
    const [fitted, setFitted] = useState(initialZoom != null || props.zoom != null);
    const scroller = useRef(null);
    const [isPanning, setIsPanning] = useState(false);
    const panState = useRef({
        active: false,
        moved: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
    });
    const suppressClick = useRef(false);
    const hot = useMemo(() => pathTo(plan.root, target), [plan.root, target]);
    const { boxes, folds, parentOf, rootVia, width, height } = useMemo(() => layout(plan.root, total, expanded, keep, estimates, (n) => shares.statedSubtree.get(n.id) ?? null), [plan.root, total, expanded, keep, estimates, shares]);
    const [minimapPref, setMinimapPref] = useState(null);
    const autoMinimap = props.showMinimap ?? (!bare && boxes.length >= 6);
    const showMinimap = minimapPref ?? autoMinimap;
    const [viewport, setViewport] = useState({ left: 0, top: 0, clientW: 0, clientH: 0 });
    const byId = new Map(boxes.map((b) => [b.node.id, b]));
    const maxRows = Math.max(1, ...nodes.map((node) => rowsOut(plan, node) ?? 0));
    const maxReads = Math.max(1, ...nodes.map((node) => nodeReadsValue(node) ?? 0));
    const stroke = (r) => 1.5 + 4.5 * (Math.log10(r + 1) / Math.log10(maxRows + 1));
    const selectedNode = nodes.find((n) => n.id === selected) ?? null;
    // Lens metric projection per card
    const lensValue = useCallback((n) => {
        if (lens === "time") {
            const s = shares.stated.get(n.id) ?? null;
            return { ratio: s, text: s != null ? percent(s) : null };
        }
        if (lens === "cost") {
            const s = operatorView(plan, n)?.cost_share ?? (total > 0 ? n.self_cost / total : null);
            return { ratio: s, text: s != null ? percent(s) : null };
        }
        if (lens === "rows") {
            const r = rowsOut(plan, n);
            return { ratio: r != null ? r / maxRows : null, text: r != null ? rows(r) : null };
        }
        const rd = nodeReadsValue(n);
        return { ratio: rd != null ? rd / maxReads : null, text: rd != null ? rows(rd) : null };
    }, [lens, shares.stated, plan, total, maxRows, maxReads]);
    const syncViewport = useCallback(() => {
        const el = scroller.current;
        if (!el)
            return;
        setViewport({ left: el.scrollLeft, top: el.scrollTop, clientW: el.clientWidth, clientH: el.clientHeight });
    }, []);
    const fit = useCallback(() => {
        const box = scroller.current?.getBoundingClientRect();
        if (!box || box.width === 0)
            return;
        setZoom(Math.max(MIN_FIT, Math.min(1, (box.width - 8) / width)));
    }, [width, setZoom]);
    useLayoutEffect(() => {
        if (fitted)
            return;
        fit();
        setFitted(true);
    }, [fit, fitted]);
    useEffect(() => {
        syncViewport();
        const el = scroller.current;
        if (!el)
            return;
        el.addEventListener("scroll", syncViewport, { passive: true });
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncViewport) : null;
        ro?.observe(el);
        return () => {
            el.removeEventListener("scroll", syncViewport);
            ro?.disconnect();
        };
    }, [syncViewport, zoom, width, height]);
    // Ctrl/Cmd + wheel / trackpad pinch zoom anchored at cursor
    useEffect(() => {
        const el = scroller.current;
        if (!el)
            return;
        const onWheel = (e) => {
            if (!e.ctrlKey && !e.metaKey)
                return;
            e.preventDefault();
            const prevZoom = zoomRef.current;
            const factor = Math.exp(-e.deltaY * 0.0025);
            const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(prevZoom * factor).toFixed(3)));
            if (nextZoom === prevZoom)
                return;
            const rect = el.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;
            const worldX = (el.scrollLeft + cursorX) / prevZoom;
            const worldY = (el.scrollTop + cursorY) / prevZoom;
            setZoom(nextZoom);
            requestAnimationFrame(() => {
                el.scrollLeft = Math.max(0, worldX * nextZoom - cursorX);
                el.scrollTop = Math.max(0, worldY * nextZoom - cursorY);
            });
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [setZoom]);
    // Compatible across React 18 and React 19 (replaces React 19.2-only useEffectEvent).
    const followSelectionRef = useRef(() => { });
    followSelectionRef.current = (id) => {
        if (!nodes.some((n) => n.id === id))
            return;
        const node = nodes.find((n) => n.id === id);
        const visibleId = byId.has(id) || !node ? id : drawn(node, total, keep).node.id;
        setSelected(visibleId);
        setExpanded((prev) => new Set([...prev, ...pathTo(plan.root, visibleId)]));
    };
    useEffect(() => {
        if (selectedId != null)
            followSelectionRef.current(selectedId);
    }, [selectedId]);
    useEffect(() => {
        const canvas = scroller.current;
        const el = canvas?.querySelector(`[data-node="${selected}"]`);
        if (!canvas || !el)
            return;
        const c = canvas.getBoundingClientRect();
        const e = el.getBoundingClientRect();
        if (e.top < c.top || e.bottom > c.bottom)
            canvas.scrollTop += e.top - c.top - (c.height - e.height) / 2;
        if (e.left < c.left || e.right > c.right)
            canvas.scrollLeft += e.left - c.left - (c.width - e.width) / 2;
    }, [selected, zoom]);
    const edges = [];
    boxes.forEach((b) => {
        const parent = parentOf.get(b.node.id);
        const to = parent != null ? byId.get(parent) : undefined;
        if (to) {
            edges.push({
                from: b,
                to,
                rows: rowsOut(plan, b.node) ?? 0,
                hot: hot.has(b.node.id) && hot.has(to.node.id),
                key: `${to.node.id}-${b.node.id}`,
                via: b.via,
            });
        }
    });
    folds.forEach((f) => {
        const parent = byId.get(f.parent);
        if (parent)
            edges.push({ from: f, to: parent, rows: 0, hot: false, key: f.id, via: [] });
    });
    const select = (id) => {
        setSelected(id);
        onSelect?.(id);
    };
    const stepMatch = (delta) => {
        if (matchedIds.length === 0)
            return;
        const nextIdx = (matchCursor + delta + matchedIds.length) % matchedIds.length;
        setMatchCursor(nextIdx);
        const id = matchedIds[nextIdx];
        if (id != null)
            select(id);
    };
    const handlePointerDown = (e) => {
        if (e.button !== 0 || !scroller.current)
            return;
        panState.current = {
            active: true,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
            scrollLeft: scroller.current.scrollLeft,
            scrollTop: scroller.current.scrollTop,
        };
    };
    const handlePointerMove = (e) => {
        const st = panState.current;
        const el = scroller.current;
        if (!st.active || !el)
            return;
        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        if (!st.moved && Math.hypot(dx, dy) > 5) {
            st.moved = true;
            suppressClick.current = true;
            setIsPanning(true);
        }
        if (st.moved) {
            el.scrollLeft = st.scrollLeft - dx;
            el.scrollTop = st.scrollTop - dy;
        }
    };
    const endPan = () => {
        if (!panState.current.active)
            return;
        panState.current.active = false;
        setIsPanning(false);
        if (suppressClick.current) {
            setTimeout(() => {
                suppressClick.current = false;
            }, 0);
        }
    };
    const lensLabel = (l) => {
        switch (l) {
            case "time":
                return t("ui.plan_diagram.lens.time");
            case "cost":
                return t("ui.plan_diagram.lens.cost");
            case "rows":
                return t("ui.plan_diagram.lens.rows");
            case "reads":
                return t("ui.plan_diagram.lens.reads");
        }
    };
    // Minimap geometry
    const mmMaxW = 152;
    const mmMaxH = 104;
    const mmScale = Math.min(mmMaxW / Math.max(1, width), mmMaxH / Math.max(1, height));
    const mmW = Math.max(64, Math.round(width * mmScale));
    const mmH = Math.max(44, Math.round(height * mmScale));
    const panFromMinimap = (e) => {
        const el = scroller.current;
        if (!el)
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        const worldX = (e.clientX - rect.left) / mmScale;
        const worldY = (e.clientY - rect.top) / mmScale;
        el.scrollLeft = Math.max(0, worldX * zoom - el.clientWidth / 2);
        el.scrollTop = Math.max(0, worldY * zoom - el.clientHeight / 2);
    };
    const scrollStyle = customHeight != null
        ? { height: typeof customHeight === "number" ? `${customHeight}px` : customHeight, maxHeight: "none" }
        : undefined;
    return (_jsxs("div", { className: `culprit-pv plan ${bare ? "bare" : ""} ${customHeight != null ? "has-height" : ""} ${className ?? ""}`, "data-theme": theme && theme !== "system" ? theme : undefined, children: [showHeader && (_jsxs("div", { className: "plan-head", children: [badge && _jsx("span", { className: "side-badge", children: badge }), _jsx("span", { className: "tag", children: kindLabel ?? planKindLabel(plan) }), _jsxs("span", { children: [t("ui.common.plan_operators", { count: nodes.length }), estimates && ` · ${plan.facts.estimated_cost_unavailable ? t("ui.common.plan_cost_unavailable") : t("ui.common.plan_cost", { cost: cost(planCost) })}`] }), plan.warnings.length > 0 && (_jsxs("span", { className: "warn-chip", children: [_jsx(TriangleAlert, { size: 11 }), " ", t("ui.plan_diagram.plan_warnings", { count: plan.warnings.length })] })), _jsx("span", { className: "spacer" }), availableLenses.length > 1 && (_jsx("span", { className: "seg plan-lens", role: "group", "aria-label": t("ui.plan_diagram.lens.label"), children: availableLenses.map((item) => (_jsx("button", { type: "button", className: lens === item ? "on" : "", onClick: () => setLens(item), children: lensLabel(item) }, item))) })), _jsxs("div", { className: "search plan-search", children: [_jsx(Search, { size: 12 }), _jsx("input", { value: searchText, placeholder: t("ui.plan_diagram.search_placeholder"), onChange: (e) => setSearchText(e.target.value), onKeyDown: (e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        stepMatch(e.shiftKey ? -1 : 1);
                                    }
                                    else if (e.key === "Escape" && searchText) {
                                        e.preventDefault();
                                        setSearchText("");
                                    }
                                } }), trimmedSearch && (_jsxs(_Fragment, { children: [_jsx("span", { className: "plan-search-count num", children: matchedIds.length > 0
                                            ? t("ui.plan_diagram.search_matches", { current: String(matchCursor + 1), total: String(matchedIds.length) })
                                            : t("ui.plan_diagram.search_none") }), matchedIds.length > 1 && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "plan-search-btn", title: t("ui.plan_diagram.search_prev"), onClick: () => stepMatch(-1), children: _jsx(ChevronUp, { size: 12 }) }), _jsx("button", { type: "button", className: "plan-search-btn", title: t("ui.plan_diagram.search_next"), onClick: () => stepMatch(1), children: _jsx(ChevronDown, { size: 12 }) })] })), _jsx("button", { type: "button", className: "plan-search-btn", title: t("ui.plan_diagram.search_clear"), onClick: () => setSearchText(""), children: _jsx(X, { size: 12 }) })] }))] }), showControls && (_jsx(ZoomControls, { zoom: zoom, setZoom: setZoom, fit: fit, showMinimap: showMinimap, onToggleMinimap: () => setMinimapPref((prev) => !(prev ?? autoMinimap)) }))] })), showActualSummary && plan.kind === "actual" && _jsx(ActualSummary, { plan: plan, onPick: select }), showCostStrip && _jsx(CostStrip, { plan: plan, query: query, focus: focus, onPick: select }), _jsxs("div", { className: "diagram-wrap", onKeyDown: (e) => {
                    if (e.target?.tagName === "INPUT")
                        return;
                    if (e.key === "+" || e.key === "=") {
                        e.preventDefault();
                        setZoom((z) => +(z + 0.15).toFixed(2));
                    }
                    else if (e.key === "-") {
                        e.preventDefault();
                        setZoom((z) => +(z - 0.15).toFixed(2));
                    }
                    else if (e.key === "0") {
                        e.preventDefault();
                        fit();
                    }
                }, children: [!showHeader && showControls && (_jsx("div", { className: "diagram-float", children: _jsx(ZoomControls, { zoom: zoom, setZoom: setZoom, fit: fit, showMinimap: showMinimap, onToggleMinimap: () => setMinimapPref((prev) => !(prev ?? autoMinimap)) }) })), _jsx("div", { className: `diagram-scroll can-pan ${isPanning ? "is-panning" : ""}`, style: scrollStyle, ref: scroller, title: isPanning ? undefined : t("ui.plan_diagram.pan_hint"), onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: endPan, onPointerCancel: endPan, onPointerLeave: endPan, onClickCapture: (e) => {
                            if (suppressClick.current) {
                                e.stopPropagation();
                                e.preventDefault();
                                suppressClick.current = false;
                            }
                        }, children: _jsx("div", { className: `diagram ${trimmedSearch ? "has-search" : ""}`, style: { width: width * zoom, height: height * zoom }, children: _jsxs("div", { style: { width, height, transform: `scale(${zoom})`, transformOrigin: "0 0", position: "relative" }, children: [_jsxs("svg", { width: width, height: height, className: "diagram-edges", "aria-hidden": "true", children: [_jsxs("defs", { children: [_jsx("marker", { id: "pd-arrow", viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "8", markerHeight: "8", markerUnits: "userSpaceOnUse", orient: "auto-start-reverse", children: _jsx("path", { d: "M0,0 L8,4 L0,8 z", className: "pd-arrow" }) }), _jsx("marker", { id: "pd-arrow-hot", viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "8", markerHeight: "8", markerUnits: "userSpaceOnUse", orient: "auto-start-reverse", children: _jsx("path", { d: "M0,0 L8,4 L0,8 z", className: "pd-arrow hot" }) })] }), edges.map((e) => {
                                                const x1 = px(e.from.x) + CARD_W / 2;
                                                const y1 = py(e.from.y);
                                                const x2 = px(e.to.x) + CARD_W / 2;
                                                const y2 = py(e.to.y) + CARD_H + 3;
                                                const mid = (y1 + y2) / 2;
                                                const label = e.rows > 0 ? t("ui.plan_diagram.edge_rows", { n: rows(e.rows) === "1" ? 1 : e.rows, rows: rows(e.rows) }) : "";
                                                const via = e.via.length ? t("ui.plan_diagram.via", { operators: e.via.join(", ") }) : "";
                                                const text = [label, via].filter(Boolean).join(" · ");
                                                const w = text.length * 5.9 + 12;
                                                const lx = (x1 + x2) / 2 + (x1 <= x2 ? -w - 8 : 8);
                                                return (_jsxs("g", { children: [_jsx("path", { d: `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`, fill: "none", className: `pd-edge ${e.hot ? "hot" : ""}`, strokeWidth: e.rows ? stroke(e.rows) : 1.5, strokeDasharray: e.rows ? undefined : "4 4", markerEnd: `url(#${e.hot ? "pd-arrow-hot" : "pd-arrow"})` }), text && (_jsxs("g", { transform: `translate(${lx} ${mid - 9})`, className: "edge-pill", children: [_jsx("rect", { width: w, height: 18, rx: 9 }), _jsx("text", { x: w / 2, y: 12.5, textAnchor: "middle", children: text })] }))] }, e.key));
                                            })] }), _jsxs("div", { className: "diagram-result", style: { left: px(boxes.find((b) => !parentOf.has(b.node.id))?.x ?? 0), top: PAD - 4, width: CARD_W }, children: [t("ui.plan_diagram.result"), rootVia.length ? ` · ${t("ui.plan_diagram.via", { operators: rootVia.join(", ") })}` : ""] }), boxes.map((b) => {
                                        const lv = lensValue(b.node);
                                        return (_jsx(PlanCard, { plan: plan, estimates: estimates || lens === "rows" || lens === "reads", node: b.node, share: lv.ratio, badgeText: lv.text, ownMs: shares.ms.get(b.node.id), x: px(b.x), y: py(b.y), hot: hot.has(b.node.id), hottest: b.node.id === hottest?.id && (shareOf(b.node) ?? 0) >= 0.05, matched: matchedSet.has(b.node.id), noShare: shares.basis === "cost" ? reason(b.node) : null, selected: b.node.id === selected, mark: marks?.get(b.node.id), tint: tints?.get(b.node.id), insights: flagged.get(b.node.id), onSelect: () => select(b.node.id) }, b.node.id));
                                    }), overlay && boxes.map((b) => _jsx("span", { children: overlay(b.node, { x: px(b.x), y: py(b.y), w: CARD_W, h: CARD_H }) }, `overlay-${b.node.id}`)), folds.map((f) => (_jsxs("button", { type: "button", className: "fold-pill", style: { left: px(f.x) + CARD_W / 2 - 78, top: py(f.y) + CARD_H / 2 - 14 }, title: t("ui.plan_diagram.fold_title"), onClick: () => {
                                            const parent = nodes.find((n) => n.id === f.parent);
                                            if (parent)
                                                setExpanded((prev) => new Set([...prev, ...parent.children.map((c) => drawn(c, total, keep).node.id)]));
                                        }, children: [t("ui.plan_diagram.cheap_operators", { count: f.count }), f.share != null && ` · ${percent(f.share)}`] }, f.id)))] }) }) }), showMinimap && (_jsx("div", { className: "diagram-minimap", "aria-label": t("ui.plan_diagram.minimap_label"), children: _jsxs("svg", { width: mmW, height: mmH, viewBox: `0 0 ${mmW} ${mmH}`, onPointerDown: (e) => {
                                e.stopPropagation();
                                e.currentTarget.setPointerCapture?.(e.pointerId);
                                panFromMinimap(e);
                            }, onPointerMove: (e) => {
                                if (e.buttons === 1)
                                    panFromMinimap(e);
                            }, children: [boxes.map((b) => {
                                    const lv = lensValue(b.node).ratio ?? 0;
                                    const fill = heat(lv) === "transparent" ? "var(--border-strong)" : heat(lv);
                                    const isSel = b.node.id === selected;
                                    const isMatch = matchedSet.has(b.node.id);
                                    return (_jsx("rect", { x: px(b.x) * mmScale, y: py(b.y) * mmScale, width: Math.max(6, CARD_W * mmScale), height: Math.max(4, CARD_H * mmScale), rx: 2, fill: fill, stroke: isSel ? "var(--focus)" : isMatch ? "var(--brand)" : "none", strokeWidth: isSel || isMatch ? 1.5 : 0 }, b.node.id));
                                }), viewport.clientW > 0 && (_jsx("rect", { className: "mm-viewport", x: Math.max(0, (viewport.left / zoom) * mmScale), y: Math.max(0, (viewport.top / zoom) * mmScale), width: Math.min(mmW, (viewport.clientW / zoom) * mmScale), height: Math.min(mmH, (viewport.clientH / zoom) * mmScale), rx: 3 }))] }) }))] }), selectedNode && props.showProps !== false && (_jsx(NodeDetails, { plan: plan, estimates: estimates, actual: plan.kind === "actual", node: selectedNode, share: shareOf(selectedNode), subtreeShare: shares.statedSubtree.get(selectedNode.id) ?? null, noShare: shares.basis === "cost" ? reason(selectedNode) : null, insights: flagged.get(selectedNode.id) }))] }));
}
function ZoomControls({ zoom, setZoom, fit, showMinimap, onToggleMinimap, }) {
    return (_jsxs("span", { className: "zoom", children: [_jsx("button", { type: "button", className: "btn icon ghost", title: t("ui.plan_diagram.zoom_out"), onClick: () => setZoom((z) => +(z - 0.15).toFixed(2)), children: _jsx(Minus, { size: 13 }) }), _jsxs("span", { className: "zoom-level", children: [Math.round(zoom * 100), "%"] }), _jsx("button", { type: "button", className: "btn icon ghost", title: t("ui.plan_diagram.zoom_in"), onClick: () => setZoom((z) => +(z + 0.15).toFixed(2)), children: _jsx(Plus, { size: 13 }) }), _jsx("button", { type: "button", className: "btn icon ghost", title: t("ui.plan_diagram.fit"), onClick: fit, children: _jsx(Scan, { size: 13 }) }), _jsx("button", { type: "button", className: "btn icon ghost", title: t("ui.plan_diagram.actual_size"), onClick: () => setZoom(() => 1), children: _jsx(Maximize2, { size: 12 }) }), onToggleMinimap && (_jsx("button", { type: "button", className: `btn icon ghost ${showMinimap ? "on" : ""}`, "aria-pressed": showMinimap, title: t("ui.plan_diagram.minimap_toggle"), onClick: onToggleMinimap, children: _jsx(MapIcon, { size: 12 }) }))] }));
}
function PlanCard(props) {
    const { plan, node, x, y, hot, hottest, matched, selected, mark, insights, tint, ownMs, estimates, onSelect, noShare, badgeText } = props;
    const share = props.share ?? 0;
    const mis = node.warnings.includes("misestimate") ? misestimate(plan, node) : null;
    const table = node.object?.split(".").pop();
    const worst = insights?.[0];
    const tip = [
        node.op,
        node.predicate ? predicateLabel("filter", node.predicate) : node.seek_predicate ? predicateLabel("seek", node.seek_predicate) : "",
        estimates && props.share == null ? noShare ?? "" : "",
        ...(insights ?? []).map((i) => `• ${i.title}`),
    ]
        .filter(Boolean)
        .join("\n");
    return (_jsxs("button", { type: "button", "data-node": node.id, "data-tint": tint, className: `plan-card ${selected ? "sel" : ""} ${hot ? "hot" : ""} ${matched ? "match" : ""} ${mark ? `mark-${mark}` : ""} ${worst ? `flag-${worst.severity}` : ""}`, style: {
            left: x,
            top: y,
            width: CARD_W,
            height: CARD_H,
            ["--heat"]: heat(share),
            ["--share"]: `${Math.max(share > 0 ? 3 : 0, Math.min(100, share * 100))}%`,
        }, onClick: onSelect, title: tip, "aria-label": [
            table ? t("ui.plan_diagram.card_on", { operator: node.op, table }) : node.op,
            estimates && badgeText != null ? t("ui.plan_diagram.card_share", { share: badgeText }) : "",
            worst ? t("ui.plan_diagram.card_issues", { count: insights.length }) : "",
        ]
            .filter(Boolean)
            .join(", "), children: [_jsxs("span", { className: "pc-top", children: [_jsx("span", { className: "pc-icon", children: _jsx(OpIcon, { node: node, size: 14 }) }), _jsx("span", { className: `pc-op ${compactOp(node.op).length > 13 ? "long" : ""}`, title: node.op, children: compactOp(node.op) }), estimates && (_jsxs("span", { className: "pc-share", children: [hottest && _jsx(Flame, { size: 11, color: "var(--heat-4)" }), badgeText ?? "-"] }))] }), _jsx("span", { className: "pc-obj mono", children: table ? `${table}${node.index ? ` · ${node.index}` : ""}` : node.detail ?? "\u00a0" }), _jsxs("span", { className: "pc-rows", children: [node.act_rows != null ? (_jsxs(_Fragment, { children: [rows(estRowsForRuns(plan, node)), " \u2192 ", _jsx("b", { children: rows(node.act_rows) }), mis != null && _jsxs("span", { className: "mis", children: ["\u00D7", rows(Math.abs(mis))] })] })) : estimates && !node.facts.estimated_rows_unavailable ? (_jsx(_Fragment, { children: t("ui.plan_diagram.estimated_rows", { rows: rows(estRows(plan, node)) }) })) : (node.seek_predicate && (_jsx("span", { className: "muted mono pc-seek", title: node.seek_predicate, children: node.seek_predicate }))), (ownMs ?? node.act_time_ms) != null && _jsxs("span", { className: "muted", children: [" \u00B7 ", duration(ownMs ?? node.act_time_ms)] }), node.warnings.length > 0 && !worst && _jsx(TriangleAlert, { size: 11, color: "var(--medium-text)", style: { marginLeft: 3 } }), mark && _jsx("span", { className: `pc-mark ${mark}`, children: MARK_LABEL[mark]() })] }), worst && (_jsx("span", { className: `pc-flag ${worst.severity}`, title: insights.map((i) => i.title).join("\n"), children: insights.length }))] }));
}
