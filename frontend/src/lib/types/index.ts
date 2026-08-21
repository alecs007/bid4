/**
 * Barrel for the domain model. UI code imports from `@/lib/types` only —
 * never from a specific file — so DTOs can be regrouped without touching pages.
 */
export * from "./common";
export * from "./user";
export * from "./cause";
export * from "./auction";
export * from "./order";
export * from "./invoice";
export * from "./dispute";
export * from "./shipping";
