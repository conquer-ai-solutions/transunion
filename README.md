# TransUnion × Conquer AI — Fraud Signal Triage Agent

**POC · March 2026**

A working proof of concept for TransUnion's Intelligent Fraud Signal Triage Agent. Built by Conquer AI to demonstrate the confirm-or-correct workflow — AI classifies incoming fraud alerts, analysts confirm or override, every decision logs to a full audit trail.

---

## What This Demonstrates

| Capability | What You See |
|-----------|-------------|
| Signal ingestion | 8 pre-loaded fraud alerts across 5 fraud types |
| AI classification | Real-time Claude classification — risk type, urgency, confidence, rationale |
| Confirm-or-correct | One-click confirm or structured override with reason capture |
| Auto-routing | High-confidence, low-risk alerts resolve automatically |
| Audit trail | Every decision logged — exportable as CSV |
| Metrics dashboard | Queue size, AI accuracy, corrections, time saved |

---

## Quick Start

### 1. Open the app

Open `index.html` directly in a browser — no build step, no server required.

Or serve locally:
```bash
npx serve .
# or
python3 -m http.server 8080
```

### 2. Add your Anthropic API key

1. Click **⚙ Settings** in the top right
2. Enter your Anthropic API key (`sk-ant-api03-…`)
3. Click **Save**

Get a key at [console.anthropic.com](https://console.anthropic.com)

### 3. Classify an alert

1. Click any alert in the queue
2. Click **⚡ Classify with AI**
3. Review the AI's risk type, confidence score, rationale, and suggested action
4. Click **✓ Confirm** or **✏ Correct**

---

## Alert Types in This POC

- **Card Not Present Fraud** — geographic mismatch, new device, high IP risk
- **Account Takeover** — credential compromise, MFA bypass, unusual login location
- **Synthetic Identity Fraud** — thin credit file, SSN pattern anomalies, failed employer verification
- **Identity Verification Failure** — liveness check failure, low face match score
- **First Party Fraud** — high dispute velocity, chargeback pattern

---

## Fraud Types & Signal Fields

Each alert contains raw signal data from the fraud detection engine — IP risk scores, velocity metrics, device fingerprints, geographic data, and behavioural signals. Claude analyses all fields and returns:

```json
{
  "risk_type": "Card Not Present Fraud",
  "urgency": "HIGH",
  "confidence": 0.91,
  "recommendation": "ESCALATE",
  "rationale": "IP risk score of 0.91 combined with geographic mismatch (card holder: GB, merchant: NG) and unrecognised device fingerprint strongly indicates CNP fraud. Velocity of 9 transactions in 24h is 6x the customer average.",
  "key_signals": ["ip_risk_score: 0.91", "new device", "geographic mismatch GB→NG", "velocity 9x avg"],
  "suggested_action": "Block transaction. Contact card holder on verified number to confirm legitimacy.",
  "false_positive_probability": 0.07,
  "regulatory_note": null
}
```

---

## The Confirm-or-Correct Pattern

This is Conquer AI's signature human-in-the-loop approach:

1. **AI classifies** — returns risk type, confidence, rationale
2. **Analyst reviews** — sees full signal data + AI brief side by side
3. **Analyst confirms or corrects** — one click to accept; structured override with reason if not
4. **Every decision logged** — timestamp, AI output, analyst action, correction reason
5. **Corrections are training signals** — in production, these feed model improvement

The system gets more accurate with every correction made.

---

## Autonomy Level

This POC runs at **Level 2 — Augment**:
- AI classifies and recommends
- Human confirms or corrects
- No autonomous action without analyst sign-off (except explicit auto-resolve at ≥95% confidence)

Level 3 (Automate) is the next phase once accuracy thresholds are proven.

---

## Data & Privacy

- All data is stored in `localStorage` in your browser only
- No data is sent anywhere except the Anthropic API for classification
- The Anthropic API key is stored locally and never logged
- Sample alert data is synthetic — no real customer records

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript — no build step |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| Storage | Browser localStorage |
| Fonts | Inter + JetBrains Mono (Google Fonts) |
| Assets | TransUnion SVG logo + favicon from transunion.com |

---

## File Structure

```
/
├── index.html          Main app shell + all views
├── css/
│   └── styles.css      All styling — TransUnion brand, dark mode, mobile
├── js/
│   ├── data.js         Sample alert data + config constants
│   ├── api.js          Anthropic API integration
│   └── app.js          Application logic — state, rendering, interactions
└── README.md
```

---

## Next Steps (Production Path)

1. Connect to live fraud detection engine API (replace sample data)
2. Add analyst authentication layer
3. Implement correction → model fine-tuning pipeline
4. Deploy into TransUnion cloud environment (AWS/Azure/GCP)
5. Integrate with existing case management system
6. Activate Level 3 autonomy for qualifying alert types once ≥85% accuracy proven

---

*Conquer AI — Proof of Concept — March 2026*  
*Luke Morrisen · luke.morrisen@conquer.ai*  
*Thomas Buckley · CTO*  
*Bolaji Olatoye · Head of AI Solutions · bolaji@conquer.ai*
