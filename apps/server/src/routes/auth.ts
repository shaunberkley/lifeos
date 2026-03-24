import { Hono } from "hono";

const disabledAuthResponse = () =>
  ({
    ok: false,
    error: "not_implemented",
    message: "Auth is disabled until Better Auth, JWT issuance, and Convex verification are wired.",
  }) as const;

export const authRoute = new Hono().all("*", (c) => c.json(disabledAuthResponse(), 501));
