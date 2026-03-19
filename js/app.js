// ─────────────────────────────────────────────────────────────────────────────
// TransUnion × Conquer AI — Fraud Signal Triage Agent
// Main Application Logic
// ─────────────────────────────────────────────────────────────────────────────

// ── STATE ────────────────────────────────────────────────────────────────────
const STATE = {
  alerts: [],
  auditLog: [],
  currentAlertId: null,
  currentClassification: null,
  currentFilter: "all",
  apiKey: "",
  classifying: false,
  view: "dashboard", // dashboard | detail | audit | settings
};

// ── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  // Load persisted data
  STATE.apiKey = localStorage.getItem("tu_api_key") || "";
  const savedLog = localStorage.getItem("tu_audit_log");
  if (savedLog) {
    try { STATE.auditLog = JSON.parse(savedLog); } catch { STATE.auditLog = []; }
  }
  const savedAlerts = localStorage.getItem("tu_alerts");
  if (savedAlerts) {
    try {
      STATE.alerts = JSON.parse(savedAlerts);
    } catch {
      STATE.alerts = SAMPLE_ALERTS.map(a => ({ ...a }));
    }
  } else {
    STATE.alerts = SAMPLE_ALERTS.map(a => ({ ...a }));
    saveAlerts();
  }

  // Build tabs + render
  buildNavTabs();
  renderDashboard();
  showView("dashboard");
  updateNavCounts();

  // Prefill API key field if present
  const keyInput = document.getElementById("apiKeyInput");
  if (keyInput && STATE.apiKey) {
    keyInput.value = STATE.apiKey;
  }
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function showView(name) {
  STATE.view = name;
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const el = document.getElementById(`view-${name}`);
  if (el) el.classList.add("active");

  document.querySelectorAll(".nav-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.view === name);
  });

  if (name === "dashboard") renderDashboard();
  if (name === "audit") renderAuditLog();
}

function buildNavTabs() {
  const container = document.getElementById("navTabs");
  const tabs = [
    { view: "dashboard", label: "Alert Queue", countId: "count-queue" },
    { view: "audit",     label: "Audit Log",   countId: "count-audit" },
    { view: "settings",  label: "⚙ Settings",  countId: null },
  ];
  container.innerHTML = tabs.map(t => `
    <button class="nav-tab" data-view="${t.view}" onclick="showView('${t.view}')">
      ${t.label}
      ${t.countId ? `<span class="tab-count muted" id="${t.countId}">0</span>` : ""}
    </button>
  `).join("");
}

