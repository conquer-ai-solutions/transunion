// ─────────────────────────────────────────────────────────────────────────────
// TransUnion × Conquer AI — Anthropic API Integration
// Fraud Signal Classification Engine
// ─────────────────────────────────────────────────────────────────────────────

const API = {
  async classifyAlert(alert, apiKey) {
    const signalJson = JSON.stringify(alert.signal, null, 2);
    const prompt = `You are a fraud detection AI for TransUnion, one of the world's largest consumer credit reporting agencies. Your job is to classify incoming fraud alerts with precision and provide clear, actionable guidance to human analysts.

ALERT DETAILS:
- Alert ID: ${alert.id}
- Alert Type: ${ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
- Source System: ${alert.source}
- Customer Segment: ${alert.customer.segment}
- Customer Country: ${alert.customer.country}

RAW SIGNAL DATA:
${signalJson}

Analyse this alert and return ONLY a valid JSON object with exactly this structure (no markdown, no explanation, just the JSON):

{
  "risk_type": "string — specific fraud type (e.g. 'Card Not Present Fraud', 'Account Takeover', 'Synthetic Identity Fraud', 'First Party Fraud', 'False Positive')",
  "urgency": "CRITICAL | HIGH | MEDIUM | LOW",
  "confidence": number between 0.00 and 1.00,
  "recommendation": "AUTO_RESOLVE | ESCALATE | INVESTIGATE | BLOCK",
  "rationale": "2-3 clear sentences explaining exactly why you classified it this way, referencing specific signal values",
  "key_signals": ["array of 3-5 specific signal values that most influenced this classification"],
  "suggested_action": "One specific, actionable instruction for the analyst — what to do right now",
  "false_positive_probability": number between 0.00 and 1.00,
  "regulatory_note": "null or a short note if there are regulatory/compliance implications the analyst must be aware of"
}

Be precise. Reference actual numbers from the signal data. If ip_risk_score is 0.91, say so. If velocity is 9 in 24h against an average of 2, flag that. Analysts trust you when you cite your evidence.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error("Invalid API key. Please check your Anthropic API key in Settings.");
      if (response.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
      throw new Error(err.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.content[0]?.text || "";

    // Strip any markdown fences if present
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      return JSON.parse(clean);
    } catch {
      throw new Error("AI returned an unexpected response format. Please try again.");
    }
  }
};
