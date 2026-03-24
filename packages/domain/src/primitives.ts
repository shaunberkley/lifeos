export type Brand<T, B extends string> = T & { readonly __brand: B };

export type WorkspaceId = Brand<string, "WorkspaceId">;
export type ConnectionId = Brand<string, "ConnectionId">;
export type SourceEventId = Brand<string, "SourceEventId">;

export type DataClass = "public" | "private" | "restricted" | "derived";