function updateNavCounts() {
  const pending = STATE.alerts.filter(a => a.status === "pending").length;
  const qEl = document.getElementById("count-queue");
  const aEl = document.getElementById("count-audit");
  if (qEl) {
    qEl.textContent = pending;
    qEl.className = "tab-count" + (pending > 0 ? "" : " muted");
  }
  if (aEl) {
    aEl.textContent = STATE.auditLog.length;
    aEl.className = "tab-count muted";
  }
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  const container = document.getElementById("view-dashboard");
  const filtered = filterAlerts(STATE.alerts, STATE.currentFilter);
  const pending = STATE.alerts.filter(a => a.status === "pending").length;
  const resolved = STATE.alerts.filter(a => a.status !== "pending").length;
  const confirmed = STATE.auditLog.filter(e => e.action === "confirmed").length;
  const corrected = STATE.auditLog.filter(e => e.action === "corrected").length;
  const totalDecisions = confirmed + corrected;
  const accuracy = totalDecisions > 0
    ? Math.round((confirmed / totalDecisions) * 100)
    : "—";
  const timeSaved = (STATE.auditLog.length * 4.2).toFixed(0);

  container.innerHTML = `
    <div class="dashboard">
      <div class="page-header">
        <h1>Fraud Signal Queue</h1>
        <p>Incoming alerts from fraud detection engines — classified by AI, reviewed by your team</p>
      </div>

      ${!STATE.apiKey ? `
      <div class="no-key-banner">
        <div>
          <p><strong>API key required</strong> — Enter your Anthropic API key in Settings to enable AI classification.</p>
        </div>
        <button class="btn btn-correct" onclick="showView('settings')">Go to Settings →</button>
      </div>` : ""}

      <div class="metrics">
        <div class="metric-card crit">
          <div class="metric-value" id="m-pending">${pending}</div>
          <div class="metric-label">Pending Review</div>
          <div class="metric-sub">Awaiting analyst decision</div>
        </div>
        <div class="metric-card ok">
          <div class="metric-value">${resolved}</div>
          <div class="metric-label">Resolved</div>
          <div class="metric-sub">Confirmed or corrected</div>
        </div>
        <div class="metric-card tu">
          <div class="metric-value">${accuracy}${accuracy !== "—" ? "%" : ""}</div>
          <div class="metric-label">AI Accuracy</div>
          <div class="metric-sub">${totalDecisions} decisions made</div>
        </div>
        <div class="metric-card brand">
          <div class="metric-value">${timeSaved}m</div>
          <div class="metric-label">Time Saved</div>
          <div class="metric-sub">Est. vs manual triage</div>
        </div>
        <div class="metric-card warn">
          <div class="metric-value">${corrected}</div>
          <div class="metric-label">Corrections</div>
          <div class="metric-sub">AI overrides — training signals</div>
        </div>
      </div>

      <div class="section-header">
        <h2>Alert Queue (${filtered.length})</h2>
        <div class="filter-row">
          ${["all","pending","confirmed","corrected","auto_resolved"].map(f => `
            <button class="filter-btn ${STATE.currentFilter === f ? "active" : ""}"
              onclick="setFilter('${f}')">${f.replace("_"," ")}</button>
          `).join("")}
        </div>
      </div>

      <div class="alert-list">
        ${filtered.length === 0
          ? `<div style="text-align:center;padding:48px;color:var(--text-3)">No alerts matching this filter</div>`
          : filtered.map(a => renderAlertRow(a)).join("")
        }
      </div>
    </div>
  `;
}

function setFilter(f) {
  STATE.currentFilter = f;
  renderDashboard();
}

function filterAlerts(alerts, filter) {
  if (filter === "all") return [...alerts].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
  });
  return alerts.filter(a => a.status === filter);
}

function renderAlertRow(alert) {
  const pc = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.LOW;
  const typeLabel = ALERT_TYPE_LABELS[alert.alertType] || alert.alertType;
  const ago = timeAgo(alert.timestamp);
  const statusBadge = alert.status === "pending"
    ? `<span class="badge" style="background:${pc.bg};color:${pc.color}">${pc.label}</span>`
    : `<span class="badge" style="background:var(--surface-3);color:var(--text-2)">${alert.status.replace("_"," ")}</span>`;

  const amount = alert.signal?.transaction_amount
    ? `${alert.signal.currency || "$"}${alert.signal.transaction_amount?.toLocaleString()}`
    : alert.signal?.credit_requested
    ? `$${alert.signal.credit_requested?.toLocaleString()} credit`
    : "";

  return `
    <div class="alert-row status-${alert.status}" onclick="openAlert('${alert.id}')">
      <div class="alert-priority-dot" style="background:${pc.color};box-shadow:0 0 6px ${pc.color}40"></div>
      <div class="alert-main">
        <div class="alert-id">${alert.id}</div>
        <div class="alert-type">${typeLabel}</div>
        <div class="alert-meta">${alert.source}${amount ? " · " + amount : ""} · ${alert.customer.segment} · ${alert.customer.country}</div>
      </div>
      <div class="alert-badges">
        ${statusBadge}
        ${alert.aiResult ? `<span class="badge" style="background:var(--tu-tint);color:var(--tu-blue)">${Math.round(alert.aiResult.confidence * 100)}% conf</span>` : ""}
      </div>
      <div class="alert-time">${ago}</div>
    </div>
  `;
}

// ── ALERT DETAIL ──────────────────────────────────────────────────────────────
function openAlert(id) {
  const alert = STATE.alerts.find(a => a.id === id);
  if (!alert) return;
  STATE.currentAlertId = id;
  STATE.currentClassification = alert.aiResult || null;
  renderDetailView(alert);
  showView("detail");
}

