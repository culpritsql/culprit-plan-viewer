import type { Plan } from "./types.js";
/**
 * What a measured run cost, in words: how long it took, what it read, how much memory it was given and used, and the
 * operators that explain the time (slowest step, worst estimate, a worker doing most of the work, a spill).
 * Each callout selects its operator in the diagram.
 */
export declare function ActualSummary({ plan, onPick }: {
    plan: Plan;
    onPick?: (id: number) => void;
}): import("react").JSX.Element | null;
