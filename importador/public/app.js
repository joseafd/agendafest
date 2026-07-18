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
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:15px;">No se detectaron actuaciones.</td></tr>';
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
    const complete = Boolean(item.country && item.genre && item.bio);
    tr.innerHTML = `
      <td style="padding: 8px;" contenteditable="true" data-field="artistName">${escapeHtml(item.artistName)}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="day">${escapeHtml(item.day)}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="stage">${escapeHtml(item.stage)}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="startTime">${escapeHtml(item.startTime)}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="endTime">${escapeHtml(item.endTime)}</td>
      <td style="padding: 8px; font-family: monospace;" contenteditable="true" data-field="spotifyId">${escapeHtml(item.spotifyId || '')}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="country">${escapeHtml(item.country || '')}</td>
      <td style="padding: 8px;" contenteditable="true" data-field="genre">${escapeHtml(item.genre || '')}</td>
      <td style="padding: 8px; color:${complete ? '#10b981' : '#eab308'};">${complete ? 'Completa' : 'Pendiente'}</td>
      <td style="padding: 8px; color: #9ca3af;">${item.spotifyPopularity !== undefined ? item.spotifyPopularity : '-'}</td>
      <td style="padding: 8px; text-align: center;">
        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="deleteRow(this)">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  approveButton.disabled = false;
}

let reviewLineup = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function deleteRow(btn) {
  const row = btn.parentNode.parentNode;
  row.parentNode.removeChild(row);
  document.getElementById('btnApproveImport').disabled =
    document.querySelectorAll('#lineupTableBody td[contenteditable="true"]').length === 0;
}

async function approveImport() {
  const tbody = document.getElementById('lineupTableBody');
  const rows = tbody.querySelectorAll('tr');
  const approvedLineup = [];
  const feedback = document.getElementById('saveFeedback');

  rows.forEach(row => {
    const cells = row.querySelectorAll('td[contenteditable="true"]');
    if (cells.length > 0) {
      const artistName = row.querySelector('[data-field="artistName"]').textContent.trim();
      const day = row.querySelector('[data-field="day"]').textContent.trim();
      const stage = row.querySelector('[data-field="stage"]').textContent.trim();
      const startTime = row.querySelector('[data-field="startTime"]').textContent.trim();
      const endTime = row.querySelector('[data-field="endTime"]').textContent.trim();
      const spotifyId = row.querySelector('[data-field="spotifyId"]').textContent.trim();
      const country = row.querySelector('[data-field="country"]').textContent.trim();
      const genre = row.querySelector('[data-field="genre"]').textContent.trim();
      const original = reviewLineup[Number(row.dataset.index)] || {};

      approvedLineup.push({ ...original, artistName, day, stage, startTime, endTime, spotifyId, country, genre });
    }
  });

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
        lineup: approvedLineup
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
