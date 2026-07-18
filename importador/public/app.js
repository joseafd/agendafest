// Fetch initial server status and configs
async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) {
      if (res.status === 401) {
        document.body.innerHTML = `
          <div style="background:#0d0d0f; color:#f3f4f6; font-family:sans-serif; text-align:center; padding:100px;">
            <h1>🤘 Acceso Restringido</h1>
            <p>Tu sesión ha expirado o no es válida.</p>
            <p style="color:#9ca3af;">Por favor, reinicia el servidor local y usa el enlace de inicio generado en la consola.</p>
          </div>
        `;
      }
      return;
    }
    const data = await res.json();
    document.getElementById('modelName').textContent = data.aiProvider === 'mock'
      ? `${data.aiProvider} (Mock Mode)`
      : `${data.aiProvider} (${data.modelConfig?.model || 'modelo configurado'})`;
    const spotifyBadge = document.getElementById('spotifyConfigStatus');
    const youtubeBadge = document.getElementById('youtubeConfigStatus');
    spotifyBadge.textContent = data.spotifyConfigured ? 'Configurado' : 'No configurado';
    spotifyBadge.className = `status-badge ${data.spotifyConfigured ? 'status-online' : 'status-warning'}`;
    youtubeBadge.textContent = data.youtubeConfigured ? 'Configurada' : 'No configurada';
    youtubeBadge.className = `status-badge ${data.youtubeConfigured ? 'status-online' : 'status-warning'}`;

    // Check if publication is enabled
    const configRes = await fetch('/api/publish/config');
    if (configRes.ok) {
      const configData = await configRes.json();
      const publishEnabled = configData.publishEnabled;
      const banner = document.getElementById('realPublishStatus');
      if (banner) {
        if (!publishEnabled) {
          banner.style.display = 'block';
        } else {
          banner.style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.error('Error al cargar estado:', err);
  }
}

// Check local Git status and decide if V3 deployment is enabled
async function checkGit() {
  try {
    const res = await fetch('/api/check-git');
    if (!res.ok) return;
    const data = await res.json();
    
    const statusBadge = document.getElementById('gitStatusBadge');
    const publishBadge = document.getElementById('gitPublishBadge');
    
    if (data.isClean) {
      statusBadge.textContent = 'Limpio';
      statusBadge.className = 'status-badge status-online';
      publishBadge.textContent = 'Habilitada (Repositorio limpio)';
      publishBadge.className = 'status-badge status-online';
    } else {
      statusBadge.textContent = 'Con cambios pendientes';
      statusBadge.className = 'status-badge status-warning';
      publishBadge.textContent = 'Deshabilitada (Git Sucio)';
      publishBadge.className = 'status-badge status-warning';
    }
  } catch (err) {
    console.error('Error al comprobar git:', err);
  }
}

// Test secure fetch endpoint for SSRF
async function testUrl() {
  const url = document.getElementById('targetUrl').value;
  const consoleOutput = document.getElementById('consoleOutput');
  consoleOutput.textContent = 'Enviando petición a la cola de verificación del servidor...\n';

  try {
    const res = await fetch('/api/fetch-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    const data = await res.json();
    if (res.ok) {
      consoleOutput.textContent = `Petición EXITOSA.\n` +
        `HTTP Status: ${data.status}\n` +
        `Content-Type: ${data.contentType}\n` +
        `Extracto del Body Sanitizado:\n${data.body}`;
    } else {
      consoleOutput.textContent = `Petición BLOQUEADA / ERROR:\n${data.error}`;
    }
  } catch (err) {
    consoleOutput.textContent = `Error al comunicar con la API: ${err.message}`;
  }
}

async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
    window.location.reload();
  } catch (err) {
    console.error(err);
  }
}

let activeImportId = null;
let statusPollInterval = null;

function renderCompletionStatus(missingFields, completeLabel) {
  if (missingFields.length === 0) {
    return `<span class="completion-status completion-status--complete">${escapeHtml(completeLabel)}</span>`;
  }

  return `
    <span class="completion-status completion-status--pending">Faltan:</span>
    <span class="missing-fields">${missingFields.map(escapeHtml).join(', ')}</span>
  `;
}

