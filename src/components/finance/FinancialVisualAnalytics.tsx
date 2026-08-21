import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatementTable } from "@/lib/finance-types";
import { fmtCompact, fmtDate } from "@/lib/format";

type Props = {
  income: StatementTable | undefined;
  cash: StatementTable | undefined;
  currency: string | null | undefined;
};

const PALETTE = ["var(--primary)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function getRow(statement: StatementTable | undefined, labels: string[]) {
  return statement?.rows.find((row) => labels.some((label) => row.label.toLowerCase() === label.toLowerCase()));
}

function value(row: StatementTable["rows"][number] | undefined, index: number) {
  const candidate = row?.values[index];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}

function ChartEmpty({ label }: { label: string }) {
  return <div className="financial-chart-empty"><span>Provider data unavailable</span><p>{label}</p></div>;
}

export function FinancialVisualAnalytics({ income, cash, currency }: Props) {
  const revenue = getRow(income, ["Total Revenue"]);
  const operatingIncome = getRow(income, ["Operating Income"]);
  const netIncome = getRow(income, ["Net Income", "Net Income Common Stockholders"]);
  const cashFromOperations = getRow(cash, ["Operating Cash Flow"]);
  const investingCash = getRow(cash, ["Investing Cash Flow"]);
  const financingCash = getRow(cash, ["Financing Cash Flow"]);
  const freeCashFlow = getRow(cash, ["Free Cash Flow"]);
  const periods = income?.columns ?? cash?.columns ?? [];
  const trendData = periods.map((period, index) => ({
    period: fmtDate(period),
    Revenue: value(revenue, index),
    "Operating income": value(operatingIncome, index),
    "Net income": value(netIncome, index),
  })).filter((entry) => entry.Revenue !== null || entry["Operating income"] !== null || entry["Net income"] !== null);
  const cashData = (cash?.columns ?? []).map((period, index) => ({
    period: fmtDate(period),
    Operations: value(cashFromOperations, index),
    Investing: value(investingCash, index),
    Financing: value(financingCash, index),
    "Free cash flow": value(freeCashFlow, index),
  })).filter((entry) => Object.values(entry).some((entryValue) => typeof entryValue === "number"));
  const latestExpenseMix = [
    { name: "Cost of revenue", value: Math.abs(value(getRow(income, ["Cost Of Revenue"]), 0) ?? 0) },
    { name: "Operating expenses", value: Math.abs(value(getRow(income, ["Operating Expense"]), 0) ?? 0) },
    { name: "Tax provision", value: Math.abs(value(getRow(income, ["Tax Provision"]), 0) ?? 0) },
  ].filter((entry) => entry.value > 0);

  return (
    <section className="financial-visual-analytics" aria-labelledby="financial-visuals-title">
      <div className="financial-visuals-intro">
        <div>
          <p className="fundamentals-kicker">Visual analysis</p>
          <h3 id="financial-visuals-title">Performance, cash, and composition</h3>
        </div>
        <span>Provider-reported statement periods</span>
      </div>
      <div className="financial-visual-grid">
        <article className="financial-visual-card financial-visual-wide">
          <div className="financial-visual-card-heading"><div><p>Multi-year comparison</p><h4>Revenue &amp; profitability trend</h4></div><span>Annual / selected periods</span></div>
          {trendData.length >= 2 ? <div className="financial-chart-frame"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity=".25"/><stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={.5} strokeDasharray="3 6"/><XAxis dataKey="period" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={22}/><YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={54} tickFormatter={(number) => fmtCompact(number, currency)}/><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(number: number | string) => fmtCompact(Number(number), currency)}/><Area type="monotone" dataKey="Revenue" stroke="var(--primary)" strokeWidth={2.25} fill="url(#revenue-fill)" connectNulls/><Area type="monotone" dataKey="Operating income" stroke="var(--chart-3)" strokeWidth={1.75} fill="none" connectNulls/><Area type="monotone" dataKey="Net income" stroke="var(--chart-4)" strokeWidth={1.75} fill="none" connectNulls/></AreaChart></ResponsiveContainer></div> : <ChartEmpty label="Revenue and profit trend will appear when at least two statement periods are returned." />}
          <div className="financial-chart-key"><span><i className="revenue"/>Revenue</span><span><i className="operating"/>Operating income</span><span><i className="net"/>Net income</span></div>
        </article>
        <article className="financial-visual-card">
          <div className="financial-visual-card-heading"><div><p>Cash quality</p><h4>Cash-flow comparison</h4></div><span>By period</span></div>
          {cashData.length >= 2 ? <div className="financial-chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={cashData} margin={{ top: 10, right: 4, bottom: 0, left: -18 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={.5} strokeDasharray="3 6"/><XAxis dataKey="period" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20}/><YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={(number) => fmtCompact(number, currency)}/><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(number: number | string) => fmtCompact(Number(number), currency)}/><Bar dataKey="Operations" fill="var(--positive)" radius={[5,5,0,0]} /><Bar dataKey="Investing" fill="var(--chart-4)" radius={[5,5,0,0]} /><Bar dataKey="Financing" fill="var(--chart-5)" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div> : <ChartEmpty label="Operating, investing, and financing cash flows will appear when multiple periods are available." />}
        </article>
        <article className="financial-visual-card">
          <div className="financial-visual-card-heading"><div><p>Latest period</p><h4>Expense &amp; tax mix</h4></div><span>Absolute value</span></div>
          {latestExpenseMix.length > 0 ? <div className="financial-composition"><div className="financial-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(number: number | string) => fmtCompact(Number(number), currency)}/><Pie data={latestExpenseMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3} cornerRadius={7} stroke="none">{latestExpenseMix.map((entry, index) => <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />)}</Pie></PieChart></ResponsiveContainer></div><div className="financial-composition-legend">{latestExpenseMix.map((entry, index) => <div key={entry.name}><span style={{ background: PALETTE[index % PALETTE.length] }}/><b>{entry.name}</b><small>{fmtCompact(entry.value, currency)}</small></div>)}</div></div> : <ChartEmpty label="The latest expense and tax composition will appear when statement lines are available." />}
        </article>
      </div>
    </section>
  );
}
