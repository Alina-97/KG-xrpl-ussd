import xrpl from 'xrpl';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runSmartMeter(unitsRemaining, claimXrp) {
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const tenantWallet = xrpl.Wallet.fromSeed(process.env.TENANT_SEED);
  const utilityWallet = xrpl.Wallet.fromSeed(process.env.UTILITY_SEED);
  const channelId = process.env.CHANNEL_ID;

  console.log(`\n⚡ Smart Meter Check: ${unitsRemaining} kWh remaining.`);

  if (unitsRemaining < 2) {
    console.log(` Agent autonomously claiming ${claimXrp} XRP from Payment Channel...`);
    const drops = xrpl.xrpToDrops(claimXrp);

    const signature = xrpl.signPaymentChannelClaim(
      channelId,
      drops,
      tenantWallet.privateKey
    );

    const claimTx = {
      TransactionType: 'PaymentChannelClaim',
      Account: utilityWallet.address,
      Channel: channelId,
      Balance: drops,
      Amount: drops,
      Signature: signature,
      PublicKey: tenantWallet.publicKey,
    };

    try {
      const claimRes = await client.submitAndWait(claimTx, { wallet: utilityWallet });
      console.log(`Power Paid! Explorer: https://xrpl.org{claimRes.result.hash}`);

      // Award 10 KASI Loyalty Points on XRPL
      console.log('🎁 Issuing 10 KASI Loyalty Points...');
      const rewardRes = await client.submitAndWait({
        TransactionType: 'Payment',
        Account: utilityWallet.address,
        Destination: tenantWallet.address,
        Amount: {
          currency: process.env.LOYALTY_CURRENCY,
          value: '10',
          issuer: utilityWallet.address,
        },
      }, { wallet: utilityWallet });
      console.log(`🌟 Loyalty Reward Sent! Explorer: https://xrpl.org{rewardRes.result.hash}`);

    } catch (err) {
      console.error(`BLOCKED BY XRPL LEDGER (Cap Enforced): ${err.message}`);
    }
  }

  await client.disconnect();
}

// Test 1: Valid 2 XRP claim -> Succeeds + Awards 10 KASI
await runSmartMeter(1.4, '2');

// Test 2: Over-limit 25 XRP claim -> Rejected by XRPL!
await runSmartMeter(0.9, '25');
