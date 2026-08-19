export function HtmlPreview({ html }: { html: string }) { return <iframe className="html-preview" title="Research artifact preview" sandbox="" srcDoc={html} />; }
