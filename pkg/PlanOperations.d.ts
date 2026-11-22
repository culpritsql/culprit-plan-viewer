import type { Plan, QueryStat } from "./types.js";
export declare function PlanOperations({ plan, query: statement, focus, selectedId, onSelect, }: {
    plan: Plan;
    query?: QueryStat | null;
    focus?: number | null;
    selectedId: number | null;
    onSelect: (id: number) => void;
}): import("react").JSX.Element;
