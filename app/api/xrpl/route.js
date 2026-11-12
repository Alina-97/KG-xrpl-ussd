import xrpl from 'xrpl';
import { NextResponse } from 'next/server';

export async function GET() {
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  // 1. Payment Channel Analytics
  const channels = await client.request({
    command: 'account_channels',
    account: process.env.TENANT_ADDRESS,
  });
  const channel = channels.result.channels[0];
  const totalCapXrp = Number(xrpl.dropsToXrp(channel.amount));
  const spentXrp = Number(xrpl.dropsToXrp(channel.balance));

  // 2. KASI Loyalty Points Balance
  const lines = await client.request({
    command: 'account_lines',
    account: process.env.TENANT_ADDRESS,
  });
  const kasiLine = lines.result.lines.find(
    (l) => l.currency === process.env.LOYALTY_CURRENCY
  );
  const loyaltyPoints = kasiLine ? Number(kasiLine.balance) : 0;

  // 3. Payment Tracking History
  const txHistory = await client.request({
    command: 'account_tx',
    account: process.env.TENANT_ADDRESS,
    limit: 6,
  });

  const transactions = txHistory.result.transactions.map((t) => ({
    hash: t.tx.hash,
    type: t.tx.TransactionType,
    result: t.meta.TransactionResult,
  }));

  await client.disconnect();

  return NextResponse.json({
    totalCapXrp,
    spentXrp,
    remainingXrp: (totalCapXrp - spentXrp).toFixed(2),
    loyaltyPoints,
    channelId: process.env.CHANNEL_ID,
    transactions,
  });
}

// Handles Human Operator Actions (via Web OR USSD Phone Simulator)
export async function POST(req) {
  const { action, amount } = await req.json();
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const tenantWallet = xrpl.Wallet.fromSeed(process.env.TENANT_SEED);
  const utilityWallet = xrpl.Wallet.fromSeed(process.env.UTILITY_SEED);

  if (action === 'INCREASE_LIMIT') {
    const res = await client.submitAndWait({
      TransactionType: 'PaymentChannelFund',
      Account: tenantWallet.address,
      Channel: process.env.CHANNEL_ID,
      Amount: xrpl.xrpToDrops(String(amount || 10)),
    }, { wallet: tenantWallet });

    await client.disconnect();
    return NextResponse.json({
      message: `Limit increased by +${amount || 10} XRP on XRPL!`,
      hash: res.result.hash,
    });
  }

  if (action === 'REDEEM_LOYALTY') {
    // Tenant sends 10 KASI points back to Utility to redeem free emergency power
    const res = await client.submitAndWait({
      TransactionType: 'Payment',
      Account: tenantWallet.address,
      Destination: utilityWallet.address,
      Amount: {
        currency: process.env.LOYALTY_CURRENCY,
        value: '10',
        issuer: utilityWallet.address,
      },
    }, { wallet: tenantWallet });

    await client.disconnect();
    return NextResponse.json({
      message: 'Redeemed 10 KASI points for +2 kWh Free Emergency Power!',
      hash: res.result.hash,
    });
  }

  await client.disconnect();
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
