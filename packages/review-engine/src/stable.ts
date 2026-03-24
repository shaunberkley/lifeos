function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return Object.fromEntries(entries.map(([key, entryValue]) => [key, sortObject(entryValue)]));
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortObject(value));
}
