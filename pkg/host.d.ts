import { type KeyboardEvent, type ReactNode } from "react";
import { type ViewerLocaleMeta } from "./defaults.js";
import type { Engine, Guess, Plan, PlanInsight, PlanNode, PlanOperatorView, QueryStat } from "./types.js";
export type MessageArgs = Record<string, string | number>;
export type PlanViewerI18nAdapter = {
    t: (key: string, args?: MessageArgs) => string;
    locale: () => ViewerLocaleMeta;
    language: () => string;
    subscribe: (listener: () => void) => () => void;
};
export type PlanViewerClipboardHandler = (text: string, message?: string) => Promise<boolean> | boolean | void;
/** Plug in the host application's live localization store (used by Culprit's desktop UI). */
export declare function bindPlanViewerI18n(adapter: PlanViewerI18nAdapter | null): void;
/** Plug in the host application's clipboard and toast notification handler. */
export declare function bindPlanViewerClipboard(handler: PlanViewerClipboardHandler | null): void;
export declare function locale(): ViewerLocaleMeta;
export declare function language(): string;
export declare function useLanguage(): string;
export declare function t(key: string, args?: MessageArgs): string;
export declare function copyAndTell(text: string, message?: string): Promise<boolean>;
export declare function slot(i: number): string;
export declare function withElements(message: string, elements: ReactNode[]): ReactNode;
export declare function tx(key: string, args: MessageArgs, elements: Record<string, ReactNode>): ReactNode;
export declare function canPlanEstimates(engine: Engine): boolean;
export declare function genericPlanContextKey(engine: Engine): string;
export declare function serverName(engine: Engine, product?: string | null): string;
export declare function planEngineName(plan: Pick<Plan, "engine" | "props">): string;
export declare function digits(text: string): string;
export declare function dateLocale(): string;
export declare function duration(ms: number | null | undefined): string;
export declare function count(value: number | null | undefined): string;
export declare function rowCount(value: number | null | undefined): string;
export declare function percent(ratio: number | null | undefined): string;
export declare function when(iso: string | null | undefined, now?: Date): {
    short: string;
    full: string;
};
export type SqlToken = {
    kind: "k" | "s" | "n" | "c" | "p" | "t";
    text: string;
};
export declare function tokenizeSql(sql: string): SqlToken[];
export declare function prettySql(sql: string): string;
export declare function tabListKeys(e: KeyboardEvent<HTMLElement>): void;
export declare function rememberedChoice<T extends string>(key: string, fallback: T, allowed: readonly T[]): T;
export declare function remember(key: string, value: string | null): void;
export declare function allNodes(n: PlanNode, out?: PlanNode[]): PlanNode[];
export declare function operatorView(plan: Plan | null | undefined, node: PlanNode): PlanOperatorView | null;
export declare const costBasis: (plan: Plan) => number;
export declare const uncostedSteps: (plan: Plan) => PlanNode[];
export declare const stepShare: (plan: Plan, node: PlanNode) => number | null;
export declare const guesses: (plan: Plan) => Map<number, Guess>;
export declare function statedInsightShare(plan: Plan, insight: PlanInsight): number | null;
export declare function noShareReason(plan: Plan, node: PlanNode, query?: QueryStat | null): string | null;
export declare function findingNoShareReason(plan: Plan, node: PlanNode, query?: QueryStat | null): string | null;
export declare function sharesNote(plan: Plan, query?: QueryStat | null): string | null;
export declare const estRows: (plan: Plan | null | undefined, node: PlanNode) => number | null;
export declare const rowsOut: (plan: Plan | null | undefined, node: PlanNode) => number | null;
export declare const estRowsForRuns: (plan: Plan | null | undefined, node: PlanNode) => number | null;
export declare const operatorRuns: (plan: Plan | null | undefined, node: PlanNode) => number | null;
export declare const misestimate: (plan: Plan | null | undefined, node: PlanNode) => number | null;
export declare function exact(value: number | null): string;
export declare function cost(value: number): string;
export declare function rows(value: number | null): string;
export declare function propValue(value: string): string;
export declare function bySeverity(a: PlanInsight, b: PlanInsight): number;
export declare function insightsByNode(plan: Plan): Map<number, PlanInsight[]>;
export declare function isWrapper(n: PlanNode, total: number): boolean;
export declare function planKindLabel(plan: Pick<Plan, "kind">): string;
export declare function shortPredicate(text: string): string;
export declare function predicateLabel(kind: "filter" | "seek", predicate: string): string;
export type Shares = {
    basis: "time" | "cost";
    own: Map<number, number>;
    subtree: Map<number, number>;
    stated: Map<number, number | null>;
    statedSubtree: Map<number, number | null>;
    note: string | null;
    hottest: PlanNode | null;
    ms: Map<number, number>;
    total: number;
};
export declare function planShares(plan: Plan, query?: QueryStat | null): Shares;
export type ActualFacts = {
    triggers: {
        name: string;
        relation: string | null;
        ms: number;
        calls: number | null;
    }[];
    elapsedMs: number | null;
    cpuMs: number | null;
    logicalReads: number | null;
    physicalReads: number | null;
    rows: number | null;
    grantedKb: number | null;
    usedKb: number | null;
    spilled: boolean;
    spillPages: number;
    timed: boolean;
    slowest: {
        node: PlanNode;
        ms: number;
        share: number;
    } | null;
    worstEstimate: {
        node: PlanNode;
        factor: number;
    } | null;
    skew: {
        node: PlanNode;
        busiest: number;
        threads: number;
    } | null;
    lastRunAt: string | null;
    workers: number | null;
};
export declare function actualFacts(plan: Plan): ActualFacts | null;
