import type { DocdbMetrics } from "./types.js";
/** Native storage entries and RPCs retain their units; they are never PostgreSQL pages or CPU utilization. */
export declare function DocdbWork({ metrics, basis, runs }: {
    metrics?: DocdbMetrics | null;
    basis: "execution" | "loop" | "workload";
    runs?: number;
}): import("react").JSX.Element | null;
