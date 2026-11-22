import { planKindLabel, predicateLabel, shortPredicate } from "./host.js";
import type { PlanViewerTheme } from "./PlanViewer.js";
import type { Plan, PlanInsight, PlanNode, QueryStat } from "./types.js";
export { planKindLabel, predicateLabel, shortPredicate };
type Props = {
    plan: Plan;
    query?: QueryStat | null;
    focus?: number | null;
    compact?: boolean;
    selectedId?: number | null;
    onSelect?: (id: number) => void;
    showHeader?: boolean;
    showActualSummary?: boolean;
    showProps?: boolean;
    showInsights?: boolean;
    theme?: PlanViewerTheme;
    className?: string;
};
export declare function PlanView({ plan, query, focus, compact, selectedId, onSelect, showHeader, showActualSummary, showProps, showInsights, theme, className, }: Props): import("react").JSX.Element;
/** Alias of PlanView for ergonomic granular imports alongside PlanCanvas. */
export declare const PlanTree: typeof PlanView;
/** The operator detail panel; kept under this name for existing callers. */
export declare function NodeProps({ node, share, insights }: {
    node: PlanNode;
    share: number | null;
    insights?: PlanInsight[];
}): import("react").JSX.Element;
