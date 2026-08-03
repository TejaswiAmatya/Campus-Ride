import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { errorHandler } from "./error";
import { upload } from "./upload";

function createApp() {
  const app = express();

  app.post("/upload", upload.single("document"), (req, res) => {
    res.json({
      data: {
        mimetype: req.file?.mimetype ?? null,
        size: req.file?.size ?? null,
      },
    });
  });

  app.use(errorHandler);

  return app;
}

describe("upload middleware integration", () => {
  it("accepts supported image uploads into memory", async () => {
    const res = await request(createApp())
      .post("/upload")
      .attach("document", Buffer.from("jpeg-bytes"), {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      mimetype: "image/jpeg",
      size: Buffer.byteLength("jpeg-bytes"),
    });
  });

  it("accepts pdf uploads", async () => {
    const res = await request(createApp())
      .post("/upload")
      .attach("document", Buffer.from("%PDF"), {
        filename: "policy.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.mimetype).toBe("application/pdf");
  });

  it("rejects unsupported file types through the shared error pipeline", async () => {
    const res = await request(createApp())
      .post("/upload")
      .attach("document", Buffer.from("text"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });
});
