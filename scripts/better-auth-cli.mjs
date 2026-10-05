import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverOnlyEntry = path.normalize(
  fileURLToPath(import.meta.resolve("server-only")),
);
const readFileSync = fs.readFileSync;

// Better Auth 1.7's Jiti loader does not honor the `react-server` export
// condition. Treat only the server-only guard as empty while its CLI loads the
// real application config; the Next.js application still receives the guard.
fs.readFileSync = function readServerOnlyForCli(file, ...args) {
  if (path.normalize(String(file)) === serverOnlyEntry) {
    return typeof args[0] === "string" ? "" : Buffer.alloc(0);
  }

  return readFileSync.call(this, file, ...args);
};
