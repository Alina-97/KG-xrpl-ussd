// @ts-nocheck
'use client';
import { useCallback, useEffect, useState } from 'react';

const APP_NAME = 'ShebiSpark';
const TAGLINE = 'Power that tops itself up.';
const EXPLORER = 'https://testnet.xrpl.org/transactions/';

type Meter = {
  meterId: string; label: string; service: string; unit: string; low: number; source: string;
  open: boolean; units: number; capXrp: number; spentXrp: number; remainingXrp: number;
};
type Receipt = {
  id: string; time: number; meterId: string; units: number; unit: string; drops: number;
  hash: string | null; result: string; ok: boolean; attack?: boolean;
};
type Dash = {
  meters: Meter[]; loyaltyPoints: number; receipts: Receipt[]; earnedXrp: number;
  agentOnline: boolean; attackRequested: boolean;
};
type Reply = { message: string; hash: string | null; ok: boolean };

const MENU = `${APP_NAME}\n1 Balances\n2 Raise limit +10 XRP\n3 Redeem 10 KASI\n4 Fund Mom's meter +5\n5 Stop power spending`;
const KEYS: [string, string][] = [
  ['1', '.,!'], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', '+'], ['0', '_'], ['#', ''],
];

function MeterCard({ m, onUse, onRaise, onStop }: { m: Meter; onUse: () => void; onRaise: () => void; onStop: () => void }) {
  const used = m.capXrp > 0 ? Math.min(100, Math.round((m.spentXrp / m.capXrp) * 100)) : 0;
  const low = m.units < m.low;
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-[#18181B]">{m.label}</h3>
        <span className="text-xs text-[#57534E]">{m.source === 'SPONSOR' ? 'Paid for by family' : 'Paid by the owner'}</span>
      </div>
      <p className={`mt-3 text-3xl font-serif ${low ? 'text-red-700' : 'text-[#065F46]'}`}>
        {m.units} <span className="text-base text-[#57534E]">{m.unit} left</span>
      </p>
      <div className="mt-4 h-2 rounded-full bg-[#F7F6F2] border border-[#E7E5E4] overflow-hidden">
        <div className="h-full bg-[#065F46] transition-all duration-500" style={{ width: `${used}%` }} />
      </div>
      <p className="mt-2 text-xs text-[#57534E]">
        {m.open ? `${m.remainingXrp} XRP left of the ${m.capXrp} XRP limit` : 'Budget closed. No more spending.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onUse} disabled={!m.open} className="text-xs font-medium px-3 py-2 rounded-lg bg-[#F7F6F2] border border-[#E7E5E4] text-[#18181B] hover:bg-[#E7E5E4] disabled:opacity-40">Use some</button>
        <button onClick={onRaise} disabled={!m.open} className="text-xs font-medium px-3 py-2 rounded-lg bg-[#065F46] text-white hover:bg-[#064E3B] disabled:opacity-40">Raise limit +10</button>
        <button onClick={onStop} disabled={!m.open} className="text-xs font-medium px-3 py-2 rounded-lg border border-[#E7E5E4] text-[#57534E] hover:bg-[#F7F6F2] disabled:opacity-40">Stop spending</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<Dash | null>(null);
  const [problem, setProblem] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [notice, setNotice] = useState('');
  const [screen, setScreen] = useState<'DIAL' | 'MENU' | 'RESPONSE'>('DIAL');
  const [dial, setDial] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/xrpl', { cache: 'no-store' });
      const json = await res.json();
      if (json.setupNeeded) setNeedsSetup(true);
      else if (!res.ok) setProblem(json.error || 'Cannot reach the XRP Ledger.');
      else { setData(json); setProblem(''); setNeedsSetup(false); }
    } catch {
      setProblem('Cannot reach the server.');
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function ownerAction(action: string, extra: Record<string, unknown> = {}): Promise<Reply> {
    const res = await fetch('/api/xrpl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-owner-pin': pin },
      body: JSON.stringify({ action, ...extra }),
    });
    const json = await res.json();
    await load();
    return json;
  }

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setNotice('Working on the XRP Ledger...');
    const r = await ownerAction(action, extra);
    setNotice(r.message + (r.hash ? ` Ref ${r.hash.slice(0, 10)}...` : ''));
  }

  async function useSome(meterId: string) {
    await fetch('/api/meter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'use', meterId }) });
    load();
  }

  async function overdrawTest() {
    await fetch('/api/meter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'attack_request' }) });
    setNotice(data?.agentOnline ? 'Overdraw test sent to the meter agent. Watch the list below.' : 'Start the meter agent first: npm run agent:demo');
  }

  // ---- USSD phone ----
  const show = (t: string) => { setText(t); setScreen('RESPONSE'); };

  async function ussd(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    show('Working on the XRP Ledger...\nPlease wait.');
    const r = await ownerAction(action, extra);
    setBusy(false);
    show(r.message + (r.hash ? `\n\nRef: ${r.hash.slice(0, 14)}...` : ''));
  }

  async function choose(c: string) {
    const power = data?.meters.find((m) => m.meterId === 'POWER-101');
    if (c === '1') show(`Power: ${power?.units ?? '-'} kWh\nLimit left: ${power?.remainingXrp ?? '-'} XRP\nKASI points: ${data?.loyaltyPoints ?? 0}`);
    else if (c === '2') await ussd('INCREASE_LIMIT', { meterId: 'POWER-101', amount: 10 });
    else if (c === '3') await ussd('REDEEM_LOYALTY');
    else if (c === '4') await ussd('INCREASE_LIMIT', { meterId: 'MOM-FS-402', amount: 5 });
    else if (c === '5') await ussd('CLOSE_CHANNEL', { meterId: 'POWER-101' });
    else show(`Invalid option "${c}".\nDial *120*555# to start again.`);
  }

  function press(d: string) {
    if (busy) return;
    if (screen === 'RESPONSE') { setScreen('DIAL'); setDial(d); return; }
    setDial((p) => p + d);
  }

  async function call() {
    if (busy) return;
    const entry = dial.trim();
    setDial('');
    if (screen === 'DIAL') {
      if (entry === '*120*555#') setScreen('MENU');
      else show(`Invalid code "${entry || 'empty'}".\nDial *120*555# and press Call.`);
      return;
    }
    if (screen === 'MENU') await choose(entry);
  }

  const lcd = screen === 'MENU' ? MENU : screen === 'RESPONSE' ? text : 'Dial *120*555#\nthen press Call';

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#18181B]">
      <header className="bg-white border-b border-[#E7E5E4]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl tracking-tight">{APP_NAME}</h1>
            <p className="text-sm text-[#57534E]">{TAGLINE} Tembisa pilot, Room 101.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full border border-[#E7E5E4] bg-[#F7F6F2] text-[#065F46]">XRPL Testnet</span>
            <span className={`px-3 py-1.5 rounded-full border ${data?.agentOnline ? 'border-[#065F46] text-[#065F46] bg-[#065F46]/5' : 'border-[#E7E5E4] text-[#57534E]'}`}>
              {data?.agentOnline ? 'Meter agent is running' : 'Meter agent is off'}
            </span>
            <span className="px-3 py-1.5 rounded-full border border-[#B45309]/30 bg-[#B45309]/5 text-[#B45309]">{data?.loyaltyPoints ?? 0} KASI points</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {needsSetup && (
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-5 text-sm">
              Nothing is set up yet. Run <code className="bg-[#F7F6F2] px-1.5 py-0.5 rounded">npm run setup</code> in the terminal, then refresh this page.
            </div>
          )}
          {problem && <div className="bg-white border border-red-300 text-red-800 rounded-xl p-4 text-sm">{problem} The numbers below may be old.</div>}

          <div className="grid sm:grid-cols-2 gap-4">
            {data?.meters.map((m) => (
              <MeterCard
                key={m.meterId}
                m={m}
                onUse={() => useSome(m.meterId)}
                onRaise={() => run('INCREASE_LIMIT', { meterId: m.meterId, amount: 10 })}
                onStop={() => run('CLOSE_CHANNEL', { meterId: m.meterId })}
              />
            ))}
          </div>

          <section className="bg-white border border-[#E7E5E4] rounded-xl p-5">
            <h2 className="font-semibold">Operator tools</h2>
            <p className="text-sm text-[#57534E] mt-1">The ledger sets the limit. Try to break it, then cash out.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={overdrawTest} className="text-sm font-medium px-4 py-2.5 rounded-lg bg-[#18181B] text-white hover:bg-[#292524]">Try to overspend</button>
              <button onClick={() => run('SETTLE_TO_BANK')} className="text-sm font-medium px-4 py-2.5 rounded-lg border border-[#E7E5E4] hover:bg-[#F7F6F2]">
                Pay out to bank (demo): {data?.earnedXrp ?? 0} XRP earned
              </button>
            </div>
            {notice && <p className="mt-4 text-sm text-[#065F46]">{notice}</p>}
          </section>

          <section className="bg-white border border-[#E7E5E4] rounded-xl p-5">
            <h2 className="font-semibold">Payments</h2>
            {!data?.receipts.length && <p className="text-sm text-[#57534E] mt-2">No payments yet. Use some power and let the meter agent top it up.</p>}
            <ul className="mt-3 divide-y divide-[#E7E5E4]">
              {data?.receipts.map((r) => (
                <li key={r.id} className="py-3 flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">{r.meterId}</span>{' '}
                    {r.ok ? <span className="text-[#065F46]">paid, +{r.units} {r.unit}</span> : <span className="text-red-700">refused by the ledger ({r.result})</span>}
                  </span>
                  <span className="text-xs text-[#57534E] whitespace-nowrap">
                    {new Date(r.time).toLocaleTimeString()}{' '}
                    {r.hash && <a className="underline" href={EXPLORER + r.hash} target="_blank" rel="noreferrer">View on XRPL</a>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* USSD phone */}
        <aside className="lg:col-span-5 flex flex-col items-center gap-4">
          <div className="w-72 rounded-[2rem] bg-[#18181B] p-5 shadow-lg">
            <div className="rounded-lg bg-[#9EB49B] text-[#18181B] font-mono text-sm leading-snug p-3 min-h-[160px] whitespace-pre-wrap break-words">
              {lcd}
              {screen !== 'RESPONSE' && <div className="mt-2 border-t border-[#18181B]/30 pt-1">&gt; {dial}</div>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={call} disabled={busy} className="py-2 rounded-lg bg-[#065F46] text-white text-sm font-medium">Call</button>
              <button onClick={() => { setScreen('DIAL'); setDial(''); setText(''); }} className="py-2 rounded-lg bg-[#57534E] text-white text-sm font-medium">End</button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {KEYS.map(([d, l]) => (
                <button key={d} onClick={() => press(d)} className="py-2 rounded-lg bg-[#F7F6F2] hover:bg-[#E7E5E4] text-[#18181B]">
                  <span className="block font-semibold leading-none">{d}</span>
                  <span className="block text-[10px] text-[#57534E] h-3">{l}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="text-sm text-[#57534E] w-72">
            Owner PIN (the demo PIN is in the README)
            <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" className="mt-1 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-[#18181B]" />
          </label>
          <p className="text-xs text-[#57534E] w-72">This is a simulator. A real phone would dial the same code and need no data.</p>
        </aside>
      </main>
    </div>
  );
}
