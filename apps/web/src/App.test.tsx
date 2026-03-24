import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("@lifeos/web App", () => {
  it("renders the LifeOS shell without client-only boot assumptions", () => {
    const html = renderToString(<App />);

    expect(html).toContain("LifeOS");
    expect(html).toContain("Typed state, local privacy boundary, real-time sync.");
    expect(html).toContain("Foundation scaffolding is in place.");
  });
});
