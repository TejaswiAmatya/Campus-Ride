import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
}));

vi.mock("../admin/controller", () => ({
  getConfig: mocks.getConfig,
}));

import { configRouter } from "./router";

describe("config router integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wires GET / to the public config controller", async () => {
    mocks.getConfig.mockImplementation((_req, res) => {
      res.json({ data: { platformFeePercent: "10" } });
    });

    const app = express();
    app.use("/", configRouter);

    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { platformFeePercent: "10" },
    });
    expect(mocks.getConfig).toHaveBeenCalledTimes(1);
  });
});
