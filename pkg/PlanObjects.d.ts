import type { Plan, QueryStat } from "./types.js";
export declare function PlanObjects({ plan, query, selectedId, onSelect, }: {
    plan: Plan;
    query?: QueryStat | null;
    selectedId: number | null;
    onSelect: (id: number) => void;
}): import("react").JSX.Element;
