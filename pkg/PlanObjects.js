import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Database, KeyRound } from "lucide-react";
import { useMemo } from "react";
import { allNodes, canPlanEstimates, insightsByNode, percent, planShares, rows, rowsOut, t } from "./host.js";
const SEV_RANK = { high: 3, medium: 2, low: 1 };
export function PlanObjects({ plan, query, selectedId, onSelect, }) {
    const shares = useMemo(() => planShares(plan, query), [plan, query]);
    const flagged = useMemo(() => insightsByNode(plan), [plan]);
    const weighed = canPlanEstimates(plan.engine) || plan.kind === "actual";
    const rollups = useMemo(() => {
        const byObject = new Map();
        for (const node of allNodes(plan.root)) {
            if (!node.object)
                continue;
            const list = byObject.get(node.object) ?? [];
            list.push(node);
            byObject.set(node.object, list);
        }
        const items = [];
        for (const [object, nodes] of byObject) {
            const parts = object.split(".");
            const shortName = parts[parts.length - 1] ?? object;
            const schema = parts.length > 1 ? parts.slice(0, -1).join(".") : null;
            let share = 0;
            let hasShare = false;
            let scans = 0;
            let seeks = 0;
            let lookups = 0;
            let directTableScan = false;
            const indexSet = new Set();
            let rowsProduced = 0;
            let hasRows = false;
            let logicalReads = 0;
            let hasLogical = false;
            let physicalReads = 0;
            let hasPhysical = false;
            let rowsRead = 0;
            let hasRowsRead = false;
            const seenInsightRules = new Set();
            let warningCount = 0;
            let worst = null;
            const sortedOps = [...nodes].sort((a, b) => (shares.stated.get(b.id) ?? 0) - (shares.stated.get(a.id) ?? 0));
            for (const n of sortedOps) {
                const s = shares.stated.get(n.id);
                if (s != null) {
                    share += s;
                    hasShare = true;
                }
                if (n.kind === "scan") {
                    scans++;
                    if (!n.index)
                        directTableScan = true;
                }
                else if (n.kind === "seek") {
                    seeks++;
                }
                else if (n.kind === "lookup") {
                    lookups++;
                }
                if (n.index)
                    indexSet.add(n.index);
                const out = rowsOut(plan, n);
                if (out != null) {
                    rowsProduced += out;
                    hasRows = true;
                }
                if (n.runtime?.logical_reads != null) {
                    logicalReads += n.runtime.logical_reads;
                    hasLogical = true;
                }
                if (n.runtime?.physical_reads != null) {
                    physicalReads += n.runtime.physical_reads;
                    hasPhysical = true;
                }
                if (n.rows_read != null) {
                    rowsRead += n.rows_read;
                    hasRowsRead = true;
                }
                warningCount += n.warnings.length;
                if (n.warnings.length > 0 && !worst)
                    worst = "low";
                for (const ins of flagged.get(n.id) ?? []) {
                    seenInsightRules.add(`${ins.rule}:${ins.nodes.join(",")}`);
                    if (!worst || SEV_RANK[ins.severity] > SEV_RANK[worst])
                        worst = ins.severity;
                }
            }
            const hitRatio = hasLogical && logicalReads > 0 && hasPhysical
                ? Math.max(0, Math.min(1, (logicalReads - physicalReads) / logicalReads))
                : null;
            items.push({
                object,
                shortName,
                schema,
                operators: sortedOps,
                share: Math.min(1, share),
                hasShare: weighed && hasShare,
                scans,
                seeks,
                lookups,
                indexes: [...indexSet],
                directTableScan,
                rowsProduced: hasRows ? rowsProduced : null,
                reads: hasLogical ? logicalReads : hasRowsRead ? rowsRead : null,
                hitRatio,
                issues: seenInsightRules.size + warningCount,
                worst,
            });
        }
        return items.sort((a, b) => b.share - a.share || (b.reads ?? 0) - (a.reads ?? 0) || a.object.localeCompare(b.object));
    }, [plan, shares, flagged, weighed]);
    if (rollups.length === 0) {
        return (_jsx("div", { className: "culprit-pv ops", children: _jsx("div", { className: "empty", children: t("ui.plan_objects.none") }) }));
    }
    const hasReads = rollups.some((r) => r.reads != null);
    const hasHits = rollups.some((r) => r.hitRatio != null);
    const hasIssues = rollups.some((r) => r.issues > 0);
    return (_jsx("div", { className: "culprit-pv ops plan-objects", children: _jsx("div", { className: "ops-scroll", children: _jsxs("table", { className: "ops-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t("ui.plan_objects.table") }), _jsx("th", { children: t("ui.plan_objects.access") }), _jsx("th", { children: t("ui.plan_objects.indexes") }), weighed && _jsx("th", { className: "r", children: t("ui.plan_objects.share") }), _jsx("th", { className: "r", children: t("ui.plan_objects.rows_out") }), hasReads && _jsx("th", { className: "r", children: t("ui.plan_objects.reads") }), hasHits && _jsx("th", { className: "r", children: t("ui.plan_objects.cache_hit") }), hasIssues && _jsx("th", { className: "r", children: t("ui.plan_objects.issues") })] }) }), _jsx("tbody", { children: rollups.map((item) => {
                            const isSelected = item.operators.some((n) => n.id === selectedId);
                            const accessParts = [];
                            if (item.scans > 0)
                                accessParts.push(t("ui.plan_objects.scans_count", { n: item.scans, count: String(item.scans) }));
                            if (item.seeks > 0)
                                accessParts.push(t("ui.plan_objects.seeks_count", { n: item.seeks, count: String(item.seeks) }));
                            if (item.lookups > 0)
                                accessParts.push(t("ui.plan_objects.lookups_count", { n: item.lookups, count: String(item.lookups) }));
                            if (accessParts.length === 0) {
                                accessParts.push(t("ui.plan_objects.ops_count", { n: item.operators.length, count: String(item.operators.length) }));
                            }
                            return (_jsxs("tr", { className: isSelected ? "sel" : "", onClick: () => {
                                    if (item.operators[0])
                                        onSelect(item.operators[0].id);
                                }, children: [_jsx("td", { children: _jsxs("span", { className: "ops-name", children: [_jsx("span", { className: "ops-icon", children: _jsx(Database, { size: 13 }) }), _jsxs("span", { className: "ops-text", children: [_jsx("b", { className: "mono", children: item.shortName }), item.schema && _jsx("span", { className: "mono muted", children: item.schema })] })] }) }), _jsx("td", { children: _jsxs("div", { className: "po-access", children: [_jsx("span", { children: accessParts.join(" · ") }), item.operators.length > 1 && (_jsx("span", { className: "po-step-pills", children: item.operators.map((op) => (_jsx("button", { type: "button", className: `po-step-pill ${op.id === selectedId ? "on" : ""}`, onClick: (e) => {
                                                            e.stopPropagation();
                                                            onSelect(op.id);
                                                        }, children: op.op }, op.id))) }))] }) }), _jsx("td", { children: _jsxs("div", { className: "po-indexes", children: [item.indexes.map((ix) => (_jsxs("span", { className: "tag mono", children: [_jsx(KeyRound, { size: 10 }), " ", ix] }, ix))), item.directTableScan && _jsx("span", { className: "tag medium", children: t("ui.plan_objects.direct_table") })] }) }), weighed && (_jsx("td", { className: "r num", children: item.hasShare ? (_jsxs("span", { className: "ops-cost", children: [_jsx("span", { className: "ops-cost-bar", children: _jsx("span", { style: { width: `${Math.min(100, item.share * 100)}%` } }) }), percent(item.share)] })) : (_jsx("span", { className: "muted", children: "-" })) })), _jsx("td", { className: "r num", children: item.rowsProduced != null ? rows(item.rowsProduced) : _jsx("span", { className: "muted", children: "-" }) }), hasReads && _jsx("td", { className: "r num", children: item.reads != null ? rows(item.reads) : _jsx("span", { className: "muted", children: "-" }) }), hasHits && (_jsx("td", { className: "r num", children: item.hitRatio != null ? (_jsx("span", { className: item.hitRatio < 0.8 ? "ops-err bad" : "", children: percent(item.hitRatio) })) : (_jsx("span", { className: "muted", children: "-" })) })), hasIssues && (_jsx("td", { className: "r num", children: item.issues > 0 ? _jsx("span", { className: `ops-issues ${item.worst ?? ""}`, children: item.issues }) : _jsx("span", { className: "muted", children: "-" }) }))] }, item.object));
                        }) })] }) }) }));
}
