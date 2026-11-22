import { type ReactNode } from "react";
import type { PlanViewerTheme } from "./PlanViewer.js";
import type { Deadlock, DeadlockFix, DeadlockPattern } from "./types.js";
export declare function deadlockPatternLabel(pattern: DeadlockPattern): string;
export declare function deadlockWhen(iso: string | null): {
    short: string;
    full: string;
};
export type DeadlockViewerProps = {
    deadlock: Deadlock;
    /** Optional renderer for linking a deadlock fix to a host finding card. */
    renderRelatedFinding?: (fix: DeadlockFix) => ReactNode;
    theme?: PlanViewerTheme;
    className?: string;
};
/**
 * Complete deadlock investigation view: pattern classification, timestamp, interactive lock-cycle SVG graph,
 * plain-language explanation, numbered SQL fixes, and involved session/process cards.
 */
export declare function DeadlockViewer({ deadlock, renderRelatedFinding, theme, className }: DeadlockViewerProps): import("react").JSX.Element;
