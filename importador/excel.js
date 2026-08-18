const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');

const excelPath = path.join(__dirname, '..', 'AgendaFest.xlsx');
const backupsDir = path.join(__dirname, 'backups');

/**
 * Checks if the Excel file is physically locked (e.g. opened in Excel).
 * @param {string} filePath 
 * @returns {boolean} True if locked, false otherwise.
 */
function isExcelLocked(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const fd = fs.openSync(filePath, 'r+');
    fs.closeSync(fd);
    return false;
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      return true;
    }
    throw err;
  }
}

/**
 * Unlinks a file with retries and exponential backoff for EBUSY/EPERM errors on Windows.
 * @param {string} filePath Absolute path of the file to delete.
 * @param {number} retries Maximum number of retries.
 * @param {number} delay Initial delay in milliseconds.
 * @returns {Promise<void>}
 */
async function unlinkWithRetry(filePath, retries = 5, delay = 100) {
  if (!fs.existsSync(filePath)) return;
  for (let i = 0; i < retries; i++) {
    try {
      fs.unlinkSync(filePath);
      return;
    } catch (err) {
      if ((err.code === 'EBUSY' || err.code === 'EPERM') && i < retries - 1) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Clean up old backups, keeping only the 10 most recent ones.
 */
async function cleanBackups() {
  try {
    if (!fs.existsSync(backupsDir)) return;
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('AgendaFest_') && f.endsWith('.xlsx'))
      .map(f => ({
        name: f,
        path: path.join(backupsDir, f),
        time: fs.statSync(path.join(backupsDir, f)).mtime.getTime()
      }));

    files.sort((a, b) => b.time - a.time); // descending (newest first)
    if (files.length > 10) {
      for (let i = 10; i < files.length; i++) {
        await unlinkWithRetry(files[i].path);
      }
    }
  } catch (e) {
    console.error('Error al limpiar copias de seguridad:', e);
  }
}

/**
 * Normalizes artist name to Title Case for Nombre normalizado.
 * @param {string} name 
 * @returns {string}
 */
function toTitleCase(name) {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function cellText(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text.trim();
    if (typeof value.hyperlink === 'string') return value.hyperlink.trim();
    if (Array.isArray(value.richText)) return value.richText.map(part => part.text || '').join('').trim();
  }
  return String(value).trim();
}

const ARTIST_PREVIEW_FIELDS = [
  ['Spotify Artist ID', item => item.spotifyId],
  ['País', item => item.country],
  ['Género principal', item => item.genre || item.spotifyGenres?.[0]],
  ['Descripción', item => item.description],
  ['Bio', item => item.bio],
  ['YouTube', item => item.youtubeUrl],
  ['Imagen', item => item.imageUrl],
  ['Spotify', item => item.spotifyUrl],
  ['Instagram', item => item.instagramUrl],
  ['Facebook', item => item.facebookUrl],
  ['Web Oficial Artista', item => item.officialWebsite],
  ['TikTok', item => item.tiktokUrl],
  ['X URL', item => item.xUrl],
  ['Fuentes artista', item => Array.isArray(item.sourceUrls) ? item.sourceUrls.join(' | ') : '']
];

/**
 * Builds a read-only, field-level comparison with the current workbook.
 * Empty proposed values always mean "keep": the preview never proposes data loss.
 */
async function buildImportPreview(approvedData) {
  if (!approvedData || !Array.isArray(approvedData.lineup)) {
    throw new Error('No hay datos válidos para comparar con AgendaFest.xlsx.');
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const artistasSheet = workbook.getWorksheet('Artistas');
  if (!artistasSheet) throw new Error('AgendaFest.xlsx no contiene la hoja Artistas.');

  const headers = artistasSheet.getRow(1).values;
  const artistIdColumn = headers.indexOf('Artista ID');
  const rowsByArtistId = new Map();
  artistasSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = cellText(row.getCell(artistIdColumn).value).toLowerCase();
    if (id) rowsByArtistId.set(id, row);
  });

  const uniqueArtists = new Map();
  approvedData.lineup.forEach(item => {
    const artistName = String(item.artistName || '').trim();
    if (!artistName) return;
    const artistId = slugify(artistName);
    if (!uniqueArtists.has(artistId)) uniqueArtists.set(artistId, item);
  });

  const artists = [];
  const totals = { newArtists: 0, unchanged: 0, additions: 0, updates: 0, preserved: 0 };
  for (const [artistId, item] of uniqueArtists) {
    const existingRow = rowsByArtistId.get(artistId) || null;
    const fields = [];
    let changedFields = 0;
    for (const [header, getProposed] of ARTIST_PREVIEW_FIELDS) {
      const column = headers.indexOf(header);
      const current = existingRow && column > 0 ? cellText(existingRow.getCell(column).value) : '';
      const proposed = cellText(getProposed(item));
      let decision;
      if (!existingRow) {
        decision = proposed ? 'nuevo' : 'sin_dato';
      } else if (!proposed && current) {
        decision = 'mantener';
        totals.preserved++;
      } else if (!proposed && !current || proposed === current) {
        decision = 'sin_cambios';
        totals.unchanged++;
      } else if (!current) {
        decision = 'añadir';
        totals.additions++;
        changedFields++;
      } else {
        decision = 'actualizar';
        totals.updates++;
        changedFields++;
      }
      fields.push({ field: header, current, proposed, decision });
    }
    if (!existingRow) totals.newArtists++;
    artists.push({
      artistId,
      artistName: String(item.artistName || '').trim(),
      status: existingRow ? (changedFields ? 'actualizar' : 'existente') : 'nuevo',
      fields
    });
  }

  const stat = fs.statSync(excelPath);
  const fingerprint = {
    excel: { size: stat.size, mtimeMs: Math.trunc(stat.mtimeMs) },
    edition: approvedData.edition || {},
    lineup: approvedData.lineup
  };
  const previewHash = crypto.createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
  return { previewHash, generatedAt: new Date().toISOString(), totals, artists };
}

function isoDateToExcelSerial(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    throw new Error(`Fecha inválida: "${value}". Debe usar YYYY-MM-DD.`);
  }
  const milliseconds = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(milliseconds)) throw new Error(`Fecha inválida: "${value}".`);
  return milliseconds / 86400000 + 25569;
}

