import { test, expect, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getToolLabel } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

describe("getToolLabel", () => {
  describe("str_replace_editor", () => {
    test("create command returns 'Creating <filename>'", () => {
      expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/App.jsx" })).toBe("Creating App.jsx");
    });

    test("str_replace command returns 'Editing <filename>'", () => {
      expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/src/components/Button.tsx" })).toBe("Editing Button.tsx");
    });

    test("insert command returns 'Editing <filename>'", () => {
      expect(getToolLabel("str_replace_editor", { command: "insert", path: "/src/utils/utils.ts" })).toBe("Editing utils.ts");
    });

    test("view command returns 'Reading <filename>'", () => {
      expect(getToolLabel("str_replace_editor", { command: "view", path: "/README.md" })).toBe("Reading README.md");
    });

    test("undo_edit command returns 'Undoing edit in <filename>'", () => {
      expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/src/App.jsx" })).toBe("Undoing edit in App.jsx");
    });

    test("unknown command falls back to raw tool name", () => {
      expect(getToolLabel("str_replace_editor", { command: "unknown_cmd", path: "/App.jsx" })).toBe("str_replace_editor");
    });

    test("missing command falls back to raw tool name", () => {
      expect(getToolLabel("str_replace_editor", { path: "/App.jsx" })).toBe("str_replace_editor");
    });
  });

  describe("file_manager", () => {
    test("rename command returns 'Renaming <filename>'", () => {
      expect(getToolLabel("file_manager", { command: "rename", path: "/src/OldName.tsx" })).toBe("Renaming OldName.tsx");
    });

    test("delete command returns 'Deleting <filename>'", () => {
      expect(getToolLabel("file_manager", { command: "delete", path: "/src/App.jsx" })).toBe("Deleting App.jsx");
    });

    test("unknown command falls back to raw tool name", () => {
      expect(getToolLabel("file_manager", { command: "copy", path: "/App.jsx" })).toBe("file_manager");
    });
  });

  describe("unknown tool", () => {
    test("returns raw tool name", () => {
      expect(getToolLabel("some_other_tool", { command: "create", path: "/App.jsx" })).toBe("some_other_tool");
    });
  });

  describe("path edge cases", () => {
    test("path with no slashes uses the whole string as filename", () => {
      expect(getToolLabel("file_manager", { command: "delete", path: "App.jsx" })).toBe("Deleting App.jsx");
    });

    test("path with trailing slash results in label without filename", () => {
      expect(getToolLabel("str_replace_editor", { command: "create", path: "/components/" })).toBe("Creating");
    });

    test("missing path degrades gracefully", () => {
      expect(getToolLabel("str_replace_editor", { command: "create" })).toBe("Creating");
    });

    test("non-string path degrades gracefully", () => {
      expect(getToolLabel("str_replace_editor", { command: "create", path: 42 })).toBe("Creating");
    });
  });
});

describe("ToolInvocationBadge", () => {
  test("shows human-readable label for known tool+command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
  });

  test("shows raw tool name for unknown tool", () => {
    render(
      <ToolInvocationBadge
        toolName="unknown_tool"
        args={{ command: "create", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("unknown_tool")).toBeDefined();
  });

  test("state=result renders green dot and no spinner", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
      />
    );
    expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  test("state=call renders spinner and no green dot", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("state=partial renders spinner and no green dot", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="partial"
      />
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("badge wrapper has expected Tailwind classes", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="call"
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("inline-flex");
    expect(wrapper.className).toContain("font-mono");
    expect(wrapper.className).toContain("border-neutral-200");
  });

  test("state=result shows the label text, not raw tool name, when tool is known", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{ command: "delete", path: "/App.jsx" }}
        state="result"
      />
    );
    expect(screen.getByText("Deleting App.jsx")).toBeDefined();
  });
});
