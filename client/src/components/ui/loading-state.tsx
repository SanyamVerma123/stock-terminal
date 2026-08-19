import { LoaderCircle } from "lucide-react";

/** Adapted from the supplemental archive's accessible loading-state structure. */
export function LoadingState({ label = "Loading live data", detail = "Retrieving the latest provider response." }: { label?: string; detail?: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><span><LoaderCircle className="spin" size={19}/></span><b>{label}</b><p>{detail}</p></div>;
}