/**
 * Safe cell value writer that prevents formula injection by setting cell type to String explicitly
 * when the value starts with formula characters.
 * @param {object} cell ExcelJS Cell.
 * @param {*} value Value to write.
 */
function writeCellSafely(cell, value) {
  if (value === undefined || value === null) {
    cell.value = '';
    return;
  }

  const strVal = String(value);
  if (typeof value === 'string' && (strVal.startsWith('=') || strVal.startsWith('+') || strVal.startsWith('-') || strVal.startsWith('@'))) {
    cell.value = strVal;
    cell.type = ExcelJS.ValueType.String;
  } else {
    cell.value = value;
  }
}

/**
 * Saves the approved lineup and logs transactions in the Excel file in a two-phase manner.
 * @param {object} approvedData Lineup and metadata.
 * @param {string} user Active username.
 * @param {string} importId Transaction ID.
 * @returns {Promise<boolean>}
 */
async function saveImportToExcel(approvedData, user, importId) {
  if (isExcelLocked(excelPath)) {
    throw new Error('El archivo AgendaFest.xlsx está bloqueado por otra aplicación (cierre Microsoft Excel y reintente).');
  }

  // Phase 1: Backup current excel file
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `AgendaFest_${timestamp}.xlsx`);
  if (fs.existsSync(excelPath)) {
    fs.copyFileSync(excelPath, backupPath);
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    // Initialize new sheets if missing
    let impSheet = workbook.getWorksheet('Importaciones');
    if (!impSheet) {
      impSheet = workbook.addWorksheet('Importaciones');
      impSheet.addRow(['Importacion ID', 'Festival ID', 'Edicion ID', 'Usuario', 'Fecha Importación', 'Versión Extractor']);
    }

    let srcSheet = workbook.getWorksheet('Fuentes');
    if (!srcSheet) {
      srcSheet = workbook.addWorksheet('Fuentes');
      srcSheet.addRow(['Fuente ID', 'Importacion ID', 'URL', 'Tipo Fuente']);
    }

    let auditSheet = workbook.getWorksheet('Trazabilidad Campos');
    if (!auditSheet) {
      auditSheet = workbook.addWorksheet('Trazabilidad Campos');
      auditSheet.addRow([
        'Trazabilidad ID', 'Importacion ID', 'Entidad Tipo', 'Entidad ID', 'Campo',
        'Valor Anterior', 'Valor Propuesto', 'Valor Aprobado', 'Decisión', 'Motivo',
        'Confianza Campo', 'Método Extracción'
      ]);
    }

    const edicionSheet = workbook.getWorksheet('Edición');
    const artistasSheet = workbook.getWorksheet('Artistas');
    const actuacionesSheet = workbook.getWorksheet('Actuaciones');
    let escenariosSheet = workbook.getWorksheet('Escenarios');
    if (!escenariosSheet) {
      escenariosSheet = workbook.addWorksheet('Escenarios');
      escenariosSheet.addRow(['Edicion ID', 'ID', 'Nombre', 'Orden', 'Color']);
    }

    // 1. Ensure new columns exist
    // Edición: source URL and managed resource references
    const edRow1 = edicionSheet.getRow(1);
    let edHeaders = edRow1.values;
    let edIdIdx = edHeaders.indexOf('Edicion ID');
    let startDateIdx = edHeaders.indexOf('Fecha inicio');
    for (const columnName of ['URL Oficial', 'Logo', 'Cartel', 'Mapa', 'Horarios']) {
      if (edHeaders.indexOf(columnName) === -1) {
        edRow1.getCell(edHeaders.length).value = columnName;
        edHeaders = edRow1.values;
      }
    }
    edRow1.commit();

    // Artistas new columns: Nombre normalizado, Spotify Artist ID, MusicBrainz ID, Wikidata ID, Web Oficial Artista, TikTok, X URL, Imagen Aprobada
    const artRow1 = artistasSheet.getRow(1);
    let artHeaders = artRow1.values;
    const newArtCols = [
      'Nombre normalizado', 'Spotify Artist ID', 'MusicBrainz ID', 'Wikidata ID', 
      'Web Oficial Artista', 'TikTok', 'X URL', 'Imagen Aprobada', 'Fuentes artista'
    ];
    newArtCols.forEach(col => {
      if (artHeaders.indexOf(col) === -1) {
        artRow1.getCell(artHeaders.length).value = col;
        artHeaders = artRow1.values;
      }
    });
    artRow1.commit();

    // Actuaciones: Actuacion ID, Fecha Cambio, Sustituida Por
    const actRow1 = actuacionesSheet.getRow(1);
    let actHeaders = actRow1.values;
    const newActCols = ['Actuacion ID', 'Fecha Cambio', 'Sustituida Por'];
    newActCols.forEach(col => {
      if (actHeaders.indexOf(col) === -1) {
        actRow1.getCell(actHeaders.length).value = col;
        actHeaders = actRow1.values;
      }
    });
    actRow1.commit();

    // Refresh header maps after additions
    const freshEdHeaders = edicionSheet.getRow(1).values;
    const freshArtHeaders = artistasSheet.getRow(1).values;
    const freshActHeaders = actuacionesSheet.getRow(1).values;

    const edition = approvedData.edition || {};
    const editionName = String(edition.name || '').trim();
    const editionYear = Number(edition.year);
    if (!editionName || !Number.isInteger(editionYear)) {
      throw new Error('La importación no contiene nombre y año válidos para la nueva edición.');
    }
    const festivalId = edition.festivalId || slugify(editionName.replace(new RegExp(`\\s*${editionYear}\\s*$`), ''));
    const edicionId = edition.id || `${festivalId}-${editionYear}`;
    if (!festivalId || !edicionId || edicionId === 'resurrection-fest-2026' && festivalId !== 'resurrection-fest') {
      throw new Error('No se pudo generar una identidad segura para el festival.');
    }

    let startDateSerial = null;
    let editionRow = null;

    edicionSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (row.getCell(edIdIdx).value === edicionId) {
        editionRow = row;
        const serialVal = row.getCell(startDateIdx).value;
        if (typeof serialVal === 'number') {
          startDateSerial = serialVal;
        }
      }
    });

    if (!editionRow) {
      const startSerial = isoDateToExcelSerial(edition.startDate);
      const endSerial = isoDateToExcelSerial(edition.endDate);
      if (endSerial < startSerial) throw new Error('La fecha final de la edición es anterior a la inicial.');
      startDateSerial = startSerial;
      editionRow = edicionSheet.addRow([]);
      const editionValues = {
        'Festival ID': festivalId,
        'Edicion ID': edicionId,
        'Nombre Festival': editionName,
        'Nombre visible': editionName,
        'Año': editionYear,
        'Fecha inicio': startSerial,
        'Fecha fin': endSerial,
        'Localidad': edition.location || '',
        'Zona horaria': edition.timezone || 'Europe/Madrid',
        'Inicio cuenta atrás': startSerial,
        'Hora inicio parrilla': 14 / 24,
        'Hora fin parrilla': 4 / 24,
        'URL Oficial': edition.url,
        'Logo': edition.logo || '',
        'Cartel': edition.cartel || '',
        'Mapa': edition.mapa || '',
        'Horarios': Array.isArray(edition.horarios) ? edition.horarios.join(' | ') : (edition.horarios || '')
      };
      for (const [header, value] of Object.entries(editionValues)) {
        const column = freshEdHeaders.indexOf(header);
        if (column > 0) writeCellSafely(editionRow.getCell(column), value);
      }
      editionRow.commit();
    } else {
      if (edition.url) writeCellSafely(editionRow.getCell(freshEdHeaders.indexOf('URL Oficial')), edition.url);
      const resourceValues = {
        'Logo': edition.logo,
        'Cartel': edition.cartel,
        'Mapa': edition.mapa,
        'Horarios': Array.isArray(edition.horarios) ? edition.horarios.join(' | ') : edition.horarios
      };
      for (const [header, value] of Object.entries(resourceValues)) {
        const column = freshEdHeaders.indexOf(header);
        if (column > 0 && value) writeCellSafely(editionRow.getCell(column), value);
      }
    }

    if (!Number.isFinite(startDateSerial)) {
      throw new Error(`La edición ${edicionId} no tiene una fecha inicial válida.`);
    }

    const stageHeaders = escenariosSheet.getRow(1).values;
    const stageEditionCol = stageHeaders.indexOf('Edicion ID');
    const stageIdCol = stageHeaders.indexOf('ID');
    const stageNameCol = stageHeaders.indexOf('Nombre');
    const stageOrderCol = stageHeaders.indexOf('Orden');
    const stageColorCol = stageHeaders.indexOf('Color');
    const existingEditionStages = [];
    escenariosSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || cellText(row.getCell(stageEditionCol).value) !== edicionId) return;
      const name = cellText(row.getCell(stageNameCol).value);
      if (
        name &&
        !existingEditionStages.some(existing => existing.toLowerCase() === name.toLowerCase())
      ) {
        existingEditionStages.push(name);
      }
    });
    const proposedStageNames = [...new Set(
      approvedData.lineup.map(item => cellText(item.stage)).filter(Boolean)
    )];
    const stageAliases = new Map();
    if (existingEditionStages.length === 1 && proposedStageNames.length === 1) {
      stageAliases.set(proposedStageNames[0].toLowerCase(), existingEditionStages[0]);
    }
    const resolveStageName = value => {
      const proposed = cellText(value);
      return stageAliases.get(proposed.toLowerCase()) || proposed;
    };

    const auditLogs = [];
    const addAuditLog = (entidadTipo, entidadId, campo, valAnt, valProp, valAprob, decision = 'Aprobado', motivo = '') => {
      const traceId = 'TRC-' + Math.floor(Math.random() * 90000 + 10000);
      auditSheet.addRow([
        traceId, importId, entidadTipo, entidadId, campo,
        valAnt || '', valProp || '', valAprob || '', decision, motivo,
        100, 'Manual'
      ]);
    };

    // 2. Write Artistas
    approvedData.lineup.forEach(item => {
      const artistName = item.artistName.trim();
      const artistId = slugify(artistName);
      const normName = toTitleCase(artistName);

      // Find artist row
      let artistRow = null;
      artistasSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (String(row.getCell(freshArtHeaders.indexOf('Artista ID')).value).toLowerCase().trim() === artistId) {
          artistRow = row;
        }
      });

      const spIdCol = freshArtHeaders.indexOf('Spotify Artist ID');
      const normNameCol = freshArtHeaders.indexOf('Nombre normalizado');
      const imgCol = freshArtHeaders.indexOf('Imagen');
      const spotifyUrlCol = freshArtHeaders.indexOf('Spotify');
      const bioCol = freshArtHeaders.indexOf('Bio');
      const dateRevCol = freshArtHeaders.indexOf('Fecha Revisión');
      const revCol = freshArtHeaders.indexOf('Revisado');
      const imgApprovedCol = freshArtHeaders.indexOf('Imagen Aprobada');
      const hasSocial = Boolean(item.instagramUrl || item.facebookUrl || item.xUrl || item.tiktokUrl);
      const bioWordCount = String(item.bio || '').trim().split(/\s+/).filter(Boolean).length;
      const metadataComplete = Boolean(item.country && item.genre && bioWordCount >= 60 && bioWordCount <= 100 && item.youtubeUrl && item.imageUrl && hasSocial);
      const artistValues = {
        'País': item.country || '',
        'Género principal': item.genre || item.spotifyGenres?.[0] || '',
        'Descripción': item.description || '',
        'YouTube': item.youtubeUrl || '',
        'Imagen': item.imageUrl || '',
        'Spotify': item.spotifyUrl || '',
        'Instagram': item.instagramUrl || '',
        'Facebook': item.facebookUrl || '',
        'Bio': item.bio || '',
        'Web Oficial Artista': item.officialWebsite || '',
        'TikTok': item.tiktokUrl || '',
        'X URL': item.xUrl || '',
        'Fuentes artista': Array.isArray(item.sourceUrls) ? item.sourceUrls.join(' | ') : ''
      };

      if (artistRow) {
        // Log changes if values differ
        const oldSpId = artistRow.getCell(spIdCol).value;
        const newSpId = item.spotifyId || '';
        if (oldSpId !== newSpId) {
          addAuditLog('Artistas', artistId, 'Spotify Artist ID', oldSpId, newSpId, newSpId);
        }

        // Update existing row
        // Never replace a known identifier with an empty lookup result.
        if (newSpId) writeCellSafely(artistRow.getCell(spIdCol), newSpId);
        writeCellSafely(artistRow.getCell(normNameCol), normName);
        for (const [header, value] of Object.entries(artistValues)) {
          const column = freshArtHeaders.indexOf(header);
          if (column > 0 && value) writeCellSafely(artistRow.getCell(column), value);
        }
        writeCellSafely(artistRow.getCell(dateRevCol), new Date().toISOString().substring(0, 10));
        // Importing incomplete metadata must not downgrade manual editorial decisions.
        if (metadataComplete) writeCellSafely(artistRow.getCell(revCol), true);
      } else {
        // High Alta - new row
        const newRow = artistasSheet.addRow([]);
        
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Artista ID')), artistId);
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Nombre')), artistName.toUpperCase());
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Nombre normalizado')), normName);
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Spotify Artist ID')), item.spotifyId || '');
        for (const [header, value] of Object.entries(artistValues)) {
          const column = freshArtHeaders.indexOf(header);
          if (column > 0) writeCellSafely(newRow.getCell(column), value);
        }
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Revisado')), metadataComplete);
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Fecha Revisión')), new Date().toISOString().substring(0, 10));
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Imagen Aprobada')), false);

        newRow.commit();
        addAuditLog('Artistas', artistId, 'Artista ID', '', artistId, artistId, 'Aprobado', 'Alta de nuevo artista');
      }
    });

    // Helper for fractional time conversions
    const timeToFraction = (timeStr) => {
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      return (hours * 60 + minutes) / 1440;
    };

    // 3. Write Actuaciones
    approvedData.lineup.forEach(item => {
      const artistId = slugify(item.artistName);
      const daySerial = isoDateToExcelSerial(item.day);
      const startFraction = timeToFraction(item.startTime);
      const endFraction = timeToFraction(item.endTime);
      const resolvedStage = resolveStageName(item.stage);

      const edIdIdx = freshActHeaders.indexOf('Edicion ID');
      const artIdIdx = freshActHeaders.indexOf('Artista ID');
      const dateIdx = freshActHeaders.indexOf('Fecha');
      const stageIdx = freshActHeaders.indexOf('Escenario');
      const startIdx = freshActHeaders.indexOf('Inicio');
      const endIdx = freshActHeaders.indexOf('Fin');
      const stateIdx = freshActHeaders.indexOf('Estado');
      const actIdIdx = freshActHeaders.indexOf('Actuacion ID');

      // Prefer the canonical stage, but also recognize a renamed stage for the
      // same artist/day/time so re-importing one-stage festivals is idempotent.
      let actRow = null;
      const sameArtistDayRows = [];
      actuacionesSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rEd = cellText(row.getCell(edIdIdx).value);
        const rArt = cellText(row.getCell(artIdIdx).value);
        const rDate = row.getCell(dateIdx).value;
        const rStage = cellText(row.getCell(stageIdx).value);

        if (rEd !== edicionId || rArt !== artistId || Number(rDate) !== daySerial) return;
        sameArtistDayRows.push(row);
        if (rStage.toLowerCase() === resolvedStage.toLowerCase()) actRow = row;
      });
      if (!actRow && stageAliases.size > 0) {
        actRow = sameArtistDayRows.find(row =>
          Math.abs(Number(row.getCell(startIdx).value) - startFraction) <= 0.0001 &&
          Math.abs(Number(row.getCell(endIdx).value) - endFraction) <= 0.0001
        ) || (sameArtistDayRows.length === 1 ? sameArtistDayRows[0] : null);
      }

      if (actRow) {
        // Log changes
        const oldStart = actRow.getCell(startIdx).value;
        if (Math.abs(Number(oldStart) - startFraction) > 0.0001) {
          addAuditLog('Actuaciones', artistId, 'Inicio', oldStart, startFraction, startFraction);
        }

        // Update
        const cStart = actRow.getCell(startIdx);
        cStart.value = startFraction;
        cStart.numFmt = 'hh:mm';

        const cEnd = actRow.getCell(endIdx);
        cEnd.value = endFraction;
        cEnd.numFmt = 'hh:mm';

        const oldStage = cellText(actRow.getCell(stageIdx).value);
        if (oldStage !== resolvedStage) {
          addAuditLog('Actuaciones', artistId, 'Escenario', oldStage, resolvedStage, resolvedStage);
          writeCellSafely(actRow.getCell(stageIdx), resolvedStage);
        }
        writeCellSafely(actRow.getCell(stateIdx), 'Programada');
      } else {
        // Alta - new row
        const newRow = actuacionesSheet.addRow([]);
        const actId = 'ACT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        writeCellSafely(newRow.getCell(edIdIdx), edicionId);
        writeCellSafely(newRow.getCell(artIdIdx), artistId);
        writeCellSafely(newRow.getCell(dateIdx), daySerial);
        writeCellSafely(newRow.getCell(stageIdx), resolvedStage);
        
        const cellStart = newRow.getCell(startIdx);
        cellStart.value = startFraction;
        cellStart.numFmt = 'hh:mm';

        const cellEnd = newRow.getCell(endIdx);
        cellEnd.value = endFraction;
        cellEnd.numFmt = 'hh:mm';

        writeCellSafely(newRow.getCell(stateIdx), 'Programada');
        writeCellSafely(newRow.getCell(actIdIdx), actId);

        newRow.commit();

        addAuditLog('Actuaciones', artistId, 'Actuacion ID', '', actId, actId, 'Aprobado', 'Nueva actuación agregada');
      }
    });

    // 3b. Register every stage used by the new edition.
    const existingStages = new Set(existingEditionStages.map(name => name.toLowerCase()));
    const colors = ['#d3133c', '#2b8be3', '#9c1fb8', '#059669', '#eab308', '#ea580c'];
    [...new Set(proposedStageNames.map(resolveStageName))].forEach((stageName, index) => {
      if (existingStages.has(stageName.toLowerCase())) return;
      const row = escenariosSheet.addRow([]);
      writeCellSafely(row.getCell(stageEditionCol), edicionId);
      writeCellSafely(row.getCell(stageIdCol), slugify(stageName));
      writeCellSafely(row.getCell(stageNameCol), stageName);
      writeCellSafely(row.getCell(stageOrderCol), index + 1);
      writeCellSafely(row.getCell(stageColorCol), colors[index % colors.length]);
      row.commit();
    });

    // 4. Write Importaciones row
    impSheet.addRow([
      importId,
      festivalId,
      edicionId,
      user,
      new Date().toISOString().substring(0, 19).replace('T', ' '),
      'v1.0.0'
    ]);

    // 5. Write Fuentes row
    const srcId = 'SRC-' + Date.now();
    srcSheet.addRow([
      srcId,
      importId,
      approvedData.edition.url,
      'Web Oficial'
    ]);

    // Phase 2: Save to Temp file and Validate
    const tempPath = path.join(__dirname, '..', 'AgendaFest.tmp.xlsx');
    await workbook.xlsx.writeFile(tempPath);

    // Verify temp workbook integrity
    const verifyWorkbook = new ExcelJS.Workbook();
    await verifyWorkbook.xlsx.readFile(tempPath);
    const verifySheet = verifyWorkbook.getWorksheet('Edición');
    if (!verifySheet) {
      throw new Error('Verificación fallida: No se pudo leer la hoja Edición en el archivo guardado.');
    }

    // Atomic overwrite
    if (fs.existsSync(excelPath)) {
      await unlinkWithRetry(excelPath);
    }
    fs.renameSync(tempPath, excelPath);

    // Run cleanups
    await cleanBackups();

    return true;

  } catch (err) {
    // Rollback: restore from backup if save failed
    if (fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, excelPath);
      } catch (copyErr) {
        console.error('Error crítico al restaurar backup:', copyErr);
      }
    }
    throw err;
  }
}

module.exports = {
  isExcelLocked,
  saveImportToExcel,
  buildImportPreview,
  cleanBackups,
  unlinkWithRetry
};