function renderDetailView(alert) {
  const container = document.getElementById("view-detail");
  const pc = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.LOW;
  const typeLabel = ALERT_TYPE_LABELS[alert.alertType] || alert.alertType;

  container.innerHTML = `
    <div class="detail-view">
      <button class="back-btn" onclick="showView('dashboard')">← Back to Queue</button>

      <div class="detail-header">
        <div class="detail-title">
          <h1>${typeLabel}</h1>
          <div class="detail-meta">
            <span class="badge" style="background:${pc.bg};color:${pc.color}">${pc.label}</span>
            <span class="badge" style="background:var(--surface-2);color:var(--text-2)">${alert.id}</span>
            <span class="badge" style="background:var(--surface-2);color:var(--text-2)">${alert.source}</span>
            <span class="badge" style="background:var(--surface-2);color:var(--text-2)">${alert.customer.segment} · ${alert.customer.country}</span>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-3);font-family:monospace">
          ${new Date(alert.timestamp).toLocaleString()}
        </div>
      </div>

      <!-- Signal Data -->
      <h2 style="margin-bottom:12px">Signal Data</h2>
      <div class="signal-grid">
        ${renderSignalCards(alert.signal)}
      </div>

      <!-- AI Classification -->
      <div class="ai-section" id="aiSection">
        <div class="ai-section-header">
          <div>
            <div class="label" style="color:var(--tu-blue);margin-bottom:4px">AI Classification</div>
            <div style="font-size:12px;color:var(--text-2)">Powered by Claude · Conquer AI Triage Agent</div>
          </div>
          ${alert.status === "pending" && !alert.aiResult ? `
            <button class="btn btn-classify" id="classifyBtn" onclick="classifyAlert('${alert.id}')"
              ${!STATE.apiKey ? "disabled title='Add API key in Settings'" : ""}>
              ⚡ Classify with AI
            </button>` : ""}
        </div>
        <div id="aiResultArea">
          ${alert.aiResult ? renderAIResult(alert.aiResult) : `
            <div class="ai-loading" style="padding:30px;text-align:center;color:var(--text-3)">
              ${STATE.apiKey
                ? "Click <strong>Classify with AI</strong> to analyse this alert"
                : `<span style="color:var(--alert)">Add your Anthropic API key in <a href="#" onclick="showView('settings')" style="color:var(--tu-blue)">Settings</a> to enable classification</span>`
              }
            </div>
          `}
        </div>
      </div>

      <!-- Decision bar -->
      <div class="decision-bar" id="decisionBar">
        ${renderDecisionBar(alert)}
      </div>
    </div>
  `;
}

function renderSignalCards(signal) {
  if (!signal) return '<div class="signal-card"><div class="signal-val">No signal data</div></div>';
  return Object.entries(signal).map(([key, val]) => {
    let riskClass = "";
    if (key.includes("risk_score") || key.includes("ip_risk")) {
      riskClass = val > 0.7 ? "high-risk" : val > 0.4 ? "med-risk" : "low-risk";
    }
    if (key === "velocity_24h" && val > 6) riskClass = "high-risk";
    if (key === "mfa_bypassed" && val === true) riskClass = "high-risk";
    if (key === "3ds_authenticated" && val === false) riskClass = "med-risk";
    if (key === "face_match_score" && val < 0.5) riskClass = "high-risk";
    const display = typeof val === "boolean"
      ? (val ? "YES" : "NO")
      : typeof val === "number" && val % 1 !== 0
      ? val.toFixed(2)
      : String(val);
    return `
      <div class="signal-card">
        <div class="signal-key">${key.replace(/_/g, " ")}</div>
        <div class="signal-val ${riskClass}">${display}</div>
      </div>
    `;
  }).join("");
}

