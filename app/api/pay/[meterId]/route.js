// The "pay per use" door. A meter asks for power, we answer HTTP 402 (payment required)
// with a price. The meter replies with a signed voucher. We check it, claim it on the
// XRP Ledger, then hand over the units. One price, one voucher, one receipt.
import xrpl from 'xrpl';
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { SERVICES, KASI_PER_STEP } from '../../../../lib/shared.mjs';
import { S, loadConfig, channelInfo, send, sendKasi, wallet, withLock } from '../../../../lib/ledger.mjs';

export const dynamic = 'force-dynamic';

const out = (o, status = 200, headers = {}) => NextResponse.json(o, { status, headers });

export async function GET(req, { params }) {
  const { meterId } = await params;
  const m = loadConfig()?.meters.find((x) => x.meterId === meterId);
  if (!m) return out({ error: 'unknown_meter' }, 404);

  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Payment ')) return askForPayment(m);
  return withLock(meterId, () => takePayment(m, auth));
}

// Step 1: say what it costs.
async function askForPayment(m) {
  const svc = SERVICES[m.service];
  const ch = await channelInfo(m.channelId);
  if (!ch.open) return out({ error: 'channel_closed' }, 402);

  const cumulative = ch.balance + svc.stepDrops; // vouchers always add up, never reset
  if (cumulative > ch.amount) return out({ error: 'budget_used_up' }, 402);

  const id = crypto.randomUUID();
  S.challenges.set(id, { meterId: m.meterId, cumulative, exp: Date.now() + 60_000 });
  return out(
    { error: 'payment_required', challengeId: id, meterId: m.meterId, service: m.service,
      channelId: m.channelId, cumulativeDrops: String(cumulative), priceDrops: String(svc.stepDrops),
      units: svc.stepUnits, unit: svc.unit, expiresInSec: 60 },
    402,
    { 'WWW-Authenticate': `Payment method="xrpl-channel", challenge="${id}"` }
  );
}

// Step 2: check the voucher, claim it on the ledger, deliver.
async function takePayment(m, auth) {
  const svc = SERVICES[m.service];
  let cred;
  try {
    cred = JSON.parse(Buffer.from(auth.slice(8), 'base64').toString());
  } catch {
    return out({ error: 'bad_credential' }, 400);
  }

  const ch = await channelInfo(m.channelId);
  if (!ch.open) return out({ error: 'channel_closed' }, 402);

  // DEMO ONLY: lets the "overdraw test" skip our own checks so you can see
  // that the LEDGER itself refuses. Turn off with DEMO_ALLOW_ATTACK=false.
  const attack = process.env.DEMO_ALLOW_ATTACK === 'true' && cred.attack === true;
  const cumulative = Number(cred.cumulativeDrops);

  if (!attack) {
    const q = S.challenges.get(cred.challengeId);
    S.challenges.delete(cred.challengeId); // each quote works once
    if (!q || q.meterId !== m.meterId || q.exp < Date.now()) return out({ error: 'bad_or_old_quote' }, 402);
    if (cumulative !== q.cumulative || cumulative !== ch.balance + svc.stepDrops) return out({ error: 'stale_price' }, 402);
    if (cumulative > ch.amount) return out({ error: 'budget_used_up' }, 402);
  }

  let sigOk = false;
  try {
    sigOk = xrpl.verifyPaymentChannelClaim(m.channelId, String(cumulative), cred.signature, ch.publicKey);
  } catch {}
  if (!sigOk) return out({ error: 'bad_signature' }, 402);

  const utility = wallet('UTILITY');
  const r = await send(
    { TransactionType: 'PaymentChannelClaim', Account: utility.address, Channel: m.channelId,
      Balance: String(cumulative), Amount: String(cumulative), Signature: cred.signature, PublicKey: ch.publicKey },
    utility
  );

  const receipt = {
    id: crypto.randomUUID(), time: Date.now(), meterId: m.meterId, service: m.service,
    units: r.ok ? svc.stepUnits : 0, unit: svc.unit, drops: r.ok ? svc.stepDrops : cumulative,
    hash: r.hash, result: r.code, ok: r.ok, attack,
  };
  S.receipts = [receipt, ...S.receipts].slice(0, 30);

  if (!r.ok) return out({ error: 'ledger_rejected', ledgerResult: r.code, hash: r.hash }, 402);

  S.units[m.meterId] += svc.stepUnits;
  await sendKasi(wallet(m.source).address, KASI_PER_STEP); // loyalty points; never blocks delivery

  return out(
    { delivered: { units: svc.stepUnits, unit: svc.unit }, receipt },
    200,
    { 'Payment-Receipt': Buffer.from(JSON.stringify({ hash: r.hash, meterId: m.meterId, cumulative })).toString('base64') }
  );
}
