import { type PairingState, createUnpairedPairingState, isPairingActive } from "./pairing";
import { type DataClass, assertBoundaryAllowed, canSendDataToBoundary } from "./policy";
import { type BridgeQueue, createUnsupportedBridgeQueue } from "./queue";

export type BridgeStartStatus = {
  readonly ready: boolean;
  readonly bridgeId: string;
  readonly queueMode: BridgeQueue["mode"];
  readonly pairingStatus: PairingState["status"];
  readonly reasons: readonly string[];
};

export type BridgeOptions = {
  readonly bridgeId?: string;
  readonly queue?: BridgeQueue;
  readonly pairing?: PairingState;
};

export function createBridge(options: BridgeOptions = {}) {
  const bridgeId = options.bridgeId ?? "local-bridge";
  const queue = options.queue ?? createUnsupportedBridgeQueue();
  const pairing = options.pairing ?? createUnpairedPairingState(bridgeId);

  return {
    async start(): Promise<BridgeStartStatus> {
      const reasons: string[] = [];

      if (!queue.isDurable) {
        reasons.push("durable queue is not configured");
      }

      if (!isPairingActive(pairing)) {
        reasons.push(`device pairing is ${pairing.status}`);
      }

      return {
        ready: reasons.length === 0,
        bridgeId,
        queueMode: queue.mode,
        pairingStatus: pairing.status,
        reasons,
      };
    },
    canProcess(dataClass: DataClass) {
      return canSendDataToBoundary(dataClass, "local");
    },
    canUseRemoteModel(dataClass: DataClass) {
      return canSendDataToBoundary(dataClass, "remote");
    },
    assertCanUseRemoteModel(dataClass: DataClass) {
      assertBoundaryAllowed(dataClass, "remote");
    },
  };
}
