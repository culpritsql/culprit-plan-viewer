import type { Plan, QueryStat } from "./types.js";
export type PlanLook = "diagram" | "tree" | "operations" | "objects" | "raw";
export declare function rememberedLook(): PlanLook;
export declare function rememberLook(look: PlanLook): void;
/** Diagram · Tree · Operations · Tables · Raw. */
export declare function LookToggle({ look, onChange, hasRaw, }: {
    look: PlanLook;
    onChange: (look: PlanLook) => void;
    hasRaw?: boolean;
}): import("react").JSX.Element;
/**
 * A plan with everything Culprit knows about it: the insights first (what's wrong, how to fix it), then the plan in the
 * chosen view. Picking an insight selects its operator in whichever view is showing, and back.
 */
export declare function PlanSurface({ plan, query, focus, look, onLookChange, badge, }: {
    plan: Plan;
    query?: QueryStat | null;
    focus?: number | null;
    look: PlanLook;
    onLookChange?: (look: PlanLook) => void;
    badge?: string;
}): import("react").JSX.Element;
