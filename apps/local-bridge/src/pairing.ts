export type PairingStatus = "unpaired" | "pending" | "paired" | "revoked";

export type PairingState = {
  readonly deviceId: string;
  readonly status: PairingStatus;
  readonly pairedAt: string | null;
  readonly lastSeenAt: string | null;
  readonly keyId: string | null;
};

export function createUnpairedPairingState(deviceId: string): PairingState {
  return {
    deviceId,
    status: "unpaired",
    pairedAt: null,
    lastSeenAt: null,
    keyId: null,
  };
}

export function createPairedPairingState(
  deviceId: string,
  options: {
    readonly pairedAt?: string;
    readonly lastSeenAt?: string;
    readonly keyId?: string;
  } = {},
): PairingState {
  const pairedAt = options.pairedAt ?? new Date().toISOString();

  return {
    deviceId,
    status: "paired",
    pairedAt,
    lastSeenAt: options.lastSeenAt ?? pairedAt,
    keyId: options.keyId ?? null,
  };
}

export function revokePairingState(state: PairingState): PairingState {
  return {
    ...state,
    status: "revoked",
  };
}

export function touchPairingState(
  state: PairingState,
  at = new Date().toISOString(),
): PairingState {
  return {
    ...state,
    lastSeenAt: at,
  };
}

export function isPairingActive(state: PairingState) {
  return state.status === "paired";
}
