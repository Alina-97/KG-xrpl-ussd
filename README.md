ShebiSpark

Power that tops itself up.

ShebiSpark is a smart meter that buys its own electricity, water and Wi-Fi in small steps. The owner sets a budget from a basic button phone. The meter can never spend more than that budget, because the XRP Ledger enforces the limit, not our app.

Testnet only. No real money is used anywhere in this project.

THE PROBLEM
In townships like Tembisa, Soweto and Khayelitsha, many people rent backyard rooms with their own sub-meter.

Many have a button phone with no data, and no bank app.
Power runs out at midnight, when the spaza shop is closed.
Bank fees can be up to R5 on a R15 purchase. That is a third of the money.
A son working in Gauteng cannot easily keep his mom's meter topped up in another province.
How it works
The owner sets a budget. They dial *120*555# on any phone. No data needed. This locks XRP in an XRPL Payment Channel. That is the spending limit.
The meter watches its own units. When power gets low, the meter acts by itself.
The meter asks for a price. It calls the server. The server answers HTTP 402 (Payment Required) with the price.
The meter pays with a signed voucher. It signs a small voucher. It does not need the owner's wallet.
The server claims the money on the ledger. It checks the voucher, claims it on the XRP Ledger, and only then hands over the units.
The owner gets KASI points. Points can be traded for free emergency power.

Every purchase leaves a receipt with a link to the XRP Ledger.

WHERE BLOCKCHAIN IS USED
On the XRP Ledger (needs trust)	Not on the ledger (does not need it)
The spending limit (Payment Channel)	USSD menus
Every claim, with a public record	Meter readings
KASI loyalty points	The real meter hardware
Refund of unused money when a channel closes	Cash in at a spaza shop

A normal database could count the budget. But only the ledger can refuse an overspend, even if our own server is hacked.

Who can do what
Who	Holds	Can	Cannot
Owner (tenant or family)	Their own wallet	Raise the limit, stop spending	
Meter agent	One small signing key per meter	Sign vouchers up to the limit	Raise the limit, close the channel, touch the owner wallet
Utility (the seller)	Its own wallet	Claim vouchers, pay KASI points	Claim more than the owner locked

The meter keys are in a separate file (.env.agent). The website never reads that file.

Buy for someone else

Mom's meter (MOM-FS-402) is paid for by a sponsor wallet, like a family member far away. The sponsor sets the limit, can raise it (menu option 4), and can stop it. Mom never types a voucher code. If the sponsor stops it, the unused money goes back to the sponsor.

More than power

Water and Wi-Fi work the same way. Each service has its own meter, its own price and its own limit. Adding a new service means adding one line in lib/shared.mjs.

The four hackathon questions
How does the customer pay in seconds from a phone they own? The owner sets the budget once on a button phone. After that, the meter pays by itself in seconds. No app, no data.
How does the merchant know which order was paid? Each meter has its own channel. Each purchase answers one price quote. The dashboard lists every payment with its meter and a ledger link.
How does the money reach a bank? The utility claims the money on the ledger, then cashes out through an exchange. In this demo the "Pay out to bank" button is a mock.
If the payer is a machine, what is the most it can spend, and who can stop it? The most is the amount the owner locked. Only the owner can raise it or stop it. Stopping takes effect after a short delay (60 seconds in the demo), then the unused money returns.
Run it

You need Node.js 20 or newer.

Copy the app, lib, scripts folders and .env.example into your Next.js project (replace the old app/page.tsx and old API routes). Use the project root. If your project uses a src folder, move app and lib inside it and fix the import paths.
Install the XRPL library:
npm install xrpl
Add these lines to the scripts part of package.json:
json
"setup": "node scripts/initXrpl.mjs",
"agent": "node --env-file=.env.agent scripts/meterAgent.mjs",
"agent:demo": "node --env-file=.env.agent scripts/meterAgent.mjs --drain"
Make sure .gitignore has .env* so your keys never go on GitHub.
Make the test accounts and channels (takes about a minute):
npm run setup
Start the website:
npm run dev
In a second terminal, start the meter:
npm run agent:demo
Open http://localhost:3000. The demo owner PIN is 1234.
90-second demo
Open the phone. Dial *120*555#, press Call, choose 2 to raise the power limit by 10 XRP.
Watch the meter use power. When it drops below 2 kWh, the agent buys more. A new payment appears with a ledger link.
Press Try to overspend. The meter tries to take 999 XRP. The ledger refuses. That refusal is the point.
Choose 4 on the phone to fund Mom's meter.
Press Stop spending on a meter to show how the owner stops it.
What is real and what is fake

Real: the Payment Channels, the vouchers, the claims, the KASI points and the ledger links, all on the XRPL Testnet.

Demo only:

The USSD phone is a simulator. A real shortcode needs a mobile network partner.
The meter is a simulated counter. A real one would be an STS-compatible sub-meter.
The PIN is 1234. A real system needs hashed PINs, lockouts and protection against SIM swaps.
Data lives in memory and resets when the server restarts.
The bank payout is a mock with a made-up rand rate.
The server holds the owner and utility wallets for the demo. A real system would keep keys in a secure key store.
The "Try to overspend" button needs DEMO_ALLOW_ATTACK=true. It lets the test skip our own checks so you can see the ledger refuse. Set it to false for anything real.
Rules we still need to check

Selling electricity and handling crypto are both regulated in South Africa. A real pilot needs a licensed partner. We have not done this yet.

Plan for the pilot
First customer: a backyard landlord in Tembisa with about 6 rooms, plus their tenants.
Cash in and out: a local spaza shop agent who earns a small fee.
Pilot: 10 landlords in Gauteng, one agent, one licensed partner.
Money for us: a small margin on each purchase. Numbers still need to come from the pilot.
Folder guide
File	What it does
app/page.tsx	The dashboard and the phone simulator
app/api/pay/[meterId]/route.js	The HTTP 402 door where meters pay
app/api/xrpl/route.js	Owner actions: raise limit, stop, redeem points
app/api/meter/route.js	The simulated meter counters
scripts/initXrpl.mjs	One-time setup of accounts and channels
scripts/meterAgent.mjs	The meter that tops itself up
lib/shared.mjs	Services, prices and settings
lib/ledger.mjs	XRPL helpers
Next steps
Use the official xrpl-mpp-sdk for the 402 flow instead of our own small version.
Add a rand-pegged token so the budget does not move with the XRP price.
Add a Stokvel Power Pot, where a group of neighbours shares an emergency fund with a multi-sign account.
Test with a real sub-meter and a real USSD partner.
