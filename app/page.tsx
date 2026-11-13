'use client';
import React, { useState, useEffect } from 'react';

interface Transaction {
  hash: string;
  type: string;
  result: string;
}

interface LedgerData {
  totalCapXrp: number;
  spentXrp: number;
  remainingXrp: string;
  loyaltyPoints: number;
  channelId: string;
  transactions: Transaction[];
}

export default function KasiGridApp() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [ussdScreen, setUssdScreen] = useState<'DIAL' | 'MENU' | 'RESPONSE'>('DIAL');
  const [dialInput, setDialInput] = useState('');
  const [ussdText, setUssdText] = useState('');
  const [loading, setLoading] = useState(false);

  async function refreshLedger() {
    try {
      const res = await fetch('/api/xrpl');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to refresh ledger:', err);
    }
  }

  useEffect(() => {
    refreshLedger();
  }, []);

  async function triggerOperatorAction(action: string, amount = 10) {
    setLoading(true);
    setUssdText('Processing on XRPL Testnet...\nPlease wait.');
    setUssdScreen('RESPONSE');

    try {
      const res = await fetch('/api/xrpl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amount }),
      });
      const result = await res.json();

      await refreshLedger();
      setLoading(false);
      setDialInput('');
      setUssdText(`${result.message}\n\nRef:\n${result.hash?.slice(0, 18)}...`);
    } catch {
      setLoading(false);
      setUssdText('Connection failed. Try again.');
    }
  }

  function handleKeyPress(digit: string) {
    if (loading) return;
    if (ussdScreen === 'RESPONSE') {
      setUssdScreen('DIAL');
      setDialInput(digit);
      return;
    }
    setDialInput((prev) => prev + digit);
  }

  function handleSend() {
    if (loading) return;

    if (ussdScreen === 'DIAL') {
      const code = dialInput.trim();
      if (code === '*120*555#' || code === '120*555#') {
        setDialInput('');
        setUssdScreen('MENU');
      } else {
        setUssdText(`Invalid code "${code || 'empty'}".\n\nPlease dial *120*555# and press Call / OK.`);
        setDialInput('');
        setUssdScreen('RESPONSE');
      }
      return;
    }

    if (ussdScreen === 'MENU') {
      const choice = dialInput.trim();
      setDialInput('');

      if (choice === '1') {
        setUssdText(
          `Room #101 Meter\nAvailable: ${data?.remainingXrp} XRP\nSpent: ${data?.spentXrp} XRP\nRewards: ${data?.loyaltyPoints} KASI`
        );
        setUssdScreen('RESPONSE');
      } else if (choice === '2') {
        triggerOperatorAction('INCREASE_LIMIT', 10);
      } else if (choice === '3') {
        if ((data?.loyaltyPoints || 0) < 10) {
          setUssdText('Insufficient points.\nNeed 10 KASI for free units.');
          setUssdScreen('RESPONSE');
        } else {
          triggerOperatorAction('REDEEM_LOYALTY');
        }
      } else {
        setUssdText(`Invalid option "${choice}".\nDial *120*555# to restart.`);
        setUssdScreen('RESPONSE');
      }
    }
  }

  function handleEndSession() {
    setUssdScreen('DIAL');
    setDialInput('');
    setUssdText('');
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center font-sans text-stone-600 text-sm">
        Connecting to XRP Ledger Testnet...
      </div>
    );
  }

  const spentPercentage =
    data.totalCapXrp > 0 ? Math.min(100, Math.round((data.spentXrp / data.totalCapXrp) * 100)) : 0;

  const keypadKeys = [
    { digit: '1', letters: '.,!' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { digit: '*', letters: '+' },
    { digit: '0', letters: '_' },
    { digit: '#', letters: '⇧' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-stone-900 font-sans selection:bg-emerald-200">
      <nav className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-900 text-[#F7F6F2] font-mono font-bold text-sm flex items-center justify-center rounded">
              KG
            </div>
            <div>
              <span className="font-semibold tracking-tight text-stone-900">KasiGrid</span>
              <span className="text-stone-400 mx-2">/</span>
              <span className="text-xs font-mono text-stone-500">UNIT 101 • TEMBISA</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              XRPL TESTNET LIVE
            </span>
            <button
              onClick={refreshLedger}
              className="text-xs font-medium text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3 py-1.5 rounded transition"
            >
              Sync Ledger
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 space-y-8">
            <section className="bg-white border border-stone-200 rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex flex-wrap justify-between items-baseline gap-2 mb-6">
                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-stone-500">
                    Monthly Electricity Cap
                  </h2>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl font-semibold tracking-tight text-stone-900">
                      {data.remainingXrp} XRP
                    </span>
                    <span className="text-sm text-stone-500">
                      remaining of {data.totalCapXrp} XRP limit
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-500 block">
                    KASI Rewards
                  </span>
                  <span className="text-xl font-semibold text-amber-700">
                    {data.loyaltyPoints} pts
                  </span>
                </div>
              </div>

              <div className="w-full bg-stone-100 h-2.5 rounded-sm overflow-hidden border border-stone-200">
                <div
                  className="bg-stone-900 h-full transition-all duration-500"
                  style={{ width: `${spentPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-stone-500 mt-2">
                <span>
                  Consumed: {data.spentXrp} XRP ({spentPercentage}%)
                </span>
                <span>Enforced by XRPL Payment Channel</span>
              </div>
            </section>

            <section className="bg-white border border-stone-200 rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    Operator Override Controls
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Adjust spending cap outside the meter agent or redeem KASI points for units.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => triggerOperatorAction('INCREASE_LIMIT', 10)}
                    disabled={loading}
                    className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 rounded transition"
                  >
                    +10 XRP Cap
                  </button>
                  <button
                    onClick={() => triggerOperatorAction('REDEEM_LOYALTY')}
                    disabled={loading || data.loyaltyPoints < 10}
                    className="bg-white hover:bg-stone-50 disabled:opacity-40 text-stone-900 border border-stone-300 text-xs font-medium px-4 py-2.5 rounded transition"
                  >
                    Redeem 10 pts
                  </button>
                  <button
                  onClick={() => triggerOperatorAction('TEST_OVERDRAW')}
                  disabled={loading}
                  className="bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-800 border border-red-300 text-xs font-medium px-4 py-2.5 rounded transition"
                >
                  Test Overdraw Block
                </button>

                </div>
              </div>
            </section>

            <section className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/60">
                <h3 className="text-xs font-mono uppercase tracking-wider text-stone-600 font-semibold">
                  On-Chain Settlement History
                </h3>
                <span className="text-xs font-mono text-stone-400">
                  Channel: {data.channelId?.slice(0, 10)}...
                </span>
              </div>

              <div className="divide-y divide-stone-100">
                {(data.transactions || []).length > 0 ? (
                  (data.transactions || []).map((tx) => (
                    <div
                      key={tx.hash}
                      className="px-6 py-3.5 flex items-center justify-between hover:bg-stone-50/80 transition text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <div>
                          <div className="font-medium text-stone-800">{tx.type}</div>
                          <div className="text-[11px] font-mono text-stone-500">
                            {tx.hash.slice(0, 20)}...
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          tx.result === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {tx.result}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-5 text-sm text-stone-500">No ledger settlements yet.</div>
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <aside className="bg-white border border-stone-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
                    USSD Session
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight text-stone-900 mt-1">
                    {ussdScreen === 'DIAL' ? 'Dial meter' : ussdScreen === 'MENU' ? 'Menu' : 'Response'}
                  </h3>
                </div>
                <button
                  onClick={handleEndSession}
                  className="text-[11px] font-medium text-stone-600 hover:text-stone-900"
                >
                  End
                </button>
              </div>

              <div className="bg-stone-100 border border-stone-200 rounded-lg p-3 mb-4 min-h-[86px] flex items-end justify-end">
                <div className="max-w-[90%] text-sm leading-relaxed whitespace-pre-wrap text-stone-800">
                  {ussdScreen === 'DIAL'
                    ? 'Enter code\n*120*555#'
                    : ussdScreen === 'MENU'
                      ? '1. Check Meter\n2. Increase cap\n3. Redeem points'
                      : ussdText || 'Ready.'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {keypadKeys.map(({ digit, letters }) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeyPress(digit)}
                    disabled={loading}
                    className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-left hover:bg-stone-100 transition disabled:opacity-50"
                  >
                    <div className="text-2xl font-semibold tracking-tight text-stone-900">{digit}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-stone-500 mt-0.5">
                      {letters}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="flex-1 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded transition"
                >
                  {ussdScreen === 'DIAL' ? 'Call / OK' : 'Send'}
                </button>
                <button
                  onClick={handleEndSession}
                  className="w-20 bg-stone-200 hover:bg-stone-300 text-stone-700 text-sm font-medium py-2.5 rounded transition"
                >
                  Clear
                </button>
              </div>

              <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-mono text-emerald-800">
                Meter ID: 101 • {dialInput || 'waiting for input'}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
