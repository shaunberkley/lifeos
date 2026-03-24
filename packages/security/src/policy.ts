export type DataClass = "public" | "private" | "restricted" | "derived";

export type ProcessingBoundary = "local" | "remote";

function assertNever(value: never): never {
  throw new Error(`Unsupported data classification: ${String(value)}`);
}

export function canSendDataToBoundary(dataClass: DataClass, boundary: ProcessingBoundary) {
  switch (dataClass) {
    case "public":
      return true;
    case "derived":
      return true;
    case "private":
    case "restricted":
      return boundary === "local";
    default:
      return assertNever(dataClass);
  }
}

export function canUseRemoteModel(dataClass: DataClass) {
  return canSendDataToBoundary(dataClass, "remote");
}

export function assertBoundaryAllowed(dataClass: DataClass, boundary: ProcessingBoundary) {
  if (!canSendDataToBoundary(dataClass, boundary)) {
    throw new Error(`Refusing to send ${dataClass} data to the ${boundary} boundary.`);
  }
}

export function assertRemoteModelAllowed(dataClass: DataClass) {
  assertBoundaryAllowed(dataClass, "remote");
}
