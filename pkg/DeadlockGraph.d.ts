import type { PlanViewerTheme } from "./PlanViewer.js";
import type { Deadlock, DeadlockProcess } from "./types.js";
export declare function DeadlockGraph({ deadlock, onPick, showLegend, theme, className, }: {
    deadlock: Deadlock;
    onPick?: (process: DeadlockProcess) => void;
    showLegend?: boolean;
    theme?: PlanViewerTheme;
    className?: string;
}): import("react").JSX.Element;
