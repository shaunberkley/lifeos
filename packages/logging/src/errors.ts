type ErrorDetails = Record<string, unknown>;

type AppErrorOptions = {
  readonly code: string;
  readonly message: string;
  readonly status: number;
  readonly details?: ErrorDetails;
  readonly cause?: unknown;
};

export type SerializedError = {
  readonly name: string;
  readonly code: string;
  readonly message: string;
  readonly status: number;
  readonly details?: ErrorDetails;
  readonly cause?: SerializedError;
};

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ErrorDetails | undefined;
  override readonly cause: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = new.target.name;
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({
      code: "configuration_error",
      message,
      status: 500,
      ...(details ? { details } : {}),
    });
  }
}

export class NotImplementedAppError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({
      code: "not_implemented",
      message,
      status: 501,
      ...(details ? { details } : {}),
    });
  }
}

export class PolicyViolationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({
      code: "policy_violation",
      message,
      status: 403,
      ...(details ? { details } : {}),
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({
      code: "service_unavailable",
      message,
      status: 503,
      ...(details ? { details } : {}),
    });
  }
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof AppError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      status: error.status,
      ...(error.details !== undefined ? { details: error.details } : {}),
      ...(error.cause !== undefined ? { cause: serializeError(error.cause) } : {}),
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      code: "unexpected_error",
      message: error.message,
      status: 500,
    };
  }

  return {
    name: "UnknownError",
    code: "unexpected_error",
    message: "An unknown error was thrown.",
    status: 500,
    details: { value: error },
  };
}

export function toErrorResponse(
  error: unknown,
  options: { readonly correlationId?: string } = {},
): {
  readonly ok: false;
  readonly error: string;
  readonly message: string;
  readonly correlationId?: string;
} {
  const serialized = serializeError(error);
  return {
    ok: false,
    error: serialized.code,
    message: serialized.message,
    ...(options.correlationId !== undefined ? { correlationId: options.correlationId } : {}),
  };
}
