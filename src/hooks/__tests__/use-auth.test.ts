import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "new-project-id" } as any);
  });

  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    test("calls signInAction with email and password", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(signInAction).toHaveBeenCalledWith("user@test.com", "password123");
    });

    test("sets isLoading to true during sign in and false after", async () => {
      let resolveSignIn!: (v: any) => void;
      vi.mocked(signInAction).mockReturnValue(
        new Promise((r) => (resolveSignIn = r))
      );
      const { result } = renderHook(() => useAuth());

      let promise: Promise<any>;
      act(() => {
        promise = result.current.signIn("user@test.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false, error: "Invalid credentials" });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signInAction on success", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      const returnValue = await act(() =>
        result.current.signIn("user@test.com", "password123")
      );

      expect(returnValue).toEqual({ success: true });
    });

    test("returns the result from signInAction on failure", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });
      const { result } = renderHook(() => useAuth());

      const returnValue = await act(() =>
        result.current.signIn("user@test.com", "wrongpassword")
      );

      expect(returnValue).toEqual({
        success: false,
        error: "Invalid credentials",
      });
    });

    test("does not call handlePostSignIn when sign in fails", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });
      const { result } = renderHook(() => useAuth());

      await act(() => result.current.signIn("user@test.com", "wrongpassword"));

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(getProjects).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when signInAction throws", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("user@test.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with email and password", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(() => result.current.signUp("new@test.com", "password123"));

      expect(signUpAction).toHaveBeenCalledWith("new@test.com", "password123");
    });

    test("sets isLoading to true during sign up and false after", async () => {
      let resolveSignUp!: (v: any) => void;
      vi.mocked(signUpAction).mockReturnValue(
        new Promise((r) => (resolveSignUp = r))
      );
      const { result } = renderHook(() => useAuth());

      let promise: Promise<any>;
      act(() => {
        promise = result.current.signUp("new@test.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false, error: "Email already registered" });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signUpAction on success", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      const returnValue = await act(() =>
        result.current.signUp("new@test.com", "password123")
      );

      expect(returnValue).toEqual({ success: true });
    });

    test("returns the result from signUpAction on failure", async () => {
      vi.mocked(signUpAction).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });
      const { result } = renderHook(() => useAuth());

      const returnValue = await act(() =>
        result.current.signUp("existing@test.com", "password123")
      );

      expect(returnValue).toEqual({
        success: false,
        error: "Email already registered",
      });
    });

    test("does not call handlePostSignIn when sign up fails", async () => {
      vi.mocked(signUpAction).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });
      const { result } = renderHook(() => useAuth());

      await act(() =>
        result.current.signUp("existing@test.com", "password123")
      );

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when signUpAction throws", async () => {
      vi.mocked(signUpAction).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("new@test.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("handlePostSignIn — anonymous work exists", () => {
    const anonWork = {
      messages: [{ id: "1", role: "user", content: "Hello" }],
      fileSystemData: { "/App.tsx": { type: "file", content: "export default () => <div />" } },
    };

    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProject).mockResolvedValue({ id: "anon-project-id" } as any);
    });

    test("creates a project from anonymous work data", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
    });

    test("clears anonymous work after creating project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(clearAnonWork).toHaveBeenCalled();
    });

    test("navigates to the new project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("does not call getProjects when anon work is present", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(getProjects).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anonymous work, existing projects", () => {
    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([
        { id: "project-1" },
        { id: "project-2" },
      ] as any);
    });

    test("navigates to the most recent project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    test("does not create a new project when existing projects are found", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(createProject).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anonymous work, no existing projects", () => {
    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({ id: "fresh-project-id" } as any);
    });

    test("creates a new empty project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
    });

    test("navigates to the newly created project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith("/fresh-project-id");
    });
  });

  describe("handlePostSignIn — anonymous work with no messages", () => {
    beforeEach(() => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
      vi.mocked(getProjects).mockResolvedValue([{ id: "existing-project" }] as any);
    });

    test("falls through to existing projects when anon work has no messages", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("does not clear anon work when messages array is empty", async () => {
      const { result } = renderHook(() => useAuth());
      await act(() => result.current.signIn("user@test.com", "password123"));

      expect(clearAnonWork).not.toHaveBeenCalled();
    });
  });
});
