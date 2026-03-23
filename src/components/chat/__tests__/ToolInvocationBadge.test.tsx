import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ToolInvocation } from "ai";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "result",
  result: unknown = "ok"
): ToolInvocation {
  return {
    toolCallId: "test-id",
    toolName,
    args,
    state,
    result: state === "result" ? result : undefined,
  } as ToolInvocation;
}

describe("ToolInvocationBadge — label text", () => {
  test("str_replace_editor create shows 'Creating <filename>'", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })}
      />
    );
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
  });

  test("str_replace_editor str_replace shows 'Editing <filename>'", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/src/Card.jsx" })}
      />
    );
    expect(screen.getByText("Editing Card.jsx")).toBeDefined();
  });

  test("str_replace_editor insert shows 'Editing <filename>'", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "/index.tsx" })}
      />
    );
    expect(screen.getByText("Editing index.tsx")).toBeDefined();
  });

  test("str_replace_editor view shows 'Reading <filename>'", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "/index.tsx" })}
      />
    );
    expect(screen.getByText("Reading index.tsx")).toBeDefined();
  });

  test("str_replace_editor undo_edit shows 'Undoing edit in <filename>'", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })}
      />
    );
    expect(screen.getByText("Undoing edit in App.jsx")).toBeDefined();
  });

  test("file_manager rename shows 'Renaming <filename>'", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/old.jsx" })}
      />
    );
    expect(screen.getByText("Renaming old.jsx")).toBeDefined();
  });

  test("file_manager delete shows 'Deleting <filename>'", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/temp.jsx" })}
      />
    );
    expect(screen.getByText("Deleting temp.jsx")).toBeDefined();
  });

  test("unknown tool name falls back to raw tool name", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("some_unknown_tool", { command: "run" })}
      />
    );
    expect(screen.getByText("some_unknown_tool")).toBeDefined();
  });

  test("missing path falls back to label without filename", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("str_replace_editor", { command: "create" })}
      />
    );
    expect(screen.getByText("Creating file")).toBeDefined();
  });

  test("nested path extracts only the filename", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/src/components/Button.tsx" })}
      />
    );
    expect(screen.getByText("Editing Button.tsx")).toBeDefined();
  });
});

describe("ToolInvocationBadge — state indicators", () => {
  test("pending state shows spinner, no green dot", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "call")}
      />
    );
    // spinner has animate-spin class
    expect(container.querySelector(".animate-spin")).toBeDefined();
    // no green dot (bg-emerald-500)
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("completed state shows green dot, no spinner", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result", "ok")}
      />
    );
    // green dot present
    expect(container.querySelector(".bg-emerald-500")).toBeDefined();
    // no spinner
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
