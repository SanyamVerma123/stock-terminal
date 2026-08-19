import { Code2, FileText, GitBranch } from "lucide-react";
import { useState } from "react";
import type { Artifact } from "./artifact-types";
import { HtmlPreview } from "./HtmlPreview";
import { Markdown } from "./Markdown";
import { Mermaid } from "./Mermaid";
export function ArtifactPanel({ artifact }: { artifact: Artifact | null }) { const [open, setOpen] = useState(true); if (!artifact) return <aside className="artifact-panel empty"><FileText size={21}/><b>Research artifacts</b><span>Tables, code, visual previews, and diagrams from the current thread appear here.</span></aside>; const Icon = artifact.kind === "html" ? Code2 : artifact.kind === "mermaid" ? GitBranch : FileText; return <aside className={`artifact-panel ${open ? "" : "collapsed"}`}><button className="artifact-heading" onClick={() => setOpen(!open)}><span><Icon size={16}/>{artifact.title}</span><span>{open ? "−" : "+"}</span></button>{open && <div className="artifact-content">{artifact.kind === "html" ? <HtmlPreview html={artifact.content}/> : artifact.kind === "mermaid" ? <Mermaid code={artifact.content}/> : <Markdown content={artifact.content}/>}</div>}</aside>; }
