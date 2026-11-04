"use client";
import Link from "next/link";
import * as React from "react";
import { createContext, useContext } from "react";
import { useEditor } from "./editable";

/** In previews (draft / template / version) site links are rewritten to stay inside the preview. */
export const LinkPrefixContext = createContext<string>("");
export function LinkPrefix({ prefix, children }: { prefix: string; children: React.ReactNode }) {
  return <LinkPrefixContext.Provider value={prefix}>{children}</LinkPrefixContext.Provider>;
}
export function usePrefixedHref(href: string) {
  const prefix = useContext(LinkPrefixContext);
  if (!prefix || !href.startsWith("/") || /^\/(app|api|media|login|logout|forgot-password|preview)(\/|$|\?)/.test(href)) return href;
  return prefix + (href === "/" ? "" : href);
}

/** In the editor, links never navigate (clicks select elements instead). */
export function SLink({ href, className, children, style, ...rest }: { href: string; className?: string; children: React.ReactNode; style?: React.CSSProperties } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const ed = useEditor();
  const target = usePrefixedHref(href || "/");
  if (ed) return <a className={className} style={style} onClick={(e) => e.preventDefault()} href={href}>{children}</a>;
  if (/^(https?:|mailto:|tel:)/.test(href)) return <a href={href} className={className} style={style} target="_blank" rel="noreferrer" {...rest}>{children}</a>;
  return <Link href={target} className={className} style={style} {...rest}>{children}</Link>;
}
