import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("@lifeos/web App", () => {
  it("renders the LifeOS Reviewer workspace skeleton", () => {
    const html = renderToString(<App />);

    expect(html).toContain("LifeOS Reviewer workspace");
    expect(html).toContain("Operational review flows with fail-closed boundaries.");
    expect(html).toContain("Mocked state only");
  });

  it("includes the key reviewer surfaces and policy copy", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Overview / dashboard shell");
    expect(html).toContain("Provider connection / settings shell");
    expect(html).toContain("Review policy / settings shell");
    expect(html).toContain("Review runs list / detail shell");
    expect(html).toContain("Monitoring / ops shell");
    expect(html).toContain("Restricted data stays local by default");
    expect(html).toContain("Onboarding regression sweep");
    expect(html).toContain("Queue lag");
  });
});
