import xrpl from 'xrpl';
import fs from 'fs';

async function initializeSystem() {
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  console.log('1. Funding Tenant (Human Operator) & Utility Agent Wallets on XRPL Testnet...');
  const { wallet: tenantWallet } = await client.fundWallet();
  const { wallet: utilityWallet } = await client.fundWallet();

  // Enable DefaultRipple on Utility wallet to issue KASI Loyalty Tokens
  console.log('2. Enabling KASI Loyalty Token Issuance...');
  await client.submitAndWait({
    TransactionType: 'AccountSet',
    Account: utilityWallet.address,
    SetFlag: xrpl.AccountSetAsfFlags.asfDefaultRipple,
  }, { wallet: utilityWallet });

  // Tenant sets up a TrustLine to receive KASI Loyalty Points
  const KASI_HEX = '4B41534900000000000000000000000000000000'; // "KASI"
  console.log('3. Creating Tenant TrustLine for KASI Loyalty Points...');
  await client.submitAndWait({
    TransactionType: 'TrustSet',
    Account: tenantWallet.address,
    LimitAmount: {
      currency: KASI_HEX,
      issuer: utilityWallet.address,
      value: '100000',
    },
  }, { wallet: tenantWallet });

  // Create Ledger-Enforced Payment Channel (20 XRP Hard Cap)
  console.log('4. Locking 20 XRP Hard Spending Cap into XRPL Payment Channel...');
  await client.submitAndWait({
    TransactionType: 'PaymentChannelCreate',
    Account: tenantWallet.address,
    Destination: utilityWallet.address,
    Amount: xrpl.xrpToDrops('20'),
    SettleDelay: 86400,
    PublicKey: tenantWallet.publicKey,
  }, { wallet: tenantWallet });

  const channels = await client.request({
    command: 'account_channels',
    account: tenantWallet.address,
  });
  const channelId = channels.result.channels[0].channel_id;

  // Save credentials to .env.local
  const envData = `TENANT_SEED=${tenantWallet.seed}
TENANT_ADDRESS=${tenantWallet.address}
UTILITY_SEED=${utilityWallet.seed}
UTILITY_ADDRESS=${utilityWallet.address}
CHANNEL_ID=${channelId}
LOYALTY_CURRENCY=${KASI_HEX}
`;
  fs.writeFileSync('.env.local', envData);

  console.log('Setup Complete! Keys saved to .env.local');
  console.log('Tenant Address:', tenantWallet.address);
  console.log('Channel ID:', channelId);

  await client.disconnect();
}

initializeSystem();
