import { Moon, Sun } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { TickerAutocomplete } from "./TickerAutocomplete";
const links = [{ href: "/", label: "Markets" }, { href: "/compare", label: "Compare" }, { href: "/chat", label: "Research" }];
export function SiteHeader() { const [location] = useLocation(); const { theme, toggleTheme } = useTheme(); return <header className="site-header"><Link href="/" className="brand"><span className="brand-mark">IS</span><span>Insightful <b>Search</b></span></Link><nav className="site-nav">{links.map(link => <Link key={link.href} href={link.href} className={location === link.href || (link.href === "/" && location.startsWith("/stock")) ? "active" : ""}>{link.label}</Link>)}</nav><div className="header-tools"><TickerAutocomplete compact /><button className="icon-button" onClick={toggleTheme} aria-label="Toggle color theme">{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button></div></header>; }
