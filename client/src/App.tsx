import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotFound from "./pages/NotFound";

const Home = lazy(() => import("./pages/Home"));
const StockDetail = lazy(() => import("./pages/StockDetail"));
const Compare = lazy(() => import("./pages/Compare"));
const Chat = lazy(() => import("./pages/Chat"));

function RouteFallback() { return <main className="route-fallback"><span className="pulse"/> Loading research workspace…</main>; }
function Router() { return <Suspense fallback={<RouteFallback/>}><Switch><Route path="/" component={Home}/><Route path="/stock/:symbol" component={StockDetail}/><Route path="/compare" component={Compare}/><Route path="/chat" component={Chat}/><Route component={NotFound}/></Switch></Suspense>; }
export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark" switchable><TooltipProvider><Toaster/><Router/></TooltipProvider></ThemeProvider></ErrorBoundary>; }