function renderMetadataSources(item, hasSocial) {
  const sources = [];
  if (item.youtubeUrl) sources.push(`Vídeo: ${item.youtubeSource || 'verificado'}`);
  else if (item.youtubeStatus === 'not_configured') sources.push('Vídeo: YouTube API no configurada');
  else if (item.youtubeStatus === 'not_found') sources.push('Vídeo: no encontrado');
  else if (item.youtubeStatus === 'api_error') sources.push('Vídeo: error temporal');
  if (hasSocial) sources.push(`RRSS: ${item.socialSource || 'verificada'}`);
  return sources.length
    ? `<span class="metadata-sources">${sources.map(escapeHtml).join(' · ')}</span>`
    : '';
}

async function startImport() {
  const url = document.getElementById('importUrl').value;
  const progressDiv = document.getElementById('importProgress');
  const logsDiv = document.getElementById('importLogs');
  const stateSpan = document.getElementById('importState');
  const reviewDiv = document.getElementById('importReview');

  progressDiv.style.display = 'block';
  reviewDiv.style.display = 'none';
  logsDiv.textContent = 'Inicializando transacción...\n';
  stateSpan.textContent = 'CREADA';

  try {
    // 1. Init Import
    const initRes = await fetch('/api/import/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const initData = await initRes.json();
    
    if (!initRes.ok) {
      logsDiv.textContent += `Error al inicializar: ${initData.error}\n`;
      stateSpan.textContent = 'FALLIDA';
      return;
    }

    activeImportId = initData.importId;
    logsDiv.textContent += `ID Transacción: ${activeImportId}\nEnviando cola de extracción...\n`;

    // 2. Process
    const processRes = await fetch('/api/import/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importId: activeImportId })
    });
    const processData = await processRes.json();

    if (!processRes.ok) {
      logsDiv.textContent += `Error al procesar: ${processData.error}\n`;
      stateSpan.textContent = 'FALLIDA';
      return;
    }

    stateSpan.textContent = 'EXTRAYENDO';

    // 3. Poll status
    if (statusPollInterval) clearInterval(statusPollInterval);
    statusPollInterval = setInterval(pollImportStatus, 1000);

  } catch (err) {
    logsDiv.textContent += `Error de comunicación: ${err.message}\n`;
    stateSpan.textContent = 'FALLIDA';
  }
}

async function pollImportStatus() {
  if (!activeImportId) return;

  const logsDiv = document.getElementById('importLogs');
  const stateSpan = document.getElementById('importState');
  const reviewDiv = document.getElementById('importReview');

  try {
    const res = await fetch(`/api/import/status/${activeImportId}`);
    if (!res.ok) return;
    const data = await res.json();

    stateSpan.textContent = data.state;
    logsDiv.textContent = data.logs.join('\n');
    // Scroll logs to bottom
    logsDiv.scrollTop = logsDiv.scrollHeight;

    if (data.state === 'PENDIENTE_REVISION') {
      clearInterval(statusPollInterval);
      renderReviewTable(data.result);
      reviewDiv.style.display = 'block';
    } else if (data.state === 'FALLIDA') {
      clearInterval(statusPollInterval);
      logsDiv.textContent += `\n\nERROR CRÍTICO: ${data.error}`;
    }
  } catch (err) {
    console.error('Error al consultar estado:', err);
  }
}

