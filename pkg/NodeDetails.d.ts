import type { PlanViewerTheme } from "./PlanViewer.js";
import type { Plan, PlanInsight, PlanNode } from "./types.js";
/** One operator, explained: what it does, its rows, cost, buffers/I/O, parallelism, warnings, then raw properties on demand. */
export declare function NodeDetails({ plan, node, share, subtreeShare, noShare, insights, estimates, actual, theme, className, }: {
    plan?: Plan;
    node: PlanNode;
    share: number | null;
    subtreeShare?: number | null;
    noShare?: string | null;
    insights?: PlanInsight[];
    estimates?: boolean;
    actual?: boolean;
    theme?: PlanViewerTheme;
    className?: string;
}): import("react").JSX.Element;
