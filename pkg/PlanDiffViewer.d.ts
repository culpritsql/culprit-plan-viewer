import { type ReactNode } from "react";
import type { PlanViewerTheme } from "./PlanViewer.js";
import type { Plan, PlanDiff, PlanNode, QueryStat } from "./types.js";
export type PlanDiffLook = "diagram" | "tree";
export type PlanDiffViewerProps = {
    a: Plan;
    b: Plan;
    diff: PlanDiff;
    nameA?: string;
    nameB?: string;
    queryA?: QueryStat | null;
    queryB?: QueryStat | null;
    defaultLook?: PlanDiffLook;
    defaultSync?: boolean;
    toolbarStart?: ReactNode;
    toolbarActions?: ReactNode;
    theme?: PlanViewerTheme;
    className?: string;
};
/**
 * Side-by-side execution plan comparison viewer: verdict summary, structural & access-path changes,
 * root-cause scenarios, operator property diff table, and synchronized dual-plan pan/zoom.
 */
export declare function PlanDiffViewer({ a, b, diff, nameA, nameB, queryA, queryB, defaultLook, defaultSync, toolbarStart, toolbarActions, theme, className, }: PlanDiffViewerProps): import("react").JSX.Element;
export declare function PropsCompare({ a, b, planA, planB, names, }: {
    a: PlanNode | null;
    b: PlanNode | null;
    planA: Plan;
    planB: Plan;
    names: [string, string];
}): import("react").JSX.Element;
