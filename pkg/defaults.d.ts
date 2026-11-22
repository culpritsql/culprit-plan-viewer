import type { Engine } from "./types.js";
export type ViewerEngineSpec = {
    label: string;
    abilities: {
        plan_estimates: boolean;
    };
    products: {
        id: string;
        label: string;
        prefix: string | null;
    }[];
    evidence_presentation: {
        generic_plan_context: string;
    };
};
export type ViewerLocaleMeta = {
    plural: string;
    decimal: string;
    group: string;
    direction?: "ltr" | "rtl";
};
export type CardinalRelation = [string, number, boolean, [number, number][]];
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";
export type CardinalCase = [PluralCategory, CardinalRelation[][]];
export declare const DEFAULT_ENGINES: Record<Engine, ViewerEngineSpec>;
export declare const DEFAULT_LOCALE: ViewerLocaleMeta;
export declare const DEFAULT_MESSAGES: Record<string, string>;
export declare const CARDINAL_LANGUAGES: Record<string, number>;
export declare const CARDINAL_RULES: CardinalCase[][];
