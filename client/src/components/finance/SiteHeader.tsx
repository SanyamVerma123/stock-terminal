import { Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { TickerAutocomplete } from "./TickerAutocomplete";

const links = [{ href: "/", label: "Markets" }, { href: "/compare", label: "Compare" }, { href: "/chat", label: "AI Analyst" }];
export function SiteHeader({ compactSearch = true }: { compactSearch?: boolean }) {
  const [location] = useLocation();
  const active = (href: string) => location === href || (href === "/" && location.startsWith("/stock"));
  return <header className="source-header"><div className="source-header-inner"><Link href="/" className="source-brand"><span>S</span><b>Screener</b></Link>{compactSearch && <div className="source-header-search"><TickerAutocomplete compact placeholder="Search stocks, indices or companies"/></div>}<nav className="source-nav" aria-label="Primary">{links.map(link => <Link key={link.href} href={link.href} className={active(link.href) ? "active" : ""}>{link.label}</Link>)}</nav><button className="source-search-trigger" aria-label="Search markets"><Search size={17}/></button></div></header>;
}
