import type { JsonObject, SignedEnvelope } from "@lifeos/security";
import type { DataClass } from "./policy";

export type BridgeEventPayload = {
  type: string;
  payload: JsonObject;
  source: "local-bridge";
};

export type BridgeQueueRecord = {
  readonly id: string;
  readonly createdAt: string;
  readonly dataClass: DataClass;
  readonly envelope: SignedEnvelope<BridgeEventPayload>;
};

export type BridgeQueue = {
  readonly mode: "unsupported" | "ephemeral";
  readonly isDurable: boolean;
  enqueue(record: BridgeQueueRecord): Promise<void>;
  drain(): Promise<readonly BridgeQueueRecord[]>;
  size(): Promise<number>;
};

function createUnsupportedQueueError(reason: string) {
  return new Error(`Local bridge queue is unavailable: ${reason}`);
}

export function createUnsupportedBridgeQueue(
  reason = "durable storage has not been configured",
): BridgeQueue {
  return {
    mode: "unsupported",
    isDurable: false,
    async enqueue() {
      throw createUnsupportedQueueError(reason);
    },
    async drain() {
      throw createUnsupportedQueueError(reason);
    },
    async size() {
      throw createUnsupportedQueueError(reason);
    },
  };
}

export function createEphemeralBridgeQueue(
  initialRecords: readonly BridgeQueueRecord[] = [],
): BridgeQueue {
  const records = [...initialRecords];

  return {
    mode: "ephemeral",
    isDurable: false,
    async enqueue(record) {
      records.push(record);
    },
    async drain() {
      const drained = [...records];
      records.length = 0;
      return drained;
    },
    async size() {
      return records.length;
    },
  };
}
