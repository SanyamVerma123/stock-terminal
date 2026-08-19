import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResearchCardProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

/**
 * A finance-specific adaptation of the supplied 21st.dev Card hierarchy.
 * It keeps the simple header/content affordance while using the product's data-dense visual tokens.
 */
export function ResearchCard({ className, children, ...props }: ResearchCardProps) {
  return <section className={cn("panel research-card", className)} {...props}>{children}</section>;
}
