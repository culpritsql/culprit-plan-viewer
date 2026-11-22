import { type ReactNode } from "react";
import { type PlanLook } from "./PlanSurface.js";
import type { Plan, QueryStat } from "./types.js";
export type PlanViewerTheme = "light" | "dark" | "system";
export type PlanViewerProps = {
    plan: Plan;
    query?: QueryStat | null;
    focus?: number | null;
    /** Controlled view mode ("diagram" | "tree" | "operations"). */
    look?: PlanLook;
    /** Initial view mode when uncontrolled. Defaults to "diagram". */
    defaultLook?: PlanLook;
    onLookChange?: (look: PlanLook) => void;
    /** Render the built-in header bar with engine/kind metadata and the Diagram · Tree · Operations switcher. Defaults to true. */
    showToolbar?: boolean;
    /** Show the parsed SQL statement above the plan when available. Defaults to true. */
    showStatement?: boolean;
    /** Optional title displayed in the toolbar. */
    title?: string;
    /** Optional slot rendered at the end of the toolbar (for export/share buttons). */
    toolbarActions?: ReactNode;
    /** Optional explicit color theme ("light" | "dark" | "system"). */
    theme?: PlanViewerTheme;
    className?: string;
};
/**
 * Drop-in execution plan viewer: bottleneck insights, measured-run summary, cost/time strip,
 * interactive Diagram / Tree / Operations views, and operator property inspector.
 */
export declare function PlanViewer({ plan, query, focus, look: controlledLook, defaultLook, onLookChange, showToolbar, showStatement, title, toolbarActions, theme, className, }: PlanViewerProps): import("react").JSX.Element;
