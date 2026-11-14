// One-time setup. Run: npm run setup
// Makes test accounts on the XRPL Testnet, opens one Payment Channel per meter,
// and writes the keys to the right files. TESTNET ONLY. Never use real money here.
import xrpl from 'xrpl';
import fs from 'node:fs';
import { KASI_CODE } from '../lib/shared.mjs';

// fund = XRP the owner locks as that meter's spending limit.
const METERS = [
  { meterId: 'POWER-101', service: 'POWER', label: 'Room 101 Power', source: 'TENANT', fund: 20 },
  { meterId: 'WATER-101', service: 'WATER', label: 'Room 101 Water', source: 'TENANT', fund: 5 },
  { meterId: 'WIFI-101', service: 'WIFI', label: 'Room 101 Wi-Fi', source: 'TENANT', fund: 3 },
  { meterId: 'MOM-FS-402', service: 'POWER', label: "Mom's Meter (Free State)", source: 'SPONSOR', fund: 10 },
];

const must = (res, what) => {
  const code = res.result.meta.TransactionResult;
  if (code !== 'tesSUCCESS') throw new Error(`${what} failed: ${code}`);
  return res;
};
// Keep any old file as .bak so we never wipe your keys by accident.
const save = (file, text) => {
  if (fs.existsSync(file)) fs.renameSync(file, file + '.bak');
  fs.writeFileSync(file, text);
};

const client = new xrpl.Client(process.env.XRPL_URL || 'wss://s.altnet.rippletest.net:51233', { connectionTimeout: 20000 });
await client.connect();

console.log('Making 3 test accounts (utility, tenant, sponsor). This can take a minute...');
const utility = (await client.fundWallet()).wallet;
const tenant = (await client.fundWallet()).wallet;
const sponsor = (await client.fundWallet()).wallet;
const owners = { TENANT: tenant, SPONSOR: sponsor };

console.log('Turning on KASI loyalty points...');
for (const w of [tenant, sponsor]) {
  must(
    await client.submitAndWait(
      { TransactionType: 'TrustSet', Account: w.address,
        LimitAmount: { currency: KASI_CODE, issuer: utility.address, value: '100000' } },
      { wallet: w }
    ),
    'TrustSet'
  );
}

const meters = [];
const keys = {};
for (const m of METERS) {
  // Each meter gets its OWN signing key. It can sign vouchers, nothing else.
  // It can NOT fund, close or change the channel. Only the owner's wallet can.
  const meterKey = xrpl.Wallet.generate();
  const owner = owners[m.source];
  const res = must(
    await client.submitAndWait(
      { TransactionType: 'PaymentChannelCreate', Account: owner.address, Destination: utility.address,
        Amount: xrpl.xrpToDrops(String(m.fund)), SettleDelay: 60, PublicKey: meterKey.publicKey },
      { wallet: owner }
    ),
    `Channel for ${m.meterId}`
  );
  const node = res.result.meta.AffectedNodes.find((n) => n.CreatedNode?.LedgerEntryType === 'PayChannel');
  meters.push({ meterId: m.meterId, service: m.service, label: m.label, source: m.source, channelId: node.CreatedNode.LedgerIndex });
  keys[m.meterId] = meterKey.seed;
  console.log(`  ${m.meterId}: limit ${m.fund} XRP`);
}

fs.mkdirSync('config', { recursive: true });
fs.writeFileSync(
  'config/channels.json',
  JSON.stringify({ addresses: { utility: utility.address, tenant: tenant.address, sponsor: sponsor.address }, meters }, null, 2)
);

// Website keys (read by Next.js).
save(
  '.env.local',
  [
    `TENANT_SEED=${tenant.seed}`,
    `SPONSOR_SEED=${sponsor.seed}`,
    `UTILITY_SEED=${utility.seed}`,
    'OWNER_PIN=1234',
    'DEMO_ALLOW_ATTACK=true',
    'DEMO_ZAR_PER_XRP=10',
    '',
  ].join('\n')
);
// Meter keys live in their OWN file, so the website never sees them.
save('.env.agent', [`SERVER_URL=http://localhost:3000`, `METER_KEYS='${JSON.stringify(keys)}'`, ''].join('\n'));

console.log('\nDone. Next: npm run dev   (and in a second terminal: npm run agent:demo)');
await client.disconnect();
