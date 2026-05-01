import { describe, test, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const sign = vi.fn().mockResolvedValue("mock-jwt-token");
  const jwtBuilder = {
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign,
  };
  const cookieSet = vi.fn();
  const cookieGet = vi.fn();
  const cookieDelete = vi.fn();
  const cookies = vi.fn().mockResolvedValue({ set: cookieSet, get: cookieGet, delete: cookieDelete });
  const jwtVerify = vi.fn();
  return { sign, jwtBuilder, cookieSet, cookieGet, cookieDelete, cookies, jwtVerify };
});

vi.mock("server-only", () => ({}));
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => mocks.jwtBuilder),
  jwtVerify: mocks.jwtVerify,
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

import { createSession, getSession, deleteSession, verifySession } from "../auth";
import type { NextRequest } from "next/server";
import { SignJWT } from "jose";

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("constructs a SignJWT with userId and email in the payload", async () => {
    await createSession("user-123", "test@example.com");
    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-123", email: "test@example.com" })
    );
  });

  test("includes expiresAt ~7 days from now in the JWT payload", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();
    const [[payload]] = (SignJWT as ReturnType<typeof vi.fn>).mock.calls;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(new Date(payload.expiresAt).getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(new Date(payload.expiresAt).getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("sets the protected header to HS256", async () => {
    await createSession("user-123", "test@example.com");
    expect(mocks.jwtBuilder.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
  });

  test("sets expiration time to 7d", async () => {
    await createSession("user-123", "test@example.com");
    expect(mocks.jwtBuilder.setExpirationTime).toHaveBeenCalledWith("7d");
  });

  test("calls setIssuedAt", async () => {
    await createSession("user-123", "test@example.com");
    expect(mocks.jwtBuilder.setIssuedAt).toHaveBeenCalled();
  });

  test("signs the token and stores it in the cookie", async () => {
    await createSession("user-123", "test@example.com");
    const [, tokenValue] = mocks.cookieSet.mock.calls[0];
    expect(tokenValue).toBe("mock-jwt-token");
  });

  test("stores the token under the 'auth-token' cookie name", async () => {
    await createSession("user-123", "test@example.com");
    const [cookieName] = mocks.cookieSet.mock.calls[0];
    expect(cookieName).toBe("auth-token");
  });

  test("sets cookie httpOnly=true", async () => {
    await createSession("user-123", "test@example.com");
    const [, , options] = mocks.cookieSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
  });

  test("sets cookie secure=false outside production", async () => {
    // NODE_ENV is 'test' in Vitest
    await createSession("user-123", "test@example.com");
    const [, , options] = mocks.cookieSet.mock.calls[0];
    expect(options.secure).toBe(false);
  });

  test("sets cookie secure=true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await createSession("user-123", "test@example.com");
    const [, , options] = mocks.cookieSet.mock.calls[0];
    expect(options.secure).toBe(true);
    vi.unstubAllEnvs();
  });

  test("sets cookie sameSite=lax", async () => {
    await createSession("user-123", "test@example.com");
    const [, , options] = mocks.cookieSet.mock.calls[0];
    expect(options.sameSite).toBe("lax");
  });

  test("sets cookie path='/'", async () => {
    await createSession("user-123", "test@example.com");
    const [, , options] = mocks.cookieSet.mock.calls[0];
    expect(options.path).toBe("/");
  });

  test("cookie expires ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();
    const [, , options] = mocks.cookieSet.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("JWT payload expiresAt matches the cookie expires date", async () => {
    await createSession("user-123", "test@example.com");
    const [[payload]] = (SignJWT as ReturnType<typeof vi.fn>).mock.calls;
    const [, , options] = mocks.cookieSet.mock.calls[0];
    expect(new Date(payload.expiresAt).getTime()).toBe(options.expires.getTime());
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookieGet.mockReturnValue(undefined);
  });

  test("returns null when auth-token cookie is absent", async () => {
    const result = await getSession();
    expect(result).toBeNull();
  });

  test("does not call jwtVerify when cookie is absent", async () => {
    await getSession();
    expect(mocks.jwtVerify).not.toHaveBeenCalled();
  });

  test("looks up the 'auth-token' cookie by name", async () => {
    await getSession();
    expect(mocks.cookieGet).toHaveBeenCalledWith("auth-token");
  });

  test("returns null when jwtVerify throws", async () => {
    mocks.cookieGet.mockReturnValue({ value: "invalid-token" });
    mocks.jwtVerify.mockRejectedValue(new Error("invalid signature"));
    const result = await getSession();
    expect(result).toBeNull();
  });

  test("returns the full session payload when the token is valid", async () => {
    const payload = { userId: "user-123", email: "test@example.com", expiresAt: new Date() };
    mocks.cookieGet.mockReturnValue({ value: "valid-token" });
    mocks.jwtVerify.mockResolvedValue({ payload });
    const result = await getSession();
    expect(result).toEqual(payload);
  });

  test("calls jwtVerify with the token value from the cookie", async () => {
    mocks.cookieGet.mockReturnValue({ value: "some-jwt-token" });
    mocks.jwtVerify.mockResolvedValue({ payload: {} });
    await getSession();
    expect(mocks.jwtVerify.mock.calls[0][0]).toBe("some-jwt-token");
  });

  test("returns userId from the verified payload", async () => {
    mocks.cookieGet.mockReturnValue({ value: "token" });
    mocks.jwtVerify.mockResolvedValue({ payload: { userId: "user-abc", email: "a@b.com", expiresAt: "2026-01-01" } });
    const result = await getSession();
    expect(result?.userId).toBe("user-abc");
  });

  test("returns email from the verified payload", async () => {
    mocks.cookieGet.mockReturnValue({ value: "token" });
    mocks.jwtVerify.mockResolvedValue({ payload: { userId: "user-abc", email: "a@b.com", expiresAt: "2026-01-01" } });
    const result = await getSession();
    expect(result?.email).toBe("a@b.com");
  });

  test("returns expiresAt from the verified payload", async () => {
    const expiresAt = "2026-12-31T00:00:00.000Z";
    mocks.cookieGet.mockReturnValue({ value: "token" });
    mocks.jwtVerify.mockResolvedValue({ payload: { userId: "u", email: "e@e.com", expiresAt } });
    const result = await getSession();
    expect(result?.expiresAt).toBe(expiresAt);
  });
});

describe("deleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("deletes the 'auth-token' cookie", async () => {
    await deleteSession();
    expect(mocks.cookieDelete).toHaveBeenCalledWith("auth-token");
  });

  test("calls delete exactly once", async () => {
    await deleteSession();
    expect(mocks.cookieDelete).toHaveBeenCalledTimes(1);
  });
});

