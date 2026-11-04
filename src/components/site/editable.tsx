"use client";
import * as React from "react";
import { createContext, useContext } from "react";

export type EditorApi = {
  onText: (sectionId: string, field: string, value: string) => void;
};
export const EditorContext = createContext<EditorApi | null>(null);
export const useEditor = () => useContext(EditorContext);

type Tag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div" | "li";

/**
 * Text that becomes inline-editable (contentEditable) inside the visual editor.
 * On the live site it renders as plain text.
 */
export function Editable({ as = "span", sectionId, field, value, className, style }: {
  as?: Tag; sectionId?: string; field: string; value: string | undefined; className?: string; style?: React.CSSProperties;
}) {
  const ed = useEditor();
  const Comp = as as React.ElementType;
  if (!ed || !sectionId) return <Comp className={className} style={style}>{value}</Comp>;
  return (
    <Comp
      className={className}
      style={style}
      data-editable="true"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onClick={(e: React.MouseEvent) => e.preventDefault()}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && as !== "p" && as !== "div") { e.preventDefault(); (e.target as HTMLElement).blur(); }
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = e.currentTarget.innerText;
        if (v !== value) ed.onText(sectionId, field, v);
      }}
    >
      {value}
    </Comp>
  );
}
