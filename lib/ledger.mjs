// Server-only helpers: XRPL connection, shared demo memory, small utilities.
import xrpl from 'xrpl';
import fs from 'node:fs';
import path from 'node:path';
import { SERVICES, KASI_CODE } from './shared.mjs';

export const NET = process.env.XRPL_URL || 'wss://s.altnet.rippletest.net:51233';
export const EXPLORER = 'https://testnet.xrpl.org/transactions/';

// Demo memory (no database). It resets when the server restarts.
const g = globalThis;
g.__shebispark ??= {
  client: null,
  units: {}, // meterId -> units left (kWh, L or MB)
  receipts: [], // latest payments, newest first
  challenges: new Map(), // open 402 price quotes
  agentSeen: 0, // last time the meter agent said hello
  attackRequested: false,
  locks: {},
  topups: {}, // daily top-up counter
};
export const S = g.__shebispark;

// Reads config/channels.json (made by `npm run setup`). No secrets inside.
export function loadConfig() {
  try {
    const file = path.join(process.cwd(), 'config', 'channels.json');
    const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const m of cfg.meters) {
      if (S.units[m.meterId] === undefined) S.units[m.meterId] = SERVICES[m.service].start;
    }
    return cfg;
  } catch {
    return null;
  }
}

export async function getClient() {
  if (!S.client) S.client = new xrpl.Client(NET, { connectionTimeout: 20000 });
  if (!S.client.isConnected()) await S.client.connect();
  return S.client;
}

export function wallet(name) {
  const seed = process.env[`${name}_SEED`];
  if (!seed) throw new Error(`Missing ${name}_SEED. Run: npm run setup`);
  return xrpl.Wallet.fromSeed(seed);
}

// Reads a Payment Channel straight from the ledger.
export async function channelInfo(channelId) {
  const c = await getClient();
  try {
    const r = await c.request({ command: 'ledger_entry', payment_channel: channelId, ledger_index: 'validated' });
    const n = r.result.node;
    return { open: true, amount: Number(n.Amount), balance: Number(n.Balance), publicKey: n.PublicKey };
  } catch {
    return { open: false, amount: 0, balance: 0, publicKey: null };
  }
}

// Sends a transaction and ALWAYS returns { ok, code, hash } - it never hides a failure.
export async function send(tx, signer) {
  const c = await getClient();
  try {
    const res = await c.submitAndWait(tx, { wallet: signer });
    const code = res.result.meta?.TransactionResult || 'unknown';
    return { ok: code === 'tesSUCCESS', code, hash: res.result.hash };
  } catch (e) {
    const msg = String(e?.message || e);
    const m = msg.match(/\bt[a-z]{2}[A-Z][A-Za-z_]+/);
    return { ok: false, code: m ? m[0] : 'error', hash: null, error: msg };
  }
}

export async function kasiBalance(address) {
  const c = await getClient();
  const r = await c.request({ command: 'account_lines', account: address });
  const line = r.result.lines.find((l) => l.currency === KASI_CODE);
  return line ? Number(line.balance) : 0;
}

// The utility is the KASI issuer. It pays loyalty points to a wallet.
export async function sendKasi(toAddress, value) {
  const u = wallet('UTILITY');
  return send(
    { TransactionType: 'Payment', Account: u.address, Destination: toAddress,
      Amount: { currency: KASI_CODE, issuer: u.address, value: String(value) } },
    u
  );
}

// One purchase at a time per meter, so payments cannot collide.
export async function withLock(key, fn) {
  const prev = S.locks[key] || Promise.resolve();
  let release;
  const next = new Promise((r) => (release = r));
  S.locks[key] = prev.then(() => next);
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}