describe("verifySession", () => {
  const makeRequest = (cookieValue?: string) => {
    const get = vi.fn().mockReturnValue(
      cookieValue !== undefined ? { value: cookieValue } : undefined
    );
    return { request: { cookies: { get } } as unknown as NextRequest, cookieGet: get };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when auth-token cookie is absent", async () => {
    const { request } = makeRequest();
    const result = await verifySession(request);
    expect(result).toBeNull();
  });

  test("does not call jwtVerify when cookie is absent", async () => {
    const { request } = makeRequest();
    await verifySession(request);
    expect(mocks.jwtVerify).not.toHaveBeenCalled();
  });

  test("looks up the 'auth-token' cookie from the request", async () => {
    const { request, cookieGet } = makeRequest();
    await verifySession(request);
    expect(cookieGet).toHaveBeenCalledWith("auth-token");
  });

  test("returns null when jwtVerify throws", async () => {
    mocks.jwtVerify.mockRejectedValue(new Error("invalid token"));
    const { request } = makeRequest("bad-token");
    const result = await verifySession(request);
    expect(result).toBeNull();
  });

  test("returns the session payload when the token is valid", async () => {
    const payload = { userId: "u1", email: "u@example.com", expiresAt: new Date() };
    mocks.jwtVerify.mockResolvedValue({ payload });
    const { request } = makeRequest("valid-token");
    const result = await verifySession(request);
    expect(result).toEqual(payload);
  });

  test("calls jwtVerify with the token from the request cookie", async () => {
    mocks.jwtVerify.mockResolvedValue({ payload: {} });
    const { request } = makeRequest("request-token");
    await verifySession(request);
    expect(mocks.jwtVerify.mock.calls[0][0]).toBe("request-token");
  });

  test("returns userId from the verified payload", async () => {
    mocks.jwtVerify.mockResolvedValue({ payload: { userId: "user-xyz", email: "x@y.com", expiresAt: "2026-01-01" } });
    const { request } = makeRequest("token");
    const result = await verifySession(request);
    expect(result?.userId).toBe("user-xyz");
  });

  test("returns email from the verified payload", async () => {
    mocks.jwtVerify.mockResolvedValue({ payload: { userId: "user-xyz", email: "x@y.com", expiresAt: "2026-01-01" } });
    const { request } = makeRequest("token");
    const result = await verifySession(request);
    expect(result?.email).toBe("x@y.com");
  });

  test("returns expiresAt from the verified payload", async () => {
    const expiresAt = "2026-06-01T00:00:00.000Z";
    mocks.jwtVerify.mockResolvedValue({ payload: { userId: "u", email: "e@e.com", expiresAt } });
    const { request } = makeRequest("token");
    const result = await verifySession(request);
    expect(result?.expiresAt).toBe(expiresAt);
  });
});
