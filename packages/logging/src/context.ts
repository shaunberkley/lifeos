export interface LogContext {
  correlationId?: string;
  workspaceId?: string;
  connectionId?: string;
  runId?: string;
  deviceId?: string;
  requestId?: string;
  route?: string;
  method?: string;
}

export function mergeLogContext(
  base: LogContext,
  next: LogContext | undefined,
): LogContext | undefined {
  if (!next) {
    return Object.keys(base).length > 0 ? base : undefined;
  }

  const merged = { ...base, ...next };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function getCorrelationId(
  candidate: string | null | undefined,
  factory: () => string = () => crypto.randomUUID(),
): string {
  const normalized = candidate?.trim();
  return normalized && normalized.length > 0 ? normalized : factory();
}