function renderReviewTable(result) {
  const tbody = document.getElementById('lineupTableBody');
  const approveButton = document.getElementById('btnApproveImport');
  const editionSummary = document.getElementById('editionSummary');
  tbody.innerHTML = '';
  approveButton.disabled = true;

  const edition = result && result.edition;
  if (edition) {
    editionSummary.textContent = `${edition.name} · ${edition.startDate} → ${edition.endDate} · ${edition.location || ''} · ID: ${edition.id || ''}`;
  } else {
    editionSummary.textContent = 'Faltan los datos obligatorios de la edición.';
  }

  if (!result || !result.lineup || result.lineup.length === 0 || !edition || !edition.id || !edition.startDate || !edition.endDate) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center; padding:15px;">No se detectaron actuaciones.</td></tr>';
    return;
  }

  reviewLineup = result.lineup;
  result.lineup.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    
    // Highlight if Spotify ID is missing
    if (!item.spotifyId) {
      tr.style.backgroundColor = 'rgba(245, 158, 11, 0.05)';
    }

    tr.dataset.index = String(index);
    const bioWordCount = String(item.bio || '').trim().split(/\s+/).filter(Boolean).length;
    const basicMissing = [
      !item.country && 'país',
      !item.genre && 'género',
      !item.bio ? 'bio' : bioWordCount < 60 ? `bio demasiado corta (${bioWordCount}/60 palabras)` : false
    ].filter(Boolean);
    const basicComplete = basicMissing.length === 0;
    const hasSocial = Boolean(item.instagramUrl || item.facebookUrl || item.xUrl || item.tiktokUrl);
    const contentMissing = [!item.youtubeUrl && 'vídeo', !item.imageUrl && 'imagen', !hasSocial && 'RRSS'].filter(Boolean);
    const contentComplete = contentMissing.length === 0;
    const spotifyStates = {
      found: ['Encontrado', '#10b981'],
      not_found: ['No encontrado', '#eab308'],
      not_configured: ['No configurado', '#9ca3af'],
      auth_error: ['Credenciales inválidas', '#ef4444'],
      api_error: ['Error temporal', '#ef4444']
    };
    const spotifyState = spotifyStates[item.spotifyStatus] || [item.spotifyId ? 'Encontrado' : 'Sin comprobar', '#9ca3af'];
    tr.innerHTML = `
      <td style="padding: 8px;" contenteditable="true" data-field="artistName">${escapeHtml(item.artistName)}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="day">${escapeHtml(item.day)}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="stage">${escapeHtml(item.stage)}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="startTime">${escapeHtml(item.startTime)}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="endTime">${escapeHtml(item.endTime)}</td>
      <td style="padding: 8px; font-family: monospace;" contenteditable="true" data-field="spotifyId">${escapeHtml(item.spotifyId || '')}</td>
      <td style="padding: 8px; color:${spotifyState[1]};">${spotifyState[0]}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="country">${escapeHtml(item.country || '')}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="genre">${escapeHtml(item.genre || '')}</td>
      <td class="completion-cell" title="${basicComplete ? 'País, género y bio disponibles' : `Faltan: ${basicMissing.join(', ')}`}">${renderCompletionStatus(basicMissing, 'Completa')}</td>
      <td class="completion-cell" title="${contentComplete ? 'Vídeo, imagen y RRSS disponibles' : `Faltan: ${contentMissing.join(', ')}`}">${renderCompletionStatus(contentMissing, 'Completo')}${renderMetadataSources(item, hasSocial)}</td>
      <td style="padding: 8px; min-width:220px;" data-field="validation"></td>
      <td style="padding: 8px; color: #9ca3af;">${item.spotifyPopularity !== undefined ? item.spotifyPopularity : '-'}</td>
      <td style="padding: 8px; text-align: center;">
        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="deleteRow(this)">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
    tr.querySelectorAll('td[contenteditable="true"]').forEach(cell => cell.addEventListener('input', () => {
      invalidateExcelComparison();
      validateReviewRows();
    }));
  });
  renderExcelComparison(result.excelPreview);
  validateReviewRows();
}

let reviewLineup = [];
let currentPreviewHash = '';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function deleteRow(btn) {
  const row = btn.parentNode.parentNode;
  row.parentNode.removeChild(row);
  invalidateExcelComparison();
  validateReviewRows();
}

function collectApprovedLineup() {
  const approvedLineup = [];
  document.querySelectorAll('#lineupTableBody tr[data-index]').forEach(row => {
    const get = field => row.querySelector(`[data-field="${field}"]`)?.textContent.trim() || '';
    const original = reviewLineup[Number(row.dataset.index)] || {};
    approvedLineup.push({
      ...original,
      artistName: get('artistName'), day: get('day'), stage: get('stage'),
      startTime: get('startTime'), endTime: get('endTime'), spotifyId: get('spotifyId'),
      country: get('country'), genre: get('genre')
    });
  });
  return approvedLineup;
}

function invalidateExcelComparison() {
  currentPreviewHash = '';
  const checkbox = document.getElementById('comparisonReviewed');
  checkbox.checked = false;
  checkbox.disabled = true;
  document.getElementById('comparisonSummary').textContent = 'Los datos editados ya no coinciden con la comparación. Pulsa “Actualizar comparación”.';
}

function renderExcelComparison(preview) {
  const summary = document.getElementById('comparisonSummary');
  const content = document.getElementById('comparisonContent');
  const checkbox = document.getElementById('comparisonReviewed');
  content.innerHTML = '';
  currentPreviewHash = preview?.previewHash || '';
  checkbox.checked = false;
  checkbox.disabled = !currentPreviewHash;

  if (!preview || !Array.isArray(preview.artists)) {
    summary.textContent = 'No se pudo generar la comparación. Pulsa “Actualizar comparación”.';
    return;
  }
  const totals = preview.totals || {};
  summary.textContent = `${preview.artists.length} artistas: ${totals.newArtists || 0} nuevos · ${totals.additions || 0} campos añadidos · ${totals.updates || 0} actualizados · ${totals.preserved || 0} valores existentes conservados.`;

  const labels = {
    nuevo: ['NUEVO', '#60a5fa'], añadir: ['AÑADIR', '#10b981'], actualizar: ['ACTUALIZAR', '#f59e0b'],
    mantener: ['MANTENER', '#a78bfa'], sin_cambios: ['SIN CAMBIOS', '#9ca3af'], sin_dato: ['SIN DATO', '#6b7280']
  };
  preview.artists.forEach(artist => {
    const visibleFields = (artist.fields || []).filter(field => field.decision !== 'sin_cambios' && field.decision !== 'sin_dato');
    const details = document.createElement('details');
    details.style.cssText = 'border-top:1px solid var(--border-color); padding:9px 0;';
    const status = artist.status === 'nuevo' ? 'NUEVO' : artist.status === 'actualizar' ? 'CAMBIOS' : 'SIN CAMBIOS';
    details.innerHTML = `<summary style="cursor:pointer; font-weight:600;">${escapeHtml(artist.artistName)} <span style="color:#9ca3af; font-weight:400;">· ${status} · ${visibleFields.length} campo(s) relevante(s)</span></summary>`;
    if (visibleFields.length) {
      const table = document.createElement('table');
      table.style.cssText = 'width:100%; margin-top:8px; border-collapse:collapse; font-size:12px;';
      table.innerHTML = '<thead><tr><th style="text-align:left;padding:5px;">Campo</th><th style="text-align:left;padding:5px;">Actual en Excel</th><th style="text-align:left;padding:5px;">Propuesto</th><th style="text-align:left;padding:5px;">Decisión</th></tr></thead>';
      const body = document.createElement('tbody');
      visibleFields.forEach(field => {
        const [label, color] = labels[field.decision] || [field.decision, '#9ca3af'];
        const row = document.createElement('tr');
        row.style.borderTop = '1px solid var(--border-color)';
        row.innerHTML = `<td style="padding:5px;">${escapeHtml(field.field)}</td><td style="padding:5px;word-break:break-word;">${escapeHtml(field.current || '—')}</td><td style="padding:5px;word-break:break-word;">${escapeHtml(field.proposed || '—')}</td><td style="padding:5px;color:${color};font-weight:700;">${label}</td>`;
        body.appendChild(row);
      });
      table.appendChild(body);
      details.appendChild(table);
    }
    content.appendChild(details);
  });
}

async function refreshExcelComparison() {
  const feedback = document.getElementById('saveFeedback');
  if (!validateReviewRows()) return;
  const button = document.getElementById('btnRefreshComparison');
  button.disabled = true;
  document.getElementById('comparisonSummary').textContent = 'Comparando, sin modificar el Excel…';
  try {
    const res = await fetch('/api/import/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importId: activeImportId, lineup: collectApprovedLineup() })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo generar la comparación.');
    renderExcelComparison(data.preview);
    feedback.style.display = 'none';
  } catch (err) {
    invalidateExcelComparison();
    feedback.style.display = 'block';
    feedback.style.color = '#ef4444';
    feedback.textContent = `Error al comparar: ${err.message}`;
  } finally {
    button.disabled = false;
    validateReviewRows();
  }
}

function validateReviewRows() {
  const edition = document.getElementById('editionSummary').textContent;
  const editionMatch = edition.match(/(\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2})/);
  const startDate = editionMatch ? editionMatch[1] : '';
  const endDate = editionMatch ? editionMatch[2] : '';
  const rows = [...document.querySelectorAll('#lineupTableBody tr[data-index]')];
  let invalidRows = 0;

  rows.forEach((row, rowIndex) => {
    const value = field => row.querySelector(`[data-field="${field}"]`)?.textContent.trim() || '';
    const issues = [];
    const day = value('day');
    const validTime = time => {
      const match = /^(\d{2}):(\d{2})$/.exec(time);
      return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
    };
    if (!value('artistName')) issues.push('sin artista');
    if (!value('stage')) issues.push('sin escenario');
    if (!validTime(value('startTime')) || !validTime(value('endTime'))) issues.push('hora inválida');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) issues.push('fecha no ISO');
    else if (startDate && endDate && (day < startDate || day > endDate)) {
      issues.push(`${day} fuera de ${startDate}–${endDate}`);
    }

    const validationCell = row.querySelector('[data-field="validation"]');
    validationCell.textContent = issues.length ? `Fila ${rowIndex + 1}: ${issues.join('; ')}` : 'Correcta';
    validationCell.style.color = issues.length ? '#fca5a5' : '#10b981';
    if (issues.length) {
      invalidRows++;
      row.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
    } else if (!value('spotifyId')) {
      row.style.backgroundColor = 'rgba(245, 158, 11, 0.05)';
    } else {
      row.style.backgroundColor = '';
    }
  });

  const summary = document.getElementById('reviewValidation');
  summary.style.display = invalidRows ? 'block' : 'none';
  summary.textContent = invalidRows ? `${invalidRows} actuación(es) requieren corrección. Las filas aparecen resaltadas en rojo.` : '';
  const comparisonReviewed = document.getElementById('comparisonReviewed')?.checked;
  document.getElementById('btnApproveImport').disabled = rows.length === 0 || invalidRows > 0 || !currentPreviewHash || !comparisonReviewed;
  return invalidRows === 0 && rows.length > 0;
}

async function approveImport() {
  const approvedLineup = collectApprovedLineup();
  const feedback = document.getElementById('saveFeedback');

  if (!validateReviewRows()) {
    feedback.style.display = 'block';
    feedback.style.color = '#ef4444';
    feedback.textContent = 'Corrige primero todas las filas resaltadas en rojo.';
    return;
  }

  if (approvedLineup.length === 0) {
    feedback.style.display = 'block';
    feedback.style.color = '#ef4444';
    feedback.textContent = 'No hay actuaciones válidas para importar.';
    return;
  }

  feedback.style.display = 'block';
  feedback.style.color = '#eab308'; // Warning color (yellow)
  feedback.textContent = 'Guardando cambios en Excel...';

  try {
    const res = await fetch('/api/import/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        importId: activeImportId,
        lineup: approvedLineup,
        previewHash: currentPreviewHash
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      feedback.style.color = 'var(--success-color)';
      feedback.textContent = `¡Importación finalizada con éxito! ${approvedLineup.length} actuaciones guardadas en AgendaFest.xlsx.`;
      document.getElementById('publishCard').style.display = 'block';
      
      // Refresh status log to show save completion
      pollImportStatus(); 
    } else {
      feedback.style.color = '#ef4444';
      feedback.textContent = `Error al guardar: ${data.error}`;
    }
  } catch (err) {
    feedback.style.color = '#ef4444';
    feedback.textContent = `Error de comunicación: ${err.message}`;
  }
}

let activePlanId = null;
let publishPollInterval = null;

function resetImport() {
  activeImportId = null;
  activePlanId = null;
  currentPreviewHash = '';
  if (statusPollInterval) clearInterval(statusPollInterval);
  if (publishPollInterval) clearInterval(publishPollInterval);
  document.getElementById('importProgress').style.display = 'none';
  document.getElementById('importReview').style.display = 'none';
  document.getElementById('saveFeedback').style.display = 'none';
  document.getElementById('publishCard').style.display = 'none';
  if (document.getElementById('buildLogs')) {
    document.getElementById('buildLogs').style.display = 'none';
    document.getElementById('deployLogs').style.display = 'none';
    document.getElementById('v3Checks').style.display = 'none';
    document.getElementById('validationFeedback').style.display = 'none';
    document.getElementById('btnGeneratePlan').disabled = true;
    document.getElementById('btnValidate').disabled = true;
    document.getElementById('btnBuild').disabled = false;
    document.getElementById('btnBuild').textContent = 'Compilar Local';
    document.getElementById('btnGeneratePlan').textContent = 'Generar Plan';
    document.getElementById('btnValidate').textContent = 'Iniciar Validación V3';
    document.getElementById('planDetails').style.display = 'none';
  }
}

async function publishBuild() {
  const btn = document.getElementById('btnBuild');
  const logs = document.getElementById('buildLogs');
  btn.disabled = true;
  btn.textContent = 'Compilando...';
  logs.style.display = 'block';
  logs.textContent = 'Iniciando compilación local (sincronización Excel y empaquetado Vite)...';

  try {
    const res = await fetch('/api/publish/build', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      logs.textContent = data.logs;
      logs.scrollTop = logs.scrollHeight;
      document.getElementById('btnGeneratePlan').disabled = false;
      btn.textContent = 'Compilación Completada';
    } else {
      logs.textContent += `\n\nERROR: ${data.error}`;
      btn.disabled = false;
      btn.textContent = 'Reintentar Compilar';
    }
  } catch (err) {
    logs.textContent += `\n\nERROR DE COMUNICACIÓN: ${err.message}`;
    btn.disabled = false;
    btn.textContent = 'Reintentar Compilar';
  }
}

async function generatePublishPlan() {
  const btn = document.getElementById('btnGeneratePlan');
  btn.disabled = true;
  btn.textContent = 'Generando Plan...';
  
  try {
    const res = await fetch('/api/publish/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importId: activeImportId })
    });
    const data = await res.json();
    if (res.ok) {
      const plan = data.plan;
      activePlanId = plan.planId;
      
      document.getElementById('planIdText').textContent = plan.planId;
      document.getElementById('planCommitMsg').textContent = plan.commitMessage;
      
      const expiryDate = new Date(plan.expiresAt);
      document.getElementById('planExpiry').textContent = expiryDate.toLocaleTimeString();
      
      const filesList = document.getElementById('planFilesList');
      filesList.innerHTML = '';
      plan.files.forEach(f => {
        const li = document.createElement('li');
        li.innerHTML = `📄 <code style="color: #34d399;">${f.name}</code> (SHA-256: <span style="font-family: monospace; color: #a7f3d0;">${f.sha256.substring(0, 16)}...</span>)`;
        filesList.appendChild(li);
      });
      
      document.getElementById('planDetails').style.display = 'block';
      btn.textContent = 'Plan Generado';
    } else {
      alert('Error al generar el plan de publicación: ' + data.error);
      btn.disabled = false;
      btn.textContent = 'Generar Plan';
    }
  } catch (err) {
    alert('Error de comunicación: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Generar Plan';
  }
}

function resetPublishPlan() {
  activePlanId = null;
  document.getElementById('planDetails').style.display = 'none';
  const btn = document.getElementById('btnGeneratePlan');
  btn.disabled = false;
  btn.textContent = 'Generar Plan';
}

async function publishDeploy() {
  const btn = document.getElementById('btnConfirmDeploy');
  const logs = document.getElementById('deployLogs');
  btn.disabled = true;
  btn.textContent = 'Desplegando...';
  logs.style.display = 'block';
  logs.textContent = `Enviando confirmación de un solo uso para plan ${activePlanId}...`;

  try {
    const res = await fetch('/api/publish/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: activePlanId })
    });
    const data = await res.json();
    if (res.ok) {
      logs.textContent = 'Commit y push exitosos en backend. Esperando tracking de CI/CD...\n';
      document.getElementById('planDetails').style.display = 'none';
      
      startPublishStatusPolling(activePlanId);
    } else {
      logs.textContent += `\n\nERROR: ${data.error}`;
      btn.disabled = false;
      btn.textContent = 'Confirmar y Desplegar (Git Push)';
    }
  } catch (err) {
    logs.textContent += `\n\nERROR DE COMUNICACIÓN: ${err.message}`;
    btn.disabled = false;
    btn.textContent = 'Confirmar y Desplegar (Git Push)';
  }
}

function startPublishStatusPolling(planId) {
  if (publishPollInterval) clearInterval(publishPollInterval);
  const logs = document.getElementById('deployLogs');
  
  publishPollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/publish/status/${planId}`);
      if (!res.ok) {
        clearInterval(publishPollInterval);
        logs.textContent += '\nError al consultar estado del plan de publicación.';
        return;
      }
      const data = await res.json();
      const plan = data.plan;
      
      logs.textContent = plan.logs.join('\n');
      logs.scrollTop = logs.scrollHeight;
      
      if (plan.state === 'PUBLICADA') {
        clearInterval(publishPollInterval);
        document.getElementById('btnValidate').disabled = false;
        publishValidate();
      } else if (plan.state === 'ERROR_DESPLIEGUE') {
        clearInterval(publishPollInterval);
        logs.textContent += '\n\nERROR DE DESPLIEGUE DETECTADO.';
      }
    } catch (err) {
      console.error('Error polling status:', err);
    }
  }, 3000);
}

