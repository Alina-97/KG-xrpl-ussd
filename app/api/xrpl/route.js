// Owner side: read the dashboard, and let the human owner change limits.
// The meter agent can NOT use these actions. They need the owner PIN and
// the owner's own wallet, which the meter never has.
import xrpl from 'xrpl';
import { NextResponse } from 'next/server';
import {
  SERVICES, KASI_CODE, KASI_TO_REDEEM, REDEEM_UNITS, TF_CLOSE, ALLOWED_TOPUPS, DAILY_TOPUP_LIMIT,
} from '../../../lib/shared.mjs';
import { S, loadConfig, channelInfo, kasiBalance, send, wallet } from '../../../lib/ledger.mjs';

export const dynamic = 'force-dynamic';

const xrp = (drops) => Number(xrpl.dropsToXrp(String(drops)));
const reply = (message, r, status = 200) =>
  NextResponse.json({ message, ok: r ? r.ok : false, result: r?.code, hash: r?.hash || null }, { status });

export async function GET() {
  const cfg = loadConfig();
  if (!cfg) return NextResponse.json({ setupNeeded: true });
  try {
    const meters = await Promise.all(
      cfg.meters.map(async (m) => {
        const ch = await channelInfo(m.channelId);
        const svc = SERVICES[m.service];
        return {
          meterId: m.meterId, label: m.label, service: m.service, unit: svc.unit, low: svc.low,
          source: m.source, open: ch.open, units: S.units[m.meterId],
          capXrp: xrp(ch.amount), spentXrp: xrp(ch.balance), remainingXrp: xrp(ch.amount - ch.balance),
        };
      })
    );
    const loyaltyPoints = await kasiBalance(cfg.addresses.tenant);
    const earnedXrp = xrp(S.receipts.filter((r) => r.ok).reduce((a, r) => a + r.drops, 0));
    return NextResponse.json({
      meters, loyaltyPoints, receipts: S.receipts, earnedXrp,
      agentOnline: Date.now() - S.agentSeen < 10_000, attackRequested: S.attackRequested,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Cannot reach XRPL Testnet. ' + e.message }, { status: 502 });
  }
}

export async function POST(req) {
  if (req.headers.get('x-owner-pin') !== (process.env.OWNER_PIN || '1234')) {
    return reply('Wrong PIN.', null, 401);
  }
  const cfg = loadConfig();
  if (!cfg) return reply('Run npm run setup first.', null, 400);

  try {
    const { action, meterId = 'POWER-101', amount } = await req.json();
    const m = cfg.meters.find((x) => x.meterId === meterId);
    if (!m && action !== 'REDEEM_LOYALTY' && action !== 'SETTLE_TO_BANK') return reply('Unknown meter.', null, 400);

    // Owner raises the budget. Only the person who funded the channel can do this.
    if (action === 'INCREASE_LIMIT') {
      const add = Number(amount);
      if (!ALLOWED_TOPUPS.includes(add)) return reply(`Choose ${ALLOWED_TOPUPS.join(', ')} XRP.`, null, 400);
      const key = `${m.meterId}:${new Date().toISOString().slice(0, 10)}`;
      if ((S.topups[key] || 0) + add > DAILY_TOPUP_LIMIT) return reply('Daily limit reached. Try tomorrow.', null, 429);
      const w = wallet(m.source);
      const r = await send(
        { TransactionType: 'PaymentChannelFund', Account: w.address, Channel: m.channelId, Amount: xrpl.xrpToDrops(String(add)) },
        w
      );
      if (r.ok) S.topups[key] = (S.topups[key] || 0) + add;
      return reply(r.ok ? `Limit raised by ${add} XRP.` : `Ledger said ${r.code}.`, r);
    }

    // Owner stops the spending. Unused XRP returns after the settle delay (60 s here).
    if (action === 'CLOSE_CHANNEL') {
      const w = wallet(m.source);
      const r = await send({ TransactionType: 'PaymentChannelClaim', Account: w.address, Channel: m.channelId, Flags: TF_CLOSE }, w);
      return reply(r.ok ? 'Stop requested. Unused XRP returns in about 60 seconds.' : `Ledger said ${r.code}.`, r);
    }

    // Trade loyalty points for free power.
    if (action === 'REDEEM_LOYALTY') {
      const points = await kasiBalance(cfg.addresses.tenant);
      if (points < KASI_TO_REDEEM) return reply(`Need ${KASI_TO_REDEEM} KASI. You have ${points}.`, null, 400);
      const t = wallet('TENANT');
      const r = await send(
        { TransactionType: 'Payment', Account: t.address, Destination: cfg.addresses.utility,
          Amount: { currency: KASI_CODE, issuer: cfg.addresses.utility, value: String(KASI_TO_REDEEM) } },
        t
      );
      if (r.ok) S.units['POWER-101'] += REDEEM_UNITS;
      return reply(r.ok ? `Redeemed ${KASI_TO_REDEEM} KASI for ${REDEEM_UNITS} kWh free power.` : `Ledger said ${r.code}.`, r);
    }

    // MOCK cash-out so judges can see the path to a bank. No real money moves.
    if (action === 'SETTLE_TO_BANK') {
      const earned = xrp(S.receipts.filter((r) => r.ok).reduce((a, r) => a + r.drops, 0));
      const rate = Number(process.env.DEMO_ZAR_PER_XRP || 10);
      return reply(`MOCK payout: R${(earned * rate).toFixed(2)} to bank (${earned} XRP at a demo rate).`, { ok: true });
    }

    return reply('Unknown action.', null, 400);
  } catch (e) {
    return reply('Error: ' + e.message, null, 500);
  }
}
