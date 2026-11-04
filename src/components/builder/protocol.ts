import type { SiteSnapshot } from "@/lib/site/types";

// postMessage protocol between the editor (parent window) and the canvas iframe. Both sides are
// same-origin and verify `event.origin` and `event.source` before acting on a message.
export const EDITOR_MSG = "__riiEditor";
export const CANVAS_MSG = "__riiCanvas";

export type EditorToCanvas =
  | { type: "state"; snapshot: SiteSnapshot; page: number; selected: string | null }
  | { type: "scrollTo"; id: string };

export type CanvasToEditor =
  | { type: "ready" }
  | { type: "select"; id: string }
  | { type: "text"; id: string; field: string; value: string }
  | { type: "move"; from: number; to: number }
  | { type: "action"; id: string; op: "up" | "down" | "duplicate" | "toggle" | "delete" }
  | { type: "insert"; index: number };
