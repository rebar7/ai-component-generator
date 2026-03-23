import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock server actions
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

// Mock anon-work-tracker
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

// Mock project actions
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no anon work, no existing projects
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
});

afterEach(() => {
  vi.clearAllMocks();
});

// --- isLoading state ---

test("isLoading starts as false", () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);
});

test("isLoading is true while signIn is in progress", async () => {
  let resolveSignIn!: (v: unknown) => void;
  mockSignIn.mockReturnValue(new Promise((res) => (resolveSignIn = res)));
  mockGetAnonWorkData.mockReturnValue(null);

  const { result } = renderHook(() => useAuth());

  act(() => {
    result.current.signIn("user@example.com", "password123");
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveSignIn({ success: false });
  });

  expect(result.current.isLoading).toBe(false);
});

test("isLoading is true while signUp is in progress", async () => {
  let resolveSignUp!: (v: unknown) => void;
  mockSignUp.mockReturnValue(new Promise((res) => (resolveSignUp = res)));

  const { result } = renderHook(() => useAuth());

  act(() => {
    result.current.signUp("user@example.com", "password123");
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveSignUp({ success: false });
  });

  expect(result.current.isLoading).toBe(false);
});

// --- signIn happy paths ---

test("signIn calls signInAction with correct credentials", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "pass1234");
  });

  expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "pass1234");
});

test("signIn returns the result from signInAction", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  let returnValue: unknown;
  await act(async () => {
    returnValue = await result.current.signIn("user@example.com", "pass1234");
  });

  expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
});

test("signIn does not navigate when result.success is false", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("bad@example.com", "wrongpass");
  });

  expect(mockPush).not.toHaveBeenCalled();
});

// --- signIn post-sign-in routing: anon work ---

test("signIn with anon work creates project and navigates to it", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: { "/App.tsx": { content: "" } },
  });
  mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [{ role: "user", content: "hello" }],
      data: { "/App.tsx": { content: "" } },
    })
  );
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
});

test("signIn with anon work does not call getProjects", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: {},
  });
  mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockGetProjects).not.toHaveBeenCalled();
});

// --- signIn post-sign-in routing: empty anon messages ---

test("signIn with anonWork but empty messages falls through to getProjects", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
  mockGetProjects.mockResolvedValue([{ id: "existing-project-id" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockGetProjects).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/existing-project-id");
});

// --- signIn post-sign-in routing: existing projects ---

test("signIn without anon work navigates to most recent project", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([
    { id: "recent-project-id" },
    { id: "older-project-id" },
  ]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/recent-project-id");
  expect(mockCreateProject).not.toHaveBeenCalled();
});

// --- signIn post-sign-in routing: no projects ---

test("signIn without anon work and no projects creates a new project", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "brand-new-id" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
});

// --- signIn error handling ---

test("signIn resets isLoading even if signInAction throws", async () => {
  mockSignIn.mockRejectedValue(new Error("Network error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123").catch(() => {});
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading even if post-sign-in navigation throws", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockRejectedValue(new Error("DB error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123").catch(() => {});
  });

  expect(result.current.isLoading).toBe(false);
});

// --- signUp happy paths ---

test("signUp calls signUpAction with correct credentials", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@example.com", "securepass");
  });

  expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "securepass");
});

test("signUp returns the result from signUpAction", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  let returnValue: unknown;
  await act(async () => {
    returnValue = await result.current.signUp("new@example.com", "securepass");
  });

  expect(returnValue).toEqual({ success: false, error: "Email already registered" });
});

test("signUp does not navigate when result.success is false", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("existing@example.com", "password123");
  });

  expect(mockPush).not.toHaveBeenCalled();
});

test("signUp with success and anon work creates project and navigates to it", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ role: "user", content: "make a button" }],
    fileSystemData: { "/App.tsx": { content: "export default () => <button />" } },
  });
  mockCreateProject.mockResolvedValue({ id: "new-user-project-id" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@example.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalled();
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/new-user-project-id");
});

test("signUp with success and no anon work creates a new project", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "fresh-project-id" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("brand@example.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(mockPush).toHaveBeenCalledWith("/fresh-project-id");
});

// --- signUp error handling ---

test("signUp resets isLoading even if signUpAction throws", async () => {
  mockSignUp.mockRejectedValue(new Error("Server error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("user@example.com", "password123").catch(() => {});
  });

  expect(result.current.isLoading).toBe(false);
});

// --- hook shape ---

test("useAuth returns signIn, signUp, and isLoading", () => {
  const { result } = renderHook(() => useAuth());

  expect(typeof result.current.signIn).toBe("function");
  expect(typeof result.current.signUp).toBe("function");
  expect(typeof result.current.isLoading).toBe("boolean");
});