function renderAIResult(result) {
  if (!result) return "";
  const rec = result.recommendation || "INVESTIGATE";
  const recColour = {
    BLOCK: "var(--danger)", ESCALATE: "var(--alert)",
    INVESTIGATE: "var(--tu-blue)", AUTO_RESOLVE: "var(--success)"
  }[rec] || "var(--text-2)";

  return `
    <div class="ai-result">
      <div class="ai-row">
        <div class="ai-field">
          <div class="ai-field-label">Risk Type</div>
          <div class="ai-field-val">${result.risk_type}</div>
        </div>
        <div class="ai-field">
          <div class="ai-field-label">Urgency</div>
          <div class="ai-field-val" style="color:${PRIORITY_CONFIG[result.urgency]?.color || "var(--text-1)"}">${result.urgency}</div>
        </div>
        <div class="ai-field">
          <div class="ai-field-label">Recommendation</div>
          <div class="ai-field-val" style="color:${recColour}">${rec}</div>
        </div>
        <div class="ai-field">
          <div class="ai-field-label">Confidence</div>
          <div class="ai-field-val">${Math.round(result.confidence * 100)}%</div>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width:${result.confidence * 100}%"></div>
          </div>
        </div>
        <div class="ai-field">
          <div class="ai-field-label">False Positive Risk</div>
          <div class="ai-field-val" style="color:${result.false_positive_probability > 0.4 ? "var(--alert)" : "var(--success)"}">
            ${Math.round((result.false_positive_probability || 0) * 100)}%
          </div>
        </div>
      </div>

      <div class="ai-field-label" style="margin-bottom:6px">AI Rationale</div>
      <div class="rationale-box">${result.rationale}</div>

      <div class="ai-field-label" style="margin-bottom:6px">Key Signals Identified</div>
      <div class="signals-list">
        ${(result.key_signals || []).map(s => `<span class="signal-tag">${s}</span>`).join("")}
      </div>

      <div class="suggested-action">
        <div class="action-label">Suggested Action</div>
        ${result.suggested_action}
      </div>

      ${result.regulatory_note ? `<div class="regulatory-note">${result.regulatory_note}</div>` : ""}
    </div>
  `;
}

function renderDecisionBar(alert) {
  if (alert.status === "confirmed") {
    return `<div class="decision-done">✓ <strong style="color:var(--success)">Confirmed</strong> — AI classification accepted. Logged to audit trail.</div>`;
  }
  if (alert.status === "corrected") {
    return `<div class="decision-done">✏ <strong style="color:var(--alert)">Corrected</strong> — Your classification has been logged. Feeds back as training signal.</div>`;
  }
  if (alert.status === "auto_resolved") {
    return `<div class="decision-done">⚡ <strong style="color:var(--text-2)">Auto-resolved</strong> — High confidence, low risk. Logged automatically.</div>`;
  }
  if (!alert.aiResult) {
    return `<div class="decision-label">Run AI classification first, then confirm or correct the result.</div>`;
  }
  return `
    <div class="decision-label">
      AI says: <strong>${alert.aiResult.risk_type}</strong> (${Math.round(alert.aiResult.confidence * 100)}% confidence)
      <br><span style="font-size:12px;color:var(--text-3)">Review the classification above, then confirm or correct.</span>
    </div>
    <div class="decision-buttons">
      <button class="btn btn-confirm" onclick="confirmAlert('${alert.id}')">✓ Confirm</button>
      <button class="btn btn-correct" onclick="openCorrectModal('${alert.id}')">✏ Correct</button>
    </div>
  `;
}

