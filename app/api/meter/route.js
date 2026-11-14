// The (simulated) meter's counters. The meter agent reads and writes here.
// None of these actions move money. Money only moves through /api/pay and /api/xrpl.
import { NextResponse } from 'next/server';
import { SERVICES } from '../../../lib/shared.mjs';
import { S, loadConfig } from '../../../lib/ledger.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = loadConfig();
  if (!cfg) return NextResponse.json({ setupNeeded: true, meters: [] });
  const meters = cfg.meters.map((m) => ({
    meterId: m.meterId, service: m.service, units: S.units[m.meterId], low: SERVICES[m.service].low,
  }));
  return NextResponse.json({ meters, attackRequested: S.attackRequested });
}

export async function POST(req) {
  const { action, meterId } = await req.json();
  const cfg = loadConfig();
  if (action === 'heartbeat') S.agentSeen = Date.now();
  if (action === 'attack_request') S.attackRequested = true;
  if (action === 'attack_done') S.attackRequested = false;
  if (action === 'use' && cfg) {
    const m = cfg.meters.find((x) => x.meterId === meterId);
    if (m) S.units[meterId] = Math.max(0, S.units[meterId] - SERVICES[m.service].useUnits);
  }
  return NextResponse.json({ ok: true });
}
