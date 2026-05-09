let dashboardData = null;

const elements = {
  sourceFile: document.querySelector('#sourceFile'),
  summaryStrip: document.querySelector('#summaryStrip'),
  actionBand: document.querySelector('#actionBand'),
  actionGrid: document.querySelector('#actionGrid'),
  actionHealth: document.querySelector('#actionHealth'),
  workflowGrid: document.querySelector('#workflowGrid'),
  workflowHealth: document.querySelector('#workflowHealth'),
  n8nHealth: document.querySelector('#n8nHealth'),
  n8nLivePanel: document.querySelector('#n8nLivePanel'),
  inventoryAlerts: document.querySelector('#inventoryAlerts'),
  backfillList: document.querySelector('#backfillList'),
  duplicateSlots: document.querySelector('#duplicateSlots'),
  dataQuality: document.querySelector('#dataQuality'),
  refreshButton: document.querySelector('#refreshButton'),
  exportButton: document.querySelector('#exportButton'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value) {
  if (!value) return 'unbekannt';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusClass(value, goodWhenZero = false) {
  if (goodWhenZero) return value === 0 ? 'ok' : 'warn';
  return value ? 'warn' : 'ok';
}

function renderMetric(label, value, note, tone = '') {
  return `
    <article class="metric-card">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
      <div class="metric-note ${tone}">${escapeHtml(note)}</div>
    </article>
  `;
}

function renderSummary(data) {
  const metrics = data.workbook.metrics;
  const sourceLabel = data.workbook.source === 'google_sheets_live' ? 'Live' : 'Lokal';
  elements.summaryStrip.innerHTML = [
    renderMetric('Lokale Workflows', data.overview.workflowCount, `${data.overview.checksOk}/${data.overview.checksTotal} Prüfungen ok`),
    renderMetric('n8n Live', data.overview.n8nWorkflowCount ?? 0, renderN8nSummary(data)),
    renderMetric('Aktive Produktzeilen', metrics.activeProducts, `${metrics.backfillCandidates} ohne product_slot_id`),
    renderMetric('Datenquelle', sourceLabel, data.workbook.source === 'google_sheets_live' ? 'Google Sheets Live' : 'Fallback auf lokale XLSX'),
  ].join('');

  const actions = data.overview.immediateActions.length
    ? data.overview.immediateActions.map((item) => `<span class="chip warn">${escapeHtml(item)}</span>`).join('')
    : '<span class="chip ok">Keine unmittelbaren lokalen Auffälligkeiten</span>';

  elements.actionBand.innerHTML = `
    <div>
      <h3>Nächste sinnvolle Aktion</h3>
      <div class="muted">Diese Hinweise basieren auf den lokalen Workflow-JSONs und der XLSX-Arbeitsmappe.</div>
    </div>
    <div class="action-list">${actions}</div>
  `;
}

function workflowCode(fileName) {
  const match = fileName.match(/WF\d+/i);
  return match ? match[0].toUpperCase() : 'WF';
}

function renderWorkflowCard(workflow) {
  const failed = workflow.checks.filter((check) => !check.ok);
  const checkRows = workflow.checks.map((check) => `
    <div class="check-row ${check.ok ? '' : 'failed'}">
      <span class="check-dot"></span>
      <span>
        <strong>${escapeHtml(check.label)}</strong><br>
        ${escapeHtml(check.detail || '')}
      </span>
    </div>
  `).join('');

  return `
    <article class="workflow-card">
      <div class="workflow-top">
        <div>
          <span class="chip info">${escapeHtml(workflowCode(workflow.fileName))}</span>
          <div class="workflow-title">${escapeHtml(workflow.title)}</div>
        </div>
        <span class="status-pill ${failed.length ? 'warn' : 'ok'}">${failed.length ? `${failed.length} offen` : 'ok'}</span>
      </div>

      <div class="workflow-meta">
        <div class="mini-stat"><span>Nodes</span><strong>${workflow.nodeCount}</strong></div>
        <div class="mini-stat"><span>Google</span><strong>${workflow.googleNodeCount}</strong></div>
        <div class="mini-stat"><span>Code</span><strong>${workflow.codeNodeCount}</strong></div>
        <div class="mini-stat"><span>Execute</span><strong>${workflow.executeNodeCount}</strong></div>
      </div>

      <div class="muted">Zuletzt geändert: ${escapeHtml(formatDate(workflow.updatedAt))}</div>
      <div class="check-list">${checkRows || '<div class="muted">Keine Spezialprüfungen definiert.</div>'}</div>
    </article>
  `;
}

function renderWorkflows(data) {
  elements.workflowGrid.innerHTML = data.workflows.map(renderWorkflowCard).join('');
  const ok = data.overview.checksOk === data.overview.checksTotal && data.overview.codeModesOk;
  elements.workflowHealth.className = `status-pill ${ok ? 'ok' : 'warn'}`;
  elements.workflowHealth.textContent = ok ? 'Workflow-Prüfung ok' : 'Prüfung mit Hinweisen';
}

function renderWorkflowActions(data) {
  const actions = data.actions || [];
  const runnableCount = actions.filter((action) => action.runnable).length;
  elements.actionHealth.className = `status-pill ${runnableCount ? 'ok' : 'warn'}`;
  elements.actionHealth.textContent = runnableCount
    ? `${runnableCount}/${actions.length} auslösbar`
    : 'Trigger fehlen';

  elements.actionGrid.innerHTML = actions.map((action) => {
    const stateClass = action.runnable ? 'ok' : action.workflowId ? 'warn' : 'danger';
    const buttonLabel = action.triggerType === 'form'
      ? 'Formular öffnen'
      : action.triggerType === 'webhook'
        ? 'Workflow starten'
        : 'Noch nicht auslösbar';
    const editorButton = action.editorUrl
      ? `<a class="button small" href="${escapeHtml(action.editorUrl)}" target="_blank" rel="noreferrer">In n8n öffnen</a>`
      : '';

    return `
      <article class="action-card">
        <div class="action-card-top">
          <div>
            <span class="chip ${stateClass}">${escapeHtml(action.workflowActive ? 'aktiv' : action.workflowId ? 'inaktiv' : 'fehlt')}</span>
            <h3>${escapeHtml(action.label)}</h3>
          </div>
        </div>
        <p>${escapeHtml(action.description)}</p>
        <div class="action-meta">
          <span class="mono">${escapeHtml(action.workflowName || 'kein Workflow zugeordnet')}</span>
          <span>${escapeHtml(action.status)}</span>
        </div>
        <div class="action-buttons">
          <button class="button primary small" type="button" data-action-id="${escapeHtml(action.id)}" ${action.runnable ? '' : 'disabled'}>${escapeHtml(buttonLabel)}</button>
          ${editorButton}
        </div>
      </article>
    `;
  }).join('');

  elements.actionGrid.querySelectorAll('[data-action-id]').forEach((button) => {
    button.addEventListener('click', () => triggerWorkflowAction(button.dataset.actionId, button));
  });
}

async function triggerWorkflowAction(actionId, button) {
  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = 'Starte...';

  try {
    const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.message || 'Aktion konnte nicht gestartet werden.');
    if (result.mode === 'open' && result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    }
    button.textContent = result.mode === 'open' ? 'Geöffnet' : 'Gestartet';
    await loadDashboard();
  } catch (error) {
    button.textContent = 'Fehler';
    window.alert(error.message);
  } finally {
    setTimeout(() => {
      button.textContent = oldText;
      button.disabled = false;
    }, 1600);
  }
}

function renderN8nLive(data) {
  const n8n = data.n8n || {};
  const ok = n8n.status === 'ok';
  const missing = n8n.status === 'missing_api_key';
  elements.n8nHealth.className = `status-pill ${ok ? 'ok' : missing ? 'warn' : 'danger'}`;
  elements.n8nHealth.textContent = ok ? 'Live verbunden' : missing ? 'API-Key fehlt' : 'Nicht verbunden';

  if (!ok) {
    elements.n8nLivePanel.innerHTML = `
      <div class="empty-state">
        <strong>${escapeHtml(n8n.message || 'n8n API nicht verbunden')}</strong><br>
        <span class="muted">Base URL: ${escapeHtml(n8n.baseUrl || 'nicht gesetzt')}</span><br>
        <span class="muted">Lege im Ordner dashboard eine .env.local mit N8N_BASE_URL und N8N_API_KEY an.</span>
      </div>
    `;
    return;
  }

  renderTable(elements.n8nLivePanel, [
    { label: 'Status', render: (row) => `<span class="chip ${row.active ? 'ok' : 'warn'}">${row.active ? 'aktiv' : 'inaktiv'}</span>` },
    { label: 'Workflow', key: 'name' },
    { label: 'ID', key: 'id', mono: true },
    { label: 'Nodes', key: 'nodeCount' },
    { label: 'Trigger', key: 'triggerCount' },
    { label: 'Google', key: 'googleNodeCount' },
    { label: 'Zuletzt geändert', render: (row) => escapeHtml(formatDate(row.updatedAt)) },
  ], n8n.workflows || [], 'Keine Workflows aus n8n erhalten.');
}

function renderN8nSummary(data) {
  const n8n = data.n8n || {};
  if (n8n.status === 'ok') return `${n8n.workflows.length} live aus n8n`;
  if (n8n.status === 'missing_api_key') return 'n8n API-Key fehlt';
  return 'n8n nicht verbunden';
}

function renderTable(target, columns, rows, emptyText) {
  if (!rows.length) {
    target.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    return;
  }

  const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rows.map((row) => `
    <tr>
      ${columns.map((column) => `<td class="${column.mono ? 'mono' : ''}">${column.render ? column.render(row) : escapeHtml(row[column.key])}</td>`).join('')}
    </tr>
  `).join('');

  target.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderWorkbook(data) {
  const workbook = data.workbook;
  const sourceName = workbook.source === 'google_sheets_live' ? 'Google Sheets live' : workbook.fileName || 'lokale XLSX';
  elements.sourceFile.textContent = `${sourceName} · ${formatDate(workbook.updatedAt)}`;

  if (workbook.fallbackReason) {
    elements.sourceFile.textContent += ` · Fallback: ${workbook.fallbackReason}`;
  }

  renderTable(elements.inventoryAlerts, [
    { label: 'Status', render: (row) => `<span class="chip ${row.severity === 'critical' ? 'danger' : 'warn'}">${row.severity === 'critical' ? 'kritisch' : 'Warnung'}</span>` },
    { label: 'Produkt', key: 'name' },
    { label: 'Charge', key: 'batch_id', mono: true },
    { label: 'Rest', key: 'remaining_qty' },
    { label: 'MHD', render: (row) => `${escapeHtml(row.mhd)}<br><span class="muted">${row.days_left < 0 ? `${Math.abs(row.days_left)} Tage überfällig` : `in ${row.days_left} Tagen`}</span>` },
  ], workbook.inventoryAlerts, 'Keine lokale MHD-/Restbestandswarnung gefunden.');

  renderTable(elements.backfillList, [
    { label: 'Zeile', key: 'row_number' },
    { label: 'Produkt', key: 'product_key', mono: true },
    { label: 'MDB', key: 'mdb_code' },
    { label: 'Vorschlag', key: 'proposed_product_slot_id', mono: true },
  ], workbook.backfillCandidates, 'Keine aktive Slotzeile ohne product_slot_id gefunden.');

  renderTable(elements.duplicateSlots, [
    { label: 'Slot', key: 'slot' },
    { label: 'Anzahl', key: 'count' },
    { label: 'Produkte', key: 'product_keys', mono: true },
    { label: 'Zeilen', render: (row) => escapeHtml(row.rows.join(', ')) },
  ], workbook.duplicateActiveSlots, 'Keine doppelte aktive MDB-Slotbelegung gefunden.');

  const qualityRows = [
    ...workbook.orphanBatches.map((row) => ({ type: 'Verwaiste Charge', detail: `${row.batch_id} · ${row.product_key}`, rows: row.row_number })),
    ...workbook.duplicateProductKeys.map((row) => ({ type: 'Mehrfacher product_key', detail: row.product_key, rows: row.rows.join(', ') })),
  ].slice(0, 16);

  renderTable(elements.dataQuality, [
    { label: 'Typ', key: 'type' },
    { label: 'Detail', key: 'detail', mono: true },
    { label: 'Zeile(n)', key: 'rows' },
  ], qualityRows, 'Keine auffälligen lokalen Stammdaten gefunden.');
}

async function loadDashboard() {
  elements.refreshButton.disabled = true;
  elements.refreshButton.textContent = 'Lädt...';
  try {
    const response = await fetch('/api/dashboard', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    dashboardData = await response.json();
    renderSummary(dashboardData);
    renderWorkflowActions(dashboardData);
    renderWorkflows(dashboardData);
    renderN8nLive(dashboardData);
    renderWorkbook(dashboardData);
  } catch (error) {
    elements.actionBand.innerHTML = `<div class="empty-state">Dashboard konnte nicht geladen werden: ${escapeHtml(error.message)}</div>`;
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.textContent = 'Aktualisieren';
  }
}

function exportDashboard() {
  if (!dashboardData) return;
  const blob = new Blob([JSON.stringify(dashboardData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `automatenlager-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});

elements.refreshButton.addEventListener('click', loadDashboard);
elements.exportButton.addEventListener('click', exportDashboard);

loadDashboard();
