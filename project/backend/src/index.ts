import http from "http";
import { app } from "./app";
import { initSocket } from "./lib/socket";
import { startEmailWorker } from "./workers/emailWorkers";

if (process.env.VITEST !== "true") {
  startEmailWorker();
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
