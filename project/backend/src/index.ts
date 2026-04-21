import express from "express";
import cors from "cors";
import http from "http";
import { initSocket } from "./lib/socket";
import { authRouter, usersRouter } from "./users/router";
import { ridesRouter } from "./rides/router";
import { bookingsRouter } from "./bookings/router";
import { adminRouter } from "./admin/router";
import { errorHandler } from "./middleware/error";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/rides", ridesRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/admin", adminRouter);

app.use(errorHandler);

const PORT = parseInt(process.env.PORT || "8000", 10);

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`[backend] Server running on PORT ${PORT}`);
});

export { app };
