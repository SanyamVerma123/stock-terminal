import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import mysql from "mysql2/promise";
import type { CloudAccount, CloudSyncState } from "./cloud-types";
import { sanitizeCloudSyncState } from "./cloud-types";

const scrypt = promisify(scryptCallback);
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
let pool: mysql.Pool | undefined;

function db() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("Cloud persistence is unavailable because the database connection is not configured.");
  pool ??= mysql.createPool({ uri: url, connectionLimit: 4, enableKeepAlive: true });
  return pool;
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

function validatePassword(value: string) {
  if (value.length < 10 || value.length > 256) {
    throw new Error("Use a password between 10 and 256 characters.");
  }
}

async function passwordDigest(password: string, salt: string) {
  const derived = await scrypt(password, salt, 64);
  if (derived instanceof ArrayBuffer) return Buffer.from(derived).toString("hex");
  if (ArrayBuffer.isView(derived)) return Buffer.from(derived.buffer).toString("hex");
  throw new Error("Password hashing returned an unsupported value.");
}

function accountFromRow(row: Record<string, unknown>): CloudAccount {
  return {
    id: Number(row["id"]),
    email: String(row["email"]),
    displayName: typeof row["displayName"] === "string" ? row["displayName"] : null,
  };
}

export async function registerCloudAccount(input: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const email = normalizeEmail(input.email);
  validatePassword(input.password);
  const salt = randomBytes(16).toString("hex");
  const passwordHash = await passwordDigest(input.password, salt);
  const displayName = input.displayName?.trim().slice(0, 80) || null;
  try {
    const [result] = await db().execute<mysql.ResultSetHeader>(
      "INSERT INTO terminal_accounts (email, password_hash, password_salt, display_name) VALUES (?, ?, ?, ?)",
      [email, passwordHash, salt, displayName],
    );
    return { id: result.insertId, email, displayName } satisfies CloudAccount;
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      throw new Error("An account already exists for this email. Sign in instead.");
    }
    throw error;
  }
}

export async function authenticateCloudAccount(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const [rows] = await db().execute<mysql.RowDataPacket[]>(
    "SELECT id, email, display_name AS displayName, password_hash AS passwordHash, password_salt AS passwordSalt FROM terminal_accounts WHERE email = ? LIMIT 1",
    [email],
  );
  const row = rows[0];
  if (!row) throw new Error("Email or password is incorrect.");
  const expected = Buffer.from(String(row["passwordHash"]), "hex");
  const received = Buffer.from(await passwordDigest(password, String(row["passwordSalt"])), "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error("Email or password is incorrect.");
  }
  await db().execute("UPDATE terminal_accounts SET last_signed_in = CURRENT_TIMESTAMP WHERE id = ?", [row["id"]]);
  return accountFromRow(row as Record<string, unknown>);
}

export async function createCloudSession(accountId: number) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db().execute(
    "INSERT INTO terminal_sessions (account_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY))",
    [accountId, tokenHash],
  );
  return token;
}

export async function cloudAccountFromSession(token: string | undefined) {
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [rows] = await db().execute<mysql.RowDataPacket[]>(
    "SELECT a.id, a.email, a.display_name AS displayName FROM terminal_sessions s JOIN terminal_accounts a ON a.id = s.account_id WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP LIMIT 1",
    [tokenHash],
  );
  return rows[0] ? accountFromRow(rows[0] as Record<string, unknown>) : null;
}

export async function removeCloudSession(token: string | undefined) {
  if (!token) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db().execute("DELETE FROM terminal_sessions WHERE token_hash = ?", [tokenHash]);
}

export async function loadCloudState(accountId: number): Promise<CloudSyncState | null> {
  const [rows] = await db().execute<mysql.RowDataPacket[]>(
    "SELECT state_json AS stateJson FROM terminal_state WHERE account_id = ? LIMIT 1",
    [accountId],
  );
  const raw = rows[0]?.["stateJson"];
  if (typeof raw !== "string") return null;
  try {
    return sanitizeCloudSyncState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveCloudState(accountId: number, input: unknown) {
  const state = { ...(await loadCloudState(accountId) ?? {}), ...sanitizeCloudSyncState(input) };
  await db().execute(
    "INSERT INTO terminal_state (account_id, state_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = CURRENT_TIMESTAMP",
    [accountId, JSON.stringify(state)],
  );
  return state;
}

export const CLOUD_SESSION_COOKIE = "__Host-screener_session";
export const CLOUD_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
