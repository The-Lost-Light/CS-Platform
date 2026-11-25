import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "./cn";

const REMARK_PLUGINS = [remarkGfm];

export function MarkdownContent({ children, className }: { children: string; className?: string }) {
  return (
    <article className={cn("ui-markdown", className)}>
      <Markdown remarkPlugins={REMARK_PLUGINS}>{children}</Markdown>
    </article>
  );
}
