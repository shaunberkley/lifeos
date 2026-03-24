import { createBridge } from "./bridge";

const status = await createBridge().start();

if (!status.ready) {
  process.stderr.write(`local bridge is not ready: ${status.reasons.join("; ")}\n`);
  process.exit(1);
}

process.stdout.write("local bridge is ready\n");
