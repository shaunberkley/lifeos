export type ModelClass = "local" | "remote";

export function assertModelAllowed(
  dataClass: "public" | "private" | "restricted" | "derived",
  modelClass: ModelClass,
) {
  if (dataClass === "restricted" && modelClass !== "local") {
    throw new Error("Restricted data must stay on local models");
  }
}
