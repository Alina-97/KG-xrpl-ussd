import xrpl from 'xrpl';
import { NextResponse } from 'next/server';

export async function GET() {
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  try {
    await client.connect();

    // 1. Payment Channel Analytics
    const channels = await client.request({
      command: 'account_channels',
      account: process.env.TENANT_ADDRESS,
    });
    const channel = channels.result.channels?.[0];
    const totalCapXrp = channel ? Number(xrpl.dropsToXrp(channel.amount)) : 0;
    const spentXrp = channel ? Number(xrpl.dropsToXrp(channel.balance)) : 0;

    // 2. KASI Loyalty Points Balance
    const lines = await client.request({
      command: 'account_lines',
      account: process.env.TENANT_ADDRESS,
    });
    const kasiLine = lines.result.lines?.find(
      (l) => l.currency === process.env.LOYALTY_CURRENCY
    );
    const loyaltyPoints = kasiLine ? Number(kasiLine.balance) : 0;

    // 3. Payment Tracking History
    const txHistory = await client.request({
      command: 'account_tx',
      account: process.env.TENANT_ADDRESS,
      limit: 6,
    });

    const transactions = (txHistory.result.transactions || []).map((t) => {
      const txData = t.tx_json || t.tx || {};
      return {
        hash: t.hash || txData.hash || Math.random().toString(),
        type: txData.TransactionType || 'Transaction',
        result: t.meta?.TransactionResult || 'tesSUCCESS',
      };
    });

    await client.disconnect();

    return NextResponse.json({
      totalCapXrp,
      spentXrp,
      remainingXrp: (totalCapXrp - spentXrp).toFixed(2),
      loyaltyPoints,
      channelId: process.env.CHANNEL_ID,
      transactions,
    });
  } catch (error) {
    console.error('XRPL GET Error:', error);
    if (client.isConnected()) await client.disconnect();
    return NextResponse.json(
      {
        totalCapXrp: 0,
        spentXrp: 0,
        remainingXrp: '0.00',
        loyaltyPoints: 0,
        transactions: [],
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  try {
    const { action, amount } = await req.json();
    await client.connect();

    const tenantWallet = xrpl.Wallet.fromSeed(process.env.TENANT_SEED);
    const utilityWallet = xrpl.Wallet.fromSeed(process.env.UTILITY_SEED);

    if (action === 'INCREASE_LIMIT') {
      const res = await client.submitAndWait(
        {
          TransactionType: 'PaymentChannelFund',
          Account: tenantWallet.address,
          Channel: process.env.CHANNEL_ID,
          Amount: xrpl.xrpToDrops(String(amount || 10)),
        },
        { wallet: tenantWallet }
      );

      await client.disconnect();
      return NextResponse.json({
        message: `Limit increased by +${amount || 10} XRP on XRPL!`,
        hash: res.result.hash,
      });
    }

    if (action === 'REDEEM_LOYALTY') {
      const res = await client.submitAndWait(
        {
          TransactionType: 'Payment',
          Account: tenantWallet.address,
          Destination: utilityWallet.address,
          Amount: {
            currency: process.env.LOYALTY_CURRENCY,
            value: '10',
            issuer: utilityWallet.address,
          },
        },
        { wallet: tenantWallet }
      );

      await client.disconnect();
      return NextResponse.json({
        message: 'Redeemed 10 KASI points for +2 kWh Free Emergency Power!',
        hash: res.result.hash,
      });
    }

    await client.disconnect();
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('XRPL POST Error:', error);
    if (client.isConnected()) await client.disconnect();
    return NextResponse.json(
      { message: `Error: ${error.message}`, error: error.message },
      { status: 500 }
    );
  }
}
