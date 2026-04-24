import http from "http";
import { app } from "./app";
import { initSocket } from "./lib/socket";

// Email worker + Redis — not loaded during Vitest (tests import `./app` only).
if (process.env.VITEST !== "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("./workers/emailWorkers");
}

const PORT = parseInt(process.env.PORT || "8000", 10);

const server = http.createServer(app);
initSocket(server);

if (process.env.VITEST !== "true") {
  server.listen(PORT, () => {
    console.log(`[backend] Server running on PORT ${PORT}`);
  });
}

export { app };