async function publishValidate() {
  const btn = document.getElementById('btnValidate');
  const checksDiv = document.getElementById('v3Checks');
  const feedback = document.getElementById('validationFeedback');
  
  btn.disabled = true;
  btn.textContent = 'Verificando...';
  checksDiv.style.display = 'block';
  feedback.style.display = 'none';

  const resetChk = (id) => {
    const el = document.getElementById(id);
    el.style.backgroundColor = '#374151';
    el.textContent = 'WAIT';
  };
  resetChk('chkWeb');
  resetChk('chkManifest');
  resetChk('chkSW');
  resetChk('chkEdition');

  try {
    const statusRes = await fetch(`/api/import/status/${activeImportId}`);
    if (!statusRes.ok) {
      feedback.style.display = 'block';
      feedback.style.color = '#ef4444';
      feedback.textContent = 'No se pudo obtener información de la transacción activa.';
      btn.disabled = false;
      btn.textContent = 'Reintentar Validación';
      return;
    }

    const transaction = await statusRes.json();
    const targetUrl = transaction.url;
    const edicionId = transaction.result ? transaction.result.edition.id : 'resurrection-fest-2026';

    const res = await fetch('/api/publish/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, edicionId })
    });
    
    const data = await res.json();
    if (res.ok) {
      const updateChk = (id, result) => {
        const el = document.getElementById(id);
        el.style.backgroundColor = result.passed ? '#059669' : '#dc2626';
        el.textContent = result.passed ? 'OK' : 'FAIL';
        el.title = result.message;
      };

      updateChk('chkWeb', data.results.webStatus);
      updateChk('chkManifest', data.results.manifest);
      updateChk('chkSW', data.results.serviceWorker);
      updateChk('chkEdition', data.results.editionCheck);

      const allPassed = data.results.webStatus.passed &&
                        data.results.manifest.passed &&
                        data.results.serviceWorker.passed &&
                        data.results.editionCheck.passed;

      feedback.style.display = 'block';
      if (allPassed) {
        feedback.style.color = 'var(--success-color)';
        feedback.textContent = '¡Verificación V3 Completada! Todos los recursos remotos y caché PWA auditados con éxito.';
      } else {
        feedback.style.color = '#eab308';
        feedback.textContent = 'Validación completada con advertencias. Revisa los elementos fallidos (pasa el cursor sobre FAIL para ver el motivo).';
      }
      btn.disabled = false;
      btn.textContent = 'Ejecutar Validación V3 de nuevo';
    } else {
      feedback.style.display = 'block';
      feedback.style.color = '#ef4444';
      feedback.textContent = `Fallo en el validador: ${data.error}`;
      btn.disabled = false;
      btn.textContent = 'Reintentar Validación';
    }
  } catch (err) {
    feedback.style.display = 'block';
    feedback.style.color = '#ef4444';
    feedback.textContent = `Error de comunicación: ${err.message}`;
    btn.disabled = false;
    btn.textContent = 'Reintentar Validación';
  }
}

// Auto load
loadStatus();
checkGit();
