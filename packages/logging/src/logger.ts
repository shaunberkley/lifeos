import { type LogContext, mergeLogContext } from "./context";
import { type SerializedError, serializeError } from "./errors";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogEvent = {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly service: string;
  readonly message: string;
  readonly context?: LogContext;
  readonly data?: Record<string, unknown>;
  readonly error?: SerializedError;
};

export type Logger = {
  child(context: LogContext): Logger;
  debug(message: string, options?: LogOptions): void;
  info(message: string, options?: LogOptions): void;
  warn(message: string, options?: LogOptions): void;
  error(message: string, options?: LogOptions): void;
};

type LogOptions = {
  readonly context?: LogContext;
  readonly data?: Record<string, unknown>;
  readonly error?: unknown;
};

type LoggerOptions = {
  readonly service: string;
  readonly baseContext?: LogContext;
  readonly sink?: (event: LogEvent) => void;
  readonly now?: () => string;
};

function defaultSink(event: LogEvent) {
  const line = `${JSON.stringify(event)}\n`;

  if (event.level === "error") {
    process.stderr.write(line);
    return;
  }

  process.stdout.write(line);
}

export function createLogger(options: LoggerOptions): Logger {
  const sink = options.sink ?? defaultSink;
  const now = options.now ?? (() => new Date().toISOString());
  const baseContext = options.baseContext ?? {};

  function write(level: LogLevel, message: string, logOptions?: LogOptions) {
    const context = mergeLogContext(baseContext, logOptions?.context);
    const event: LogEvent = {
      timestamp: now(),
      level,
      service: options.service,
      message,
      ...(context !== undefined ? { context } : {}),
      ...(logOptions?.data !== undefined ? { data: logOptions.data } : {}),
      ...(logOptions?.error !== undefined ? { error: serializeError(logOptions.error) } : {}),
    };

    sink(event);
  }

  return {
    child(context) {
      const childContext = mergeLogContext(baseContext, context);
      return createLogger({
        ...options,
        ...(childContext ? { baseContext: childContext } : {}),
        sink,
        now,
      });
    },
    debug(message, logOptions) {
      write("debug", message, logOptions);
    },
    info(message, logOptions) {
      write("info", message, logOptions);
    },
    warn(message, logOptions) {
      write("warn", message, logOptions);
    },
    error(message, logOptions) {
      write("error", message, logOptions);
    },
  };
}
