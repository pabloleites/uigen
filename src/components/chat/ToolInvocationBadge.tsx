"use client";

import { Loader2 } from "lucide-react";

export interface ToolInvocationBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "partial" | "call" | "result";
}

export function getToolLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  const rawPath = typeof args.path === "string" ? args.path : "";
  const basename = rawPath ? rawPath.split("/").at(-1) ?? rawPath : "";
  const suffix = basename ? ` ${basename}` : "";
  const command = typeof args.command === "string" ? args.command : "";

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":      return `Creating${suffix}`;
      case "str_replace": return `Editing${suffix}`;
      case "insert":      return `Editing${suffix}`;
      case "view":        return `Reading${suffix}`;
      case "undo_edit":   return `Undoing edit in${suffix}`;
      default:            return toolName;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename": return `Renaming${suffix}`;
      case "delete": return `Deleting${suffix}`;
      default:       return toolName;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolName, args, state }: ToolInvocationBadgeProps) {
  const label = getToolLabel(toolName, args);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
