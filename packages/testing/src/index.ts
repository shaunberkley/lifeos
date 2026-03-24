type PlainObject = Record<string, unknown>;

export type DeepPartial<T> = T extends readonly (infer U)[]
  ? readonly DeepPartial<U>[]
  : T extends PlainObject
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type DeterministicClock = {
  now(): Date;
  nowIso(): string;
  nowMs(): number;
  advanceBy(milliseconds: number): void;
  set(isoTimestamp: string): void;
};

export type DeterministicRandom = {
  next(): number;
  nextInt(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  nextBoolean(): boolean;
};

export type DeterministicIdFactory = {
  nextId(): string;
};

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }

  if (isPlainObject(value)) {
    for (const item of Object.values(value)) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }

  return value;
}

export function deepMerge<T extends PlainObject>(base: T, overrides?: DeepPartial<T>): T {
  const result: PlainObject = { ...base };
  const resolvedOverrides = overrides ?? ({} as DeepPartial<T>);

  for (const [key, overrideValue] of Object.entries(resolvedOverrides)) {
    if (overrideValue === undefined) {
      continue;
    }

    const baseValue = result[key];

    if (Array.isArray(overrideValue)) {
      result[key] = [...overrideValue];
      continue;
    }

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
      continue;
    }

    result[key] = overrideValue as unknown;
  }

  return result as T;
}

export function createFixtureBuilder<T extends PlainObject>(base: T) {
  return (overrides?: DeepPartial<T>) => {
    const resolvedOverrides = overrides ?? ({} as DeepPartial<T>);
    return deepFreeze(deepMerge(base, resolvedOverrides));
  };
}

export function createDeterministicClock(
  initialIsoTimestamp = "2026-03-23T00:00:00.000Z",
): DeterministicClock {
  let currentMs = Date.parse(initialIsoTimestamp);

  if (Number.isNaN(currentMs)) {
    throw new Error(`Invalid ISO timestamp: ${initialIsoTimestamp}`);
  }

  return {
    now() {
      return new Date(currentMs);
    },
    nowIso() {
      return new Date(currentMs).toISOString();
    },
    nowMs() {
      return currentMs;
    },
    advanceBy(milliseconds: number) {
      if (!Number.isFinite(milliseconds)) {
        throw new Error("advanceBy requires a finite number.");
      }

      currentMs += milliseconds;
    },
    set(isoTimestamp: string) {
      const nextMs = Date.parse(isoTimestamp);

      if (Number.isNaN(nextMs)) {
        throw new Error(`Invalid ISO timestamp: ${isoTimestamp}`);
      }

      currentMs = nextMs;
    },
  };
}

export function createDeterministicRandom(seed = 0x6d2b79f5): DeterministicRandom {
  let state = seed >>> 0;

  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    nextInt(maxExclusive: number) {
      assertPositiveInteger(maxExclusive, "maxExclusive");
      return Math.floor(next() * maxExclusive);
    },
    pick<T>(items: readonly T[]) {
      if (items.length === 0) {
        throw new Error("pick requires at least one item.");
      }

      return items[Math.floor(next() * items.length)] as T;
    },
    nextBoolean() {
      return next() >= 0.5;
    },
  };
}

export function createDeterministicIdFactory(prefix = "fixture"): DeterministicIdFactory {
  let counter = 0;

  return {
    nextId() {
      const id = `${prefix}-${String(counter).padStart(4, "0")}`;
      counter += 1;
      return id;
    },
  };
}
