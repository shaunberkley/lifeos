import { ConfigurationError, createLogger } from "@lifeos/logging";
import { createBridge } from "./bridge";

const logger = createLogger({ service: "lifeos-local-bridge" });
const bridge = createBridge();
const status = await bridge.start();

if (!status.ready) {
  const error = new ConfigurationError("Local bridge is not ready", {
    bridgeId: status.bridgeId,
    reasons: [...status.reasons],
  });
  logger.error("local bridge failed readiness checks", {
    context: { deviceId: status.bridgeId },
    data: { queueMode: status.queueMode, pairingStatus: status.pairingStatus },
    error,
  });
  throw error;
}

logger.info("local bridge started", {
  context: { deviceId: status.bridgeId },
  data: { queueMode: status.queueMode, pairingStatus: status.pairingStatus },
});

// Keep the daemon alive until a proper process manager is added.
await new Promise(() => {});