// ── AI CLASSIFICATION ──────────────────────────────────────────────────────────
async function classifyAlert(alertId) {
  if (STATE.classifying) return;
  if (!STATE.apiKey) { showToast("Add your API key in Settings first", "error"); return; }

  const alert = STATE.alerts.find(a => a.id === alertId);
  if (!alert) return;

  STATE.classifying = true;

  // Show spinner
  const classifyBtn = document.getElementById("classifyBtn");
  if (classifyBtn) { classifyBtn.disabled = true; classifyBtn.textContent = "Classifying…"; }

  const resultArea = document.getElementById("aiResultArea");
  if (resultArea) {
    resultArea.innerHTML = `
      <div class="ai-loading">
        <div class="ai-spinner"></div>
        <div>Analysing signal data…</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:6px;font-family:monospace">Claude is reviewing ${Object.keys(alert.signal).length} signal fields</div>
      </div>`;
  }

  try {
    const result = await API.classifyAlert(alert, STATE.apiKey);
    alert.aiResult = result;

    // Auto-resolve if very high confidence and low false positive risk
    if (result.confidence >= 0.95 && result.false_positive_probability <= 0.05
        && result.recommendation === "AUTO_RESOLVE") {
      alert.status = "auto_resolved";
      logAudit(alert, "auto_resolved", result, null);
      showToast(`${alertId} auto-resolved (${Math.round(result.confidence * 100)}% confidence)`, "info");
    }

    saveAlerts();
    if (resultArea) resultArea.innerHTML = renderAIResult(result);

    // Update decision bar
    const decisionBar = document.getElementById("decisionBar");
    if (decisionBar) decisionBar.innerHTML = renderDecisionBar(alert);

    // Hide classify button
    const btn = document.getElementById("classifyBtn");
    if (btn) btn.style.display = "none";

    updateNavCounts();
  } catch (err) {
    showToast(err.message || "Classification failed", "error");
    if (resultArea) {
      resultArea.innerHTML = `<div class="ai-loading" style="color:var(--danger)">${err.message}</div>`;
    }
    if (classifyBtn) { classifyBtn.disabled = false; classifyBtn.textContent = "⚡ Classify with AI"; }
  } finally {
    STATE.classifying = false;
  }
}

// ── CONFIRM / CORRECT ─────────────────────────────────────────────────────────
function confirmAlert(alertId) {
  const alert = STATE.alerts.find(a => a.id === alertId);
  if (!alert || !alert.aiResult) return;
  alert.status = "confirmed";
  logAudit(alert, "confirmed", alert.aiResult, null);
  saveAlerts();
  updateNavCounts();
  showToast(`${alertId} confirmed — logged to audit trail`, "success");

  // Re-render decision bar
  const db = document.getElementById("decisionBar");
  if (db) db.innerHTML = renderDecisionBar(alert);
}

function openCorrectModal(alertId) {
  document.getElementById("correctAlertId").value = alertId;
  document.getElementById("correctModal").classList.remove("hidden");
}

function closeCorrectModal() {
  document.getElementById("correctModal").classList.add("hidden");
}

function submitCorrection() {
  const alertId = document.getElementById("correctAlertId").value;
  const newType = document.getElementById("correctType").value;
  const newUrgency = document.getElementById("correctUrgency").value;
  const reason = document.getElementById("correctReason").value.trim();

  if (!reason) { showToast("Please provide a reason for the correction", "error"); return; }

  const alert = STATE.alerts.find(a => a.id === alertId);
  if (!alert) return;

  const correction = { risk_type: newType, urgency: newUrgency, reason };
  alert.status = "corrected";
  alert.correction = correction;
  logAudit(alert, "corrected", alert.aiResult, correction);
  saveAlerts();
  updateNavCounts();
  closeCorrectModal();
  showToast(`${alertId} corrected — training signal logged`, "info");

  // Re-render decision bar
  const db = document.getElementById("decisionBar");
  if (db) db.innerHTML = renderDecisionBar(alert);
}

// ── AUDIT LOG ─────────────────────────────────────────────────────────────────
function logAudit(alert, action, aiResult, correction) {
  STATE.auditLog.unshift({
    id: alert.id,
    timestamp: new Date().toISOString(),
    alertType: ALERT_TYPE_LABELS[alert.alertType] || alert.alertType,
    priority: alert.priority,
    action,
    aiRiskType: aiResult?.risk_type || "—",
    aiConfidence: aiResult ? Math.round(aiResult.confidence * 100) : "—",
    aiRecommendation: aiResult?.recommendation || "—",
    correctedTo: correction ? `${correction.risk_type} · ${correction.urgency}` : null,
    correctionReason: correction?.reason || null,
  });
  localStorage.setItem("tu_audit_log", JSON.stringify(STATE.auditLog));
  updateNavCounts();
}

