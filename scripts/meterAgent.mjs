// The smart meter. It runs on its own and holds ONLY the meter signing keys.
// When units get low it asks the server for a price (HTTP 402), signs a voucher, pays.
// Run:  npm run agent         (normal)
//       npm run agent:demo    (also pretends to use power, so you can watch it top up)
import xrpl from 'xrpl';

const SERVER = process.env.SERVER_URL || 'http://localhost:3000';
const KEYS = JSON.parse(process.env.METER_KEYS || '{}');
const wallets = Object.fromEntries(Object.entries(KEYS).map(([id, seed]) => [id, xrpl.Wallet.fromSeed(seed)]));
const drain = process.argv.includes('--drain');
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, { headers = {}, body } = {}) {
  const res = await fetch(SERVER + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

// Ask for a price, sign a voucher, pay. `extra` is only used by the overdraw test.
async function pay(meterId, extra = {}) {
  const ask = await call(`/api/pay/${meterId}`);
  if (ask.status !== 402 || ask.data.error !== 'payment_required') {
    return { status: ask.status, data: ask.data };
  }
  const q = ask.data;
  const amount = extra.cumulativeDrops ?? q.cumulativeDrops;
  const signature = xrpl.signPaymentChannelClaim(q.channelId, amount, wallets[meterId].privateKey);
  const voucher = Buffer.from(
    JSON.stringify({ challengeId: q.challengeId, cumulativeDrops: amount, signature, ...extra })
  ).toString('base64');
  return call(`/api/pay/${meterId}`, { headers: { Authorization: `Payment ${voucher}` } });
}

async function topUp(meterId) {
  const { status, data } = await pay(meterId);
  if (status === 200) log(`${meterId}: paid. +${data.delivered.units} ${data.delivered.unit}. tx ${data.receipt.hash}`);
  else log(`${meterId}: not paid (${data.error || status}${data.ledgerResult ? ', ledger: ' + data.ledgerResult : ''})`);
}

// Proof that the LEDGER sets the limit: try to take 999 XRP. It must fail.
async function overdrawTest() {
  log('Overdraw test: trying to claim 999 XRP...');
  const { data } = await pay('POWER-101', { cumulativeDrops: xrpl.xrpToDrops('999'), attack: true });
  log(`Ledger answer: ${data.ledgerResult || data.error || 'unexpected'}  (a refusal here is the GOOD result)`);
}

log(`Meter agent started. Server: ${SERVER}. Meters: ${Object.keys(wallets).join(', ') || 'none (run npm run setup)'}`);
for (;;) {
  try {
    const { data: s } = await call('/api/meter');
    await call('/api/meter', { body: { action: 'heartbeat' } });
    for (const m of s.meters || []) {
      if (!wallets[m.meterId]) continue;
      if (drain) await call('/api/meter', { body: { action: 'use', meterId: m.meterId } });
      if (m.units < m.low) await topUp(m.meterId);
    }
    if (s.attackRequested) {
      await overdrawTest();
      await call('/api/meter', { body: { action: 'attack_done' } });
    }
  } catch (e) {
    log('Waiting for the server...', e.message);
  }
  await sleep(4000);
}
