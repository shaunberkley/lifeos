import { describe, expect, it } from "vitest";
import {
  createDeterministicClock,
  createDeterministicIdFactory,
  createDeterministicRandom,
  createFixtureBuilder,
} from "./index";

describe("@lifeos/testing", () => {
  it("advances clocks deterministically", () => {
    const clock = createDeterministicClock("2026-03-23T00:00:00.000Z");

    expect(clock.nowIso()).toBe("2026-03-23T00:00:00.000Z");
    clock.advanceBy(1000);
    expect(clock.nowIso()).toBe("2026-03-23T00:00:01.000Z");
  });

  it("produces stable seeded randomness", () => {
    const first = createDeterministicRandom(123);
    const second = createDeterministicRandom(123);

    expect(first.next()).toBe(second.next());
    expect(first.nextInt(10)).toBe(second.nextInt(10));
    expect(first.pick(["a", "b", "c"])).toBe(second.pick(["a", "b", "c"]));
    expect(typeof first.nextBoolean()).toBe("boolean");
  });

  it("builds deep-frozen fixtures from overrides", () => {
    const build = createFixtureBuilder({
      nested: {
        count: 1,
        label: "base",
      },
      tags: ["alpha"],
    });

    const fixture = build({
      nested: {
        label: "override",
      },
    });

    expect(fixture.nested.label).toBe("override");
    expect(fixture.nested.count).toBe(1);
    expect(Object.isFrozen(fixture)).toBe(true);
    expect(Object.isFrozen(fixture.nested)).toBe(true);
  });

  it("generates deterministic ids", () => {
    const ids = createDeterministicIdFactory("test");

    expect(ids.nextId()).toBe("test-0000");
    expect(ids.nextId()).toBe("test-0001");
  });
});