function renderAuditLog() {
  const container = document.getElementById("view-audit");
  container.innerHTML = `
    <div class="audit-view">
      <div class="page-header">
        <h1>Audit Log</h1>
        <p>Complete record of every classification decision — AI and analyst. Full trail for regulatory review.</p>
      </div>
      ${STATE.auditLog.length === 0
        ? `<div class="audit-empty"><div style="font-size:32px;margin-bottom:12px">📋</div>No decisions logged yet. Classify and review alerts to build the audit trail.</div>`
        : `
        <div style="overflow-x:auto">
          <table class="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Alert ID</th>
                <th>Type</th>
                <th>AI Classification</th>
                <th>Confidence</th>
                <th>Recommendation</th>
                <th>Analyst Action</th>
                <th>Correction / Reason</th>
              </tr>
            </thead>
            <tbody>
              ${STATE.auditLog.map(entry => `
                <tr>
                  <td class="td-id">${new Date(entry.timestamp).toLocaleTimeString()}<br><span style="color:var(--text-3)">${new Date(entry.timestamp).toLocaleDateString()}</span></td>
                  <td class="td-id">${entry.id}</td>
                  <td>${entry.alertType}</td>
                  <td>${entry.aiRiskType}</td>
                  <td style="font-family:monospace">${entry.aiConfidence}%</td>
                  <td><span class="badge" style="background:var(--surface-2);color:var(--text-2)">${entry.aiRecommendation}</span></td>
                  <td class="td-action-${entry.action}">${entry.action.replace("_"," ")}</td>
                  <td style="color:var(--text-2);font-size:11px">
                    ${entry.correctedTo ? `<strong style="color:var(--alert)">${entry.correctedTo}</strong><br>` : ""}
                    ${entry.correctionReason || (entry.action === "confirmed" ? "AI accepted" : "")}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div style="margin-top:16px;display:flex;gap:12px;align-items:center">
          <span style="font-size:12px;color:var(--text-3)">${STATE.auditLog.length} entries</span>
          <button class="btn btn-cancel" style="font-size:11px;padding:5px 12px" onclick="exportAuditCSV()">⬇ Export CSV</button>
          <button class="btn btn-cancel" style="font-size:11px;padding:5px 12px;color:var(--danger)" onclick="clearAuditLog()">Clear log</button>
        </div>
        `
      }
    </div>
  `;
}

function exportAuditCSV() {
  const headers = ["Time","Alert ID","Type","AI Classification","Confidence","Recommendation","Analyst Action","Corrected To","Reason"];
  const rows = STATE.auditLog.map(e => [
    new Date(e.timestamp).toISOString(),
    e.id, e.alertType, e.aiRiskType, e.aiConfidence + "%",
    e.aiRecommendation, e.action, e.correctedTo || "", e.correctionReason || ""
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `transunion_audit_log_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
}

function clearAuditLog() {
  if (!confirm("Clear the entire audit log? This cannot be undone.")) return;
  STATE.auditLog = [];
  localStorage.removeItem("tu_audit_log");
  updateNavCounts();
  renderAuditLog();
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function saveApiKey() {
  const val = document.getElementById("apiKeyInput").value.trim();
  if (!val) { setStatus("err", "API key cannot be empty"); return; }
  if (!val.startsWith("sk-ant-")) { setStatus("err", "Key should start with sk-ant-…"); return; }
  STATE.apiKey = val;
  localStorage.setItem("tu_api_key", val);
  setStatus("ok", "✓ Saved — ready to classify alerts");
  updateNavCounts();
}

function clearApiKey() {
  document.getElementById("apiKeyInput").value = "";
  STATE.apiKey = "";
  localStorage.removeItem("tu_api_key");
  setStatus("ok", "API key cleared");
}

function resetData() {
  if (!confirm("Reset all alerts and clear the audit log? This cannot be undone.")) return;
  STATE.alerts = SAMPLE_ALERTS.map(a => ({ ...a, aiResult: undefined, correction: undefined }));
  STATE.auditLog = [];
  saveAlerts();
  localStorage.removeItem("tu_audit_log");
  updateNavCounts();
  showToast("Data reset to sample alerts", "info");
}

function setStatus(type, msg) {
  const el = document.getElementById("saveStatus");
  if (el) { el.className = "save-status " + type; el.textContent = msg; }
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function saveAlerts() {
  localStorage.setItem("tu_alerts", JSON.stringify(STATE.alerts));
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transition = "opacity 300ms"; }, 2800);
  setTimeout(() => toast.remove(), 3200);
}
