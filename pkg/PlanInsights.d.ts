import type { Plan } from "./types.js";
export declare function PlanInsights({ plan, selectedNode, onSelectNode }: {
    plan: Plan;
    selectedNode?: number | null;
    onSelectNode: (id: number) => void;
}): import("react").JSX.Element | null;
