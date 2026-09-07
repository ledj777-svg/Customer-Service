# Cartly · SUPPORTER

Customer-support chatbot for a marketplace checkout. Every order receives a unique ID (`SPT-XXXX-XXXXXX`). **SUPPORTER** uses that ID to:

- track the courier on a live route
- cancel while the order is still confirmed or packed
- replace a delivered order (new unique ID)
- collect cash-on-delivery via a UPI QR minted for that ID
- accept a photo of the received parcel and open a complaint ticket

The assistant is powered by **SpaceXAI (Grok 4.6)** when `XAI_API_KEY` is set, and falls back to a local desk agent so the demo still works offline.

## Run

```bash
npm install
cp .env.example .env.local
# optional: paste XAI_API_KEY in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo unique IDs

| ID | What to try |
| --- | --- |
| `SPT-DEMO-TRCK01` | Track + unpaid COD QR |
| `SPT-DEMO-CNCL02` | Cancel |
| `SPT-DEMO-RPLC03` | Replace or photo complaint |

Place a real order from the floor to mint a fresh ID, then talk to the widget in the bottom-right corner.
