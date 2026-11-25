import type { PlanViewerTheme } from "./PlanViewer.js";
import type { ExtendedEventsBatch } from "./types.js";
export type ExtendedEventsFilter = "all" | "deadlock-report" | "error-reported" | "attention";
export type ExtendedEventsViewerProps = {
    batch: ExtendedEventsBatch;
    title?: string;
    defaultFilter?: ExtendedEventsFilter;
    theme?: PlanViewerTheme;
    className?: string;
};
/**
 * Interactive SQL Server Extended Events (`.xel` and XML) inspector:
 * filters `xml_deadlock_report`, `error_reported`, and `attention` records, preserves UTC vs offset-free timestamps,
 * surfaces partial/truncated block limits honestly, and embeds `DeadlockViewer` for captured deadlock graphs.
 */
export declare function ExtendedEventsViewer({ batch, title, defaultFilter, theme, className, }: ExtendedEventsViewerProps): import("react").JSX.Element;
