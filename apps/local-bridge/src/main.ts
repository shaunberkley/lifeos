import { createBridge } from "./bridge";

const bridge = createBridge();

const status = await bridge.start();

if (!status.ready) {
  throw new Error(`Local bridge is not ready: ${status.reasons.join("; ")}`);
}

// Keep the daemon alive until a proper process manager is added.
await new Promise(() => {});
