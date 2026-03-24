import { describe, expect, it } from "vitest";
import { createBridge } from "./bridge";
import { createPairedPairingState } from "./pairing";
import { createEphemeralBridgeQueue } from "./queue";

describe("local bridge fail-closed status", () => {
  it("is not ready when the queue is not durable and pairing is absent", async () => {
    const bridge = createBridge();

    await expect(bridge.start()).resolves.toEqual({
      ready: false,
      bridgeId: "local-bridge",
      queueMode: "unsupported",
      pairingStatus: "unpaired",
      reasons: ["durable queue is not configured", "device pairing is unpaired"],
    });
  });

  it("is still not ready when pairing exists but the queue is ephemeral", async () => {
    const bridge = createBridge({
      queue: createEphemeralBridgeQueue(),
      pairing: createPairedPairingState("device-1", {
        pairedAt: "2026-03-23T00:00:00.000Z",
        lastSeenAt: "2026-03-23T00:00:00.000Z",
        keyId: "bridge-key",
      }),
    });

    await expect(bridge.start()).resolves.toEqual({
      ready: false,
      bridgeId: "local-bridge",
      queueMode: "ephemeral",
      pairingStatus: "paired",
      reasons: ["durable queue is not configured"],
    });
  });
});
