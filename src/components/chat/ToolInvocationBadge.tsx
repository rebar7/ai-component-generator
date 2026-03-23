"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

function getFilename(path: unknown): string {
  if (typeof path !== "string" || !path) return "";
  return path.split("/").filter(Boolean).pop() ?? path;
}

function getLabel(toolInvocation: ToolInvocation): string {
  const { toolName } = toolInvocation;
  const args = toolInvocation.args as Record<string, unknown>;
  const command = args?.command as string | undefined;
  const filename = getFilename(args?.path);

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return filename ? `Creating ${filename}` : "Creating file";
      case "str_replace":
      case "insert":
        return filename ? `Editing ${filename}` : "Editing file";
      case "view":
        return filename ? `Reading ${filename}` : "Reading file";
      case "undo_edit":
        return filename ? `Undoing edit in ${filename}` : "Undoing edit";
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return filename ? `Renaming ${filename}` : "Renaming file";
      case "delete":
        return filename ? `Deleting ${filename}` : "Deleting file";
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const isDone = toolInvocation.state === "result" && toolInvocation.result != null;
  const label = getLabel(toolInvocation);

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
