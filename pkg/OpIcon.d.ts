import { type LucideIcon } from "lucide-react";
import type { PlanNode } from "./types.js";
/** The operator families people recognize at a glance: a seek, a scan, a lookup, a hash or loop join, a sort. */
export declare function opIcon(node: Pick<PlanNode, "op" | "kind">): LucideIcon;
export declare function OpIcon({ node, size, color }: {
    node: Pick<PlanNode, "op" | "kind">;
    size?: number;
    color?: string;
}): import("react").JSX.Element;
