import { createHash, timingSafeEqual } from "node:crypto";
import mysql from "mysql2/promise";
import { fetchScreenEquities, type EquityScreenInput } from "./finance-data.server";

let pool: mysql.Pool | undefined;

function db() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("Cloud persistence is unavailable because the database connection is not configured.");
  pool ??= mysql.createPool({ uri: url, connectionLimit: 3, enableKeepAlive: true });
  return pool;
}

function equalHash(expected: string, value: string) {
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(createHash("sha256").update(value).digest("hex"), "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function authorizeScreenerAlertSchedule(token: string) {
  const [rows] = await db().execute<mysql.RowDataPacket[]>(
    "SELECT secret_hash AS secretHash FROM terminal_scheduler_jobs WHERE job_key = 'screener_alerts' LIMIT 1",
  );
  const secretHash = rows[0]?.["secretHash"];
  return typeof secretHash === "string" && token.length >= 32 && equalHash(secretHash, token);
}

type StoredScreener = { id: string; name: string; filters: Record<string, unknown> };
type StoredRule = { id: string; screenerId: string; enabled: boolean; lastMatchKey?: string };
type StoredNotification = { id: string; screenerId: string; screenerName: string; symbols: string[]; createdAt: string; read: boolean };

function screenInput(filters: Record<string, unknown>): EquityScreenInput {
  const text = (key: string) => typeof filters[key] === "string" ? filters[key] : undefined;
  const number = (key: string) => typeof filters[key] === "string" && filters[key].trim() !== "" && Number.isFinite(Number(filters[key])) ? Number(filters[key]) : undefined;
  const withText = (key: string) => {
    const value = text(key);
    return value === undefined ? {} : { [key]: value };
  };
  const withNumber = (key: string) => {
    const value = number(key);
    return value === undefined ? {} : { [key]: value };
  };
  return {
    region: text("region") ?? "us",
    size: Math.min(50, Math.max(1, Number(filters["size"]) || 50)),
    sortAscending: filters["sortAscending"] === true,
    ...withText("sortField"), ...withText("sector"), ...withText("industry"), ...withText("exchange"), ...withText("nameContains"),
    ...withNumber("minMarketCap"), ...withNumber("maxMarketCap"), ...withNumber("minPe"), ...withNumber("maxPe"),
    ...withNumber("minGrowth"), ...withNumber("minDividendYield"), ...withNumber("minPrice"), ...withNumber("maxPrice"),
    ...withNumber("minVolume"), ...withNumber("minChangePercent"), ...withNumber("maxChangePercent"),
  };
}

function asScreeners(value: unknown): StoredScreener[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return typeof record["id"] === "string" && typeof record["name"] === "string" && record["filters"] && typeof record["filters"] === "object"
      ? [{ id: record["id"], name: record["name"], filters: record["filters"] as Record<string, unknown> }]
      : [];
  });
}

function asRules(value: unknown): StoredRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return typeof record["id"] === "string" && typeof record["screenerId"] === "string"
      ? [{ id: record["id"], screenerId: record["screenerId"], enabled: record["enabled"] !== false, ...(typeof record["lastMatchKey"] === "string" ? { lastMatchKey: record["lastMatchKey"] } : {}) }]
      : [];
  });
}

function asNotifications(value: unknown): StoredNotification[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is StoredNotification => Boolean(item && typeof item === "object")).slice(0, 500);
}

/** Runs in a cron callback. Initial runs establish a baseline; only later changes create an inbox record. */
export async function evaluateSavedScreenerAlerts() {
  const [rows] = await db().execute<mysql.RowDataPacket[]>(
    "SELECT account_id AS accountId, state_json AS stateJson FROM terminal_state WHERE state_json LIKE '%screenerAlertRules%' LIMIT 100",
  );
  let accountsChecked = 0;
  let notificationsCreated = 0;
  for (const row of rows) {
    let state: Record<string, unknown>;
    try {
      state = JSON.parse(String(row["stateJson"])) as Record<string, unknown>;
    } catch {
      continue;
    }
    const rules = asRules(state["screenerAlertRules"]);
    const screeners = asScreeners(state["screeners"]);
    if (rules.every((rule) => !rule.enabled)) continue;
    let changed = false;
    const notifications = asNotifications(state["screenerNotifications"]);
    for (let index = 0; index < rules.length; index += 1) {
      const rule = rules[index]!;
      if (!rule.enabled) continue;
      const screener = screeners.find((item) => item.id === rule.screenerId);
      if (!screener) continue;
      const matches = await fetchScreenEquities(screenInput(screener.filters));
      const symbols = matches.map((match) => match.symbol).filter(Boolean).slice(0, 25);
      const matchKey = symbols.join(",");
      if (rule.lastMatchKey && rule.lastMatchKey !== matchKey && symbols.length > 0) {
        notifications.unshift({
          id: crypto.randomUUID(),
          screenerId: screener.id,
          screenerName: screener.name,
          symbols: symbols.slice(0, 8),
          createdAt: new Date().toISOString(),
          read: false,
        });
        notificationsCreated += 1;
      }
      if (rule.lastMatchKey !== matchKey) {
        rules[index] = { ...rule, lastMatchKey: matchKey };
        changed = true;
      }
    }
    accountsChecked += 1;
    if (changed) {
      state["screenerAlertRules"] = rules;
      state["screenerNotifications"] = notifications.slice(0, 500);
      await db().execute(
        "UPDATE terminal_state SET state_json = ?, updated_at = CURRENT_TIMESTAMP WHERE account_id = ?",
        [JSON.stringify(state), row["accountId"]],
      );
    }
  }
  return { accountsChecked, notificationsCreated };
}
