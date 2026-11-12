# KasiGrid Pay: Easy Township Electricity Using Any Phone

KasiGrid Pay helps people in South African townships buy prepaid electricity without needing a bank account, a fancy smartphone, or mobile data. 

By connecting simple phone menus (**USSD**) to the XRP Ledger, a room's electricity meter can automatically top itself up before the lights go out—while keeping the tenant 100% in control of how much money gets spent.


## The Problem I am Solving
In townships like Soweto, Tembisa, and Khayelitsha, thousands of people rent backyard rooms that share one main electricity box. They face two big headaches every week:
1. No Bank or Data: Many people use basic button phones without internet data, and walking to a bank branch or ATM is expensive and far away.
2. Midnight Blackouts & High Fees: If your power runs out at midnight, the local spaza shop is closed. If you buy R15 of electricity on a banking app, the bank charges you up to R5 just in fees.

## How KasiGrid Pay Fixes This
Built a system where your electricity meter handles small top-ups for you, while you set the rules from your phone:

* Works on Any Phone (USSD):You just dial `*120*555#` on a basic phone...no internet needed. You can check your power balance, raise your monthly limit, or claim free electricity rewards.
* Auto-Top-Up Meter (Smart Agent): When your room drops below `2 kWh` of power, the meter automatically pays for a small top-up on the XRP Ledger so you never sit in the dark.
* Strict Spending Limit (Safety Lock): You decide your monthly electricity budget (for example, `20 XRP`) and lock it in a digital channel. The meter cannot take a single cent more than your limit, even if it glitches.
* Free Power Rewards (`KASI` Points): Every time your meter buys power, you earn `KASI` loyalty points. Once you collect 10 points, you can trade them for free emergency electricity.



## How the Pieces Fit Together

[ Basic Phone (120555#) ]  --->  You set your budget & check points (No data needed)
│
▼
[ Your Website / App ]       --->  Connects your phone menu to the XRP Ledger
│
▼
[ The XRP Ledger ]           --->  Holds your money safely & blocks overspending
▲
│
[ Room Electricity Meter ]   --->  Automatically buys small top-ups when power gets low


## How to Run This Project on Your Computer

### 1. Download the Code & Install Tools
Install Node.js, then run terminal

git clone https://github.com
cd kasigrid-xrpl-ussd
npm install


### 2. Set Up Your Test Accounts
Run this setup script. It automatically creates two free test accounts on the XRP Testnet, sets up your `20 XRP` spending limit, and turns on the `KASI` loyalty points:

node scripts/initXrpl.mjs


### 3. Open the App & Phone Simulator
Start the website locally:
npm run dev

Open `http://localhost:3000` in your browser. You will see your live electricity spending tracker on the left and a button-phone USSD simulator on the right.

### 4. Test the Auto-Top-Up Meter
Run the meter script in your terminal to see two things happen:
1. When power is low, the meter buys `2 XRP` of power and gives you `10 KASI` loyalty points.
2. When the meter tries to take `25 XRP` (which is over your `20 XRP` limit), the XRP Ledger blocks it immediately.

node scripts/meterAgent.mjs

