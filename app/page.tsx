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
  const [kwh, setKwh] = useState(4.0);
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

  async function triggerOperatorAction(action: string, amount = 10, meterId = 'MOM-GP-402') {
    setLoading(true);
    setUssdText('Processing on XRPL Testnet...\nPlease wait.');
    setUssdScreen('RESPONSE');

    try {
      const res = await fetch('/api/xrpl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amount, meterId }),
      });
      const result = await res.json();

      await refreshLedger();
      setLoading(false);
      setDialInput('');
      setUssdText(`${result.message}\n\nRef:\n${result.hash?.slice(0, 18) || 'Blocked'}...`);
    } catch {
      setLoading(false);
      setUssdText('Connection failed. Try again.');
    }
  }

  // Simulates using electricity in the room; triggers XRPL auto-buy when kWh < 2.0
  async function handleUseAppliance() {
    const nextKwh = Number((kwh - 2.5).toFixed(1));
    setKwh(nextKwh);

    if (nextKwh < 2.0) {
      await triggerOperatorAction('AGENT_TOPUP');
      setKwh((prev) => Number((prev + 20.0).toFixed(1)));
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
        setUssdText(`Invalid code "${code || 'empty'}".\n\nDial *120*555# and press Call / OK.`);
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
          `Room #101 (${kwh} kWh)\nBudget Left: ${data?.remainingXrp} XRP\nRewards: ${data?.loyaltyPoints} KASI`
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
      } else if (choice === '4') {
        triggerOperatorAction('SEND_TO_FAMILY', 5, 'MOM-GP-402');
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
              <span className="text-xs font-mono text-stone-500">UNIT 101 • TEMBISA PILOT</span>
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
              <div className="flex flex-wrap justify-between items-baseline gap-4 mb-6">
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

                <div className="flex gap-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-500 block">
                      Room Power
                    </span>
                    <span className={`text-xl font-semibold ${kwh < 2 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {kwh} kWh
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-500 block">
                      KASI Rewards
                    </span>
                    <span className="text-xl font-semibold text-amber-700">
                      {data.loyaltyPoints} pts
                    </span>
                  </div>
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
                <span>Auto-buys when Room Power &lt; 2.0 kWh</span>
              </div>
            </section>

            <section className="bg-white border border-stone-200 rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-stone-900">
                  Meter Simulation &amp; Operator Controls
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Simulate power usage (&lt;2 kWh triggers XRPL auto-top-up), send power to family, or test overdraw protection.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleUseAppliance}
                  disabled={loading}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-2.5 rounded transition"
                >
                  Use Power (-2.5 kWh)
                </button>
                <button
                  onClick={() => triggerOperatorAction('INCREASE_LIMIT', 10)}
                  disabled={loading}
                  className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-2.5 rounded transition"
                >
                  +10 XRP Cap
                </button>
                <button
                  onClick={() => triggerOperatorAction('SEND_TO_FAMILY', 5, 'MOM-GP-402')}
                  disabled={loading}
                  className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-2.5 rounded transition"
                >
                  Send 5 XRP to Family
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
