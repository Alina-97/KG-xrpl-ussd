#  KasiGrid Pay: Easy Township Utilities Using Any Phone

KG helps people in South African townships buy prepaid electricity, water, and Wi-Fi—and send power to family members in other provinces—without needing a bank account, a smartphone, or mobile data.

By connecting simple phone menus (**USSD `*120*555#`**) to the **XRP Ledger**, a room's meter can automatically top itself up before the lights go out—while keeping the user 100% in control of how much money gets spent.



## The Problem I Am Solving
In townships like Soweto, Tembisa, and Khayelitsha, thousands of people rent backyard rooms with individual sub-meters, or support parents living in other provinces. They face three big headaches every week:

1. **No Bank or Mobile Data:** Many people use basic button phones without internet data, and walking to a bank branch or ATM is expensive and far away.
2. **Midnight Blackouts & High Fees:** If your power runs out at midnight, the local spaza shop is closed. If you buy R15 of electricity on a banking app, the bank charges you up to R5 just in fees (a 33% loss).
3. **Manual Family Support:** If your mom in Free State runs out of power while you are working in Gauteng, she has to call you in the dark so you can manually buy and read out a 20-digit voucher code.


## How KG Pay Beats Existing Banking Apps

| Feature | Banking Apps / WhatsApp Vouchers | KasiGrid Pay (XRPL + USSD) |
| :--- | :--- | :--- |
| **How it works** | **Manual:** You must wake up, open an app, buy a token, and type 20 digits into the meter. | **Automatic:** When power drops below `2 kWh`, the meter tops itself up before the lights go out. |
| **Phone & Data** | Needs a smartphone, mobile data, and a South African bank account. | Works on any **basic button phone** via USSD (`*120*555#`)—zero data or bank needed. |
| **Small Top-Up Fees** | Banks charge R2–R5 flat fees (up to 33% lost on a R15 purchase). | XRPL fees cost **0.00001 XRP** (fractions of a cent), making R5–R10 top-ups affordable. |
| **Spending Safety** | Sharing a card or eWallet PIN puts your whole balance at risk. | **Ledger Safety Lock:** You lock a strict XRP cap in an XRPL Payment Channel; the meter cannot spend over it. |
| **Multi-Service & Rewards** | Separate fees for electricity, water, and data; zero rewards. | One USSD wallet for **Power, Water & Wi-Fi**, plus **`KASI` loyalty points** for free emergency units. |


## Where the Blockchain Fits (Why XRPL?)
A normal database can be hacked or edited to overcharge tenants, and traditional payment gateways are too expensive for R10 micro-payments. Using the **XRP Ledger** gives us three features a normal app cannot match:
1. **Unbreakable Spending Limits (`PaymentChannelCreate`):** The human user locks a strict budget on the XRP Ledger. Even if a meter glitches or gets hacked, the blockchain blocks any claim over your limit.
2. **Fractions-of-a-Cent Fees:** Transactions settle in 3–5 seconds for `0.00001 XRP`, allowing meters to buy tiny top-ups continuously without eating up the user's money.
3. **Cross-Service Loyalty Tokens (`KASI`):** Loyalty points are real XRPL tokens earned per kilowatt-hour delivered—meaning points earned buying electricity can be redeemed for free emergency power, water, or Wi-Fi anywhere on the network.


## More Services & Cash-In / Cash-Out Path
* **Send Power Home (Cross-Province Family Top-Ups):** A worker in Gauteng can dial `*120*555#` to fund a capped electricity channel for their mom's meter in Gauteng. Mom never has to type a voucher code—her meter tops itself up automatically within the limit set by her child.
* **Beyond Electricity (Water & Township Wi-Fi):** The same XRPL Payment Channel architecture supports prepaid **smart water sub-meters** and **pay-as-you-go township Wi-Fi hotspots**.
* **Optional Stokvel Power Pot:** Neighbours can pool small amounts into a 2-of-3 Multi-Sign community pot for midnight emergency advances, or withdraw untouched savings at year-end.
* **Where Users Get XRP:** Banked users buy XRP/RLUSD via licensed South African exchanges (**VALR** or **Luno**). Unbanked users hand R20 cash to a registered local **spaza shop agent**, who credits their USSD wallet for a tiny commission.

---

## How the Pieces Fit Together

[ Basic Phone (*120*555#) ] ---> Set budget, check points, or send power to Mom (No data needed)
             │
             ▼
[ Next.js Cloud Backend ]   ---> Connects USSD menu & meter requests to the XRP Ledger
             │
             ▼
[ The XRP Ledger ]          ---> Enforces hard spending cap & issues KASI loyalty tokens
             ▲
             │
[ Room Smart Meter ]        ---> Auto-buys power when units drop below 2 kWh


## How to Run This Project on Your Computer

### 1. Download the Code & Install Tools
Make sure you have **Node.js** installed, then open your terminal and run:
```bash
git clone https://github.com
cd kasigrid-xrpl-ussd
npm install
```

### 2. Set Up Your Test Accounts
Run this setup script. It creates free test accounts on the XRPL Testnet, sets up your `20 XRP` spending limit, and turns on `KASI` loyalty points:
```bash
node scripts/initXrpl.mjs
```

### 3. Open the App & Phone Simulator
Start the website locally:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser to see your live spending tracker and the **KasiFone USSD handset simulator**.

### 4. Test the Auto-Top-Up Meter
Run the meter script in your terminal to see a valid `2 XRP` top-up succeed (awarding `10 KASI` points) and an over-limit `25 XRP` claim get blocked by the XRP Ledger:
```bash
node scripts/meterAgent.mjs
```
