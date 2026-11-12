'use client';
import React, { useState, useEffect } from 'react';

type LedgerData = {
  totalCapXrp: number;
  spentXrp: number;
  remainingXrp: number;
  loyaltyPoints: number;
  transactions: Array<{
    hash: string;
    type: string;
    result: string;
  }>;
};

export default function KasiGridApp() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [ussdScreen, setUssdScreen] = useState('DIAL'); // 'DIAL' | 'MENU' | 'RESPONSE'
  const [ussdText, setUssdText] = useState('');
  const [loading, setLoading] = useState(false);

  async function refreshLedger() {
    const res = await fetch('/api/xrpl');
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    refreshLedger();
  }, []);

  async function triggerOperatorAction(action: string, amount = 10) {
    setLoading(true);
    setUssdText('Connecting to XRPL Testnet...');
    setUssdScreen('RESPONSE');

    const res = await fetch('/api/xrpl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, amount }),
    });
    const result = await res.json();

    await refreshLedger();
    setLoading(false);
    setUssdText(`${result.message}\n\nTx Hash:\n${result.hash?.slice(0, 18)}...`);
  }

  function handleUssdChoice(choice: string) {
    if (!data) return;

    if (choice === '1') {
      setUssdText(
        `Room #101 Status:\nRemaining Cap: ${data.remainingXrp} XRP\nSpent: ${data.spentXrp} XRP\nLoyalty: ${data.loyaltyPoints} KASI pts`
      );
      setUssdScreen('RESPONSE');
    } else if (choice === '2') {
      triggerOperatorAction('INCREASE_LIMIT', 10);
    } else if (choice === '3') {
      if (data.loyaltyPoints < 10) {
        setUssdText('Need at least 10 KASI pts to redeem free power!');
        setUssdScreen('RESPONSE');
      } else {
        triggerOperatorAction('REDEEM_LOYALTY');
      }
    }
  }

  if (!data) return <div className="p-10 text-center font-sans">Syncing with XRP Ledger Testnet...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans text-gray-900">
      <header className="mb-8 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">⚡ KasiGrid Pay (XRPL + USSD)</h1>
          <p className="text-sm text-gray-600">Financial Inclusion, Autonomous Smart Metering & Township Loyalty</p>
        </div>
        <button onClick={refreshLedger} className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
          🔄 Sync XRPL Ledger
        </button>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* LEFT & CENTER: ANALYTICS & PAYMENT TRACKING (2 Columns) */}
        <div className="md:col-span-2 space-y-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-600 font-bold uppercase">Channel Hard Cap</p>
              <p className="text-2xl font-bold mt-1">{data.totalCapXrp} XRP</p>
              <p className="text-xs text-gray-500 mt-1">Used: {data.spentXrp} XRP</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <p className="text-xs text-emerald-600 font-bold uppercase">Available Budget</p>
              <p className="text-2xl font-bold mt-1">{data.remainingXrp} XRP</p>
              <p className="text-xs text-gray-500 mt-1">Agent Cannot Overdraw</p>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
              <p className="text-xs text-amber-600 font-bold uppercase">KASI Loyalty</p>
              <p className="text-2xl font-bold mt-1">🌟 {data.loyaltyPoints}</p>
              <p className="text-xs text-gray-500 mt-1">10 pts = Free Power</p>
            </div>
          </div>

          {/* Human Operator Web Controls */}
          <div className="bg-gray-50 p-4 rounded-xl border flex flex-wrap gap-3 justify-between items-center">
            <div>
              <h2 className="font-bold text-sm">Human Operator Controls (Outside Agent)</h2>
              <p className="text-xs text-gray-500">Adjust XRPL Payment Channel limit or redeem loyalty points</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => triggerOperatorAction('INCREASE_LIMIT', 10)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg"
              >
                + Add 10 XRP Limit
              </button>
              <button
                onClick={() => triggerOperatorAction('REDEEM_LOYALTY')}
                disabled={loading || data.loyaltyPoints < 10}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-lg"
              >
                Redeem 10 KASI
              </button>
            </div>
          </div>

          {/* Live Payment & Loyalty Tracking Feed */}
          <div>
            <h3 className="font-bold text-sm mb-3 uppercase text-gray-500">Live XRPL Payment & Loyalty Tracking</h3>
            <div className="space-y-2">
              {data.transactions.map((tx) => (
                <div key={tx.hash} className="p-3 border rounded-lg flex justify-between items-center text-sm bg-white">
                  <div>
                    <span className="font-semibold">{tx.type}</span>
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">{tx.result}</span>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{tx.hash.slice(0, 24)}...</div>
                  </div>
                  <a
                    href={`https://xrpl.org{tx.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    XRPL Explorer ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: BUILT-IN USSD FEATURE PHONE SIMULATOR (1 Column) */}
        <div className="bg-gray-900 text-white p-5 rounded-3xl shadow-xl border-4 border-gray-700 flex flex-col justify-between">
          <div>
            <div className="text-center text-xs text-gray-400 mb-3 tracking-widest">NOKIA USSD SIMULATOR • NO DATA</div>

            {/* Green Monochrome USSD Screen */}
            <div className="bg-emerald-950 border-2 border-emerald-700 rounded-xl p-4 h-56 font-mono text-xs text-emerald-300 flex flex-col justify-between whitespace-pre-line">
              {ussdScreen === 'DIAL' && (
                <div className="my-auto text-center">
                  <p className="text-sm font-bold mb-2">Offline Banking & Power</p>
                  <p className="text-emerald-400">Dial *120*555# to manage your XRPL meter without internet.</p>
                </div>
              )}

              {ussdScreen === 'MENU' && (
                <div>
                  <p className="font-bold border-b border-emerald-800 pb-1 mb-2">KasiGrid USSD (*120*555#)</p>
                  <p>1. Check Power & KASI Pts</p>
                  <p>2. Raise Limit (+10 XRP)</p>
                  <p>3. Redeem 10 KASI Points</p>
                </div>
              )}

              {ussdScreen === 'RESPONSE' && (
                <div>
                  <p className="font-bold border-b border-emerald-800 pb-1 mb-2">XRPL Network Response</p>
                  <p>{ussdText}</p>
                </div>
              )}

              <div className="text-[10px] text-emerald-500 text-right">XRPL Testnet Connected</div>
            </div>
          </div>

          {/* Interactive Keypad */}
          <div className="mt-4 space-y-2">
            {ussdScreen === 'DIAL' ? (
              <button
                onClick={() => setUssdScreen('MENU')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm"
              >
                📞 Dial *120*555#
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleUssdChoice('1')} className="bg-gray-800 hover:bg-gray-700 py-2 rounded-lg font-bold text-sm">1</button>
                <button onClick={() => handleUssdChoice('2')} className="bg-gray-800 hover:bg-gray-700 py-2 rounded-lg font-bold text-sm">2</button>
                <button onClick={() => handleUssdChoice('3')} className="bg-gray-800 hover:bg-gray-700 py-2 rounded-lg font-bold text-sm">3</button>
                <button onClick={() => setUssdScreen('DIAL')} className="col-span-3 bg-red-900/60 hover:bg-red-800 py-1.5 rounded-lg text-xs">
                  End USSD Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
