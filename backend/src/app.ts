import express from "express";
import cors from "cors";
import { authRouter, usersRouter } from "./users/router";
import { ridesRouter } from "./rides/router";
import { bookingsRouter } from "./bookings/router";
import { adminRouter } from "./admin/router";
import { reportRouter } from "./reports/router";
import { configRouter } from "./config/router";
import { errorHandler } from "./middleware/error";
import chatRouter from "./chat/route";

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
app.use("/api/reports", reportRouter);
app.use("/api/config", configRouter);
app.use("/api/admin", adminRouter);
app.use("/api", chatRouter);

app.use(errorHandler);

export { app };
