import { beforeEach, describe, expect, it, vi } from "vitest";

describe("supabase integration wiring", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.SUPABASE_URL = "https://demo.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.APP_URL = "http://localhost:5173/";
    process.env.CORS_ORIGIN = "http://localhost:5173";
  });

  it("fails lazily when required supabase env vars are missing", async () => {
    delete process.env.SUPABASE_URL;

    const createClient = vi.fn();
    vi.doMock("@supabase/supabase-js", () => ({
      createClient,
    }));

    const module = await import("./supabase");

    await expect(
      module.registerAuthUser({
        email: "alice@university.edu",
        password: "Password123!",
        name: "Alice",
      }),
    ).rejects.toThrow("Missing required environment variables");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("uses the anon client for registerAuthUser and builds the confirm redirect url", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: {}, error: null });
    const createUser = vi.fn();

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn((url: string, key: string) => {
        if (key === "anon-key") {
          return {
            auth: { signUp },
          };
        }

        return {
          auth: { admin: { createUser } },
          storage: { from: vi.fn() },
        };
      }),
    }));

    const module = await import("./supabase");

    await module.registerAuthUser({
      email: "alice@university.edu",
      password: "Password123!",
      name: "Alice",
      phone: "+4712345678",
    });

    expect(signUp).toHaveBeenCalledWith({
      email: "alice@university.edu",
      password: "Password123!",
      options: {
        emailRedirectTo: "http://localhost:5173/auth/confirm",
        data: {
          name: "Alice",
          phone: "+4712345678",
        },
      },
    });
  });

  it("uses the service role client for createAuthUser", async () => {
    const createUser = vi.fn().mockResolvedValue({ data: {}, error: null });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn((_url: string, key: string) => {
        if (key === "service-role-key") {
          return {
            auth: {
              admin: {
                createUser,
                deleteUser: vi.fn(),
              },
            },
            storage: {
              from: vi.fn(),
            },
          };
        }

        return {
          auth: {
            signUp: vi.fn(),
            verifyOtp: vi.fn(),
          },
        };
      }),
    }));

    const module = await import("./supabase");

    await module.createAuthUser("alice@university.edu", "Password123!");

    expect(createUser).toHaveBeenCalledWith({
      email: "alice@university.edu",
      password: "Password123!",
      email_confirm: true,
    });
  });

  it("maps storage upload failures to AppError", async () => {
    const upload = vi.fn().mockResolvedValue({
      error: { message: "bucket offline", name: "StorageError" },
    });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn((_url: string, key: string) => {
        if (key === "service-role-key") {
          return {
            auth: { admin: { createUser: vi.fn(), deleteUser: vi.fn() } },
            storage: {
              from: vi.fn(() => ({
                upload,
                getPublicUrl: vi.fn(() => ({ data: { publicUrl: "x" } })),
                remove: vi.fn(),
              })),
            },
          };
        }

        return {
          auth: {
            signUp: vi.fn(),
            verifyOtp: vi.fn(),
          },
        };
      }),
    }));

    const module = await import("./supabase");

    await expect(
      module.uploadAvatar("user-1", Buffer.from("data"), "image/png"),
    ).rejects.toMatchObject({
      code: "UPLOAD_FAILED",
    });
  });

  it("dedupes document deletions and skips avatar deletion when the url is not a storage path", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn((_url: string, key: string) => {
        if (key === "service-role-key") {
          return {
            auth: { admin: { createUser: vi.fn(), deleteUser: vi.fn() } },
            storage: {
              from: vi.fn(() => ({
                upload: vi.fn(),
                getPublicUrl: vi.fn(() => ({ data: { publicUrl: "x" } })),
                remove,
              })),
            },
          };
        }

        return {
          auth: {
            signUp: vi.fn(),
            verifyOtp: vi.fn(),
          },
        };
      }),
    }));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const module = await import("./supabase");

    await module.deletePrivateDocuments([
      "academic-ids/u1/card.png",
      "academic-ids/u1/card.png",
      " ",
      "licences/u1/licence.png",
    ]);
    await module.deleteAvatar("https://example.com/avatar.png");

    expect(remove).toHaveBeenCalledWith([
      "academic-ids/u1/card.png",
      "licences/u1/licence.png",
    ]);
    expect(warnSpy).toHaveBeenCalled();
  });
});
