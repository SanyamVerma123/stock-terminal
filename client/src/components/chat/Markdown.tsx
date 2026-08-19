import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mermaid } from "./Mermaid";
export function Markdown({ content }: { content: string }) { return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code({ className, children, ...props }) { const language = /language-(\w+)/.exec(className ?? "")?.[1]; if (language === "mermaid") return <Mermaid code={String(children).replace(/\n$/, "")} />; return <code className={className} {...props}>{children}</code>; } }}>{content}</ReactMarkdown></div>; }
