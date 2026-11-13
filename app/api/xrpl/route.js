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
    const channel = channels.result.channels?.find((c) => c.channel === process.env.CHANNEL_ID);
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
    const { action, amount, meterId } = await req.json();
    await client.connect();

    const tenantWallet = xrpl.Wallet.fromSeed(process.env.TENANT_SEED);
    const utilityWallet = xrpl.Wallet.fromSeed(process.env.UTILITY_SEED);

    // 1. Human Operator increases monthly spending limit
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

    // 2. Smart Meter Agent spends 2 XRP when room drops < 2 kWh + awards 10 KASI pts
    if (action === 'AGENT_TOPUP') {
      const channels = await client.request({
        command: 'account_channels',
        account: process.env.TENANT_ADDRESS,
      });
      const currentSpentDrops = Number(channel?.balance || 0);
      const newCumulativeDrops = String(currentSpentDrops + Number(xrpl.xrpToDrops('2')));

      const signature = xrpl.signPaymentChannelClaim(
        process.env.CHANNEL_ID,
        newCumulativeDrops,
        tenantWallet.privateKey
      );

      const claimRes = await client.submitAndWait(
        {
          TransactionType: 'PaymentChannelClaim',
          Account: utilityWallet.address,
          Channel: process.env.CHANNEL_ID,
          Balance: newCumulativeDrops,
          Amount: newCumulativeDrops,
          Signature: signature,
          PublicKey: tenantWallet.publicKey,
        },
        { wallet: utilityWallet }
      );

      // Award 10 KASI Loyalty Points
      await client.submitAndWait(
        {
          TransactionType: 'Payment',
          Account: utilityWallet.address,
          Destination: tenantWallet.address,
          Amount: {
            currency: process.env.LOYALTY_CURRENCY,
            value: '10',
            issuer: utilityWallet.address,
          },
        },
        { wallet: utilityWallet }
      );

      await client.disconnect();
      return NextResponse.json({
        message: 'Low power (<2 kWh)! Meter spent 2 XRP (+20 kWh) & earned +10 KASI pts!',
        hash: claimRes.result.hash,
      });
    }

    // 3. Cross-Province Family Top-Up ("Send Power to Mom in Gauteng")
    if (action === 'SEND_TO_FAMILY') {
      const res = await client.submitAndWait(
        {
          TransactionType: 'Payment',
          Account: tenantWallet.address,
          Destination: utilityWallet.address,
          Amount: xrpl.xrpToDrops('5'),
          Memos: [
            {
              Memo: {
                MemoData: xrpl.convertStringToHex(`REMOTE_TOPUP:${meterId || 'MOM-GP-402'}`),
              },
            },
          ],
        },
        { wallet: tenantWallet }
      );

      // Reward sender with +5 KASI Loyalty Points for supporting family
      await client.submitAndWait(
        {
          TransactionType: 'Payment',
          Account: utilityWallet.address,
          Destination: tenantWallet.address,
          Amount: {
            currency: process.env.LOYALTY_CURRENCY,
            value: '5',
            issuer: utilityWallet.address,
          },
        },
        { wallet: utilityWallet }
      );

      await client.disconnect();
      return NextResponse.json({
        message: `Sent 5 XRP (+50 kWh) to ${meterId || 'Mom (Gauteng)'}! Earned +5 KASI pts.`,
        hash: res.result.hash,
      });
    }

    // 4. Redeem 10 KASI Loyalty Points for free power
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

    // 5. Overdraw Attack Proof
    if (action === 'TEST_OVERDRAW') {
      try {
        const overdrawDrops = xrpl.xrpToDrops('999');
        const signature = xrpl.signPaymentChannelClaim(
          process.env.CHANNEL_ID,
          overdrawDrops,
          tenantWallet.privateKey
        );

        await client.submitAndWait(
          {
            TransactionType: 'PaymentChannelClaim',
            Account: utilityWallet.address,
            Channel: process.env.CHANNEL_ID,
            Balance: overdrawDrops,
            Amount: overdrawDrops,
            Signature: signature,
            PublicKey: tenantWallet.publicKey,
          },
          { wallet: utilityWallet }
        );
      } catch (err) {
        await client.disconnect();
        return NextResponse.json({
          blocked: true,
          message: `XRPL LEDGER BLOCKED OVERDRAW:\n${err.message}`,
        });
      }
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