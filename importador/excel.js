const fs = require('fs');
const path = require('path');
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

    // 1. Ensure new columns exist
    // Edición: URL Oficial
    const edRow1 = edicionSheet.getRow(1);
    let edHeaders = edRow1.values;
    let edIdIdx = edHeaders.indexOf('Edicion ID');
    let startDateIdx = edHeaders.indexOf('Fecha inicio');
    let urlOficialIdx = edHeaders.indexOf('URL Oficial');
    if (urlOficialIdx === -1) {
      urlOficialIdx = edHeaders.length;
      edRow1.getCell(urlOficialIdx).value = 'URL Oficial';
      edRow1.commit();
    }

    // Artistas new columns: Nombre normalizado, Spotify Artist ID, MusicBrainz ID, Wikidata ID, Web Oficial Artista, TikTok, X URL, Imagen Aprobada
    const artRow1 = artistasSheet.getRow(1);
    let artHeaders = artRow1.values;
    const newArtCols = [
      'Nombre normalizado', 'Spotify Artist ID', 'MusicBrainz ID', 'Wikidata ID', 
      'Web Oficial Artista', 'TikTok', 'X URL', 'Imagen Aprobada'
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

    // Get festival startDate to map dates logical days
    let startDateSerial = 46204; // fallback 2026-07-17
    const edicionId = approvedData.edition.id || 'resurrection-fest-2026';
    const festivalId = approvedData.edition.festivalId || 'resurrection-fest';

    edicionSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (row.getCell(edIdIdx).value === edicionId) {
        // Update URL Oficial
        writeCellSafely(row.getCell(freshEdHeaders.indexOf('URL Oficial')), approvedData.edition.url);
        
        const serialVal = row.getCell(startDateIdx).value;
        if (typeof serialVal === 'number') {
          startDateSerial = serialVal;
        }
      }
    });

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
      const artistId = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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

      if (artistRow) {
        // Log changes if values differ
        const oldSpId = artistRow.getCell(spIdCol).value;
        const newSpId = item.spotifyId || '';
        if (oldSpId !== newSpId) {
          addAuditLog('Artistas', artistId, 'Spotify Artist ID', oldSpId, newSpId, newSpId);
        }

        // Update existing row
        writeCellSafely(artistRow.getCell(spIdCol), newSpId);
        writeCellSafely(artistRow.getCell(normNameCol), normName);
        writeCellSafely(artistRow.getCell(dateRevCol), new Date().toISOString().substring(0, 10));
        writeCellSafely(artistRow.getCell(revCol), true);
        writeCellSafely(artistRow.getCell(imgApprovedCol), true);
      } else {
        // High Alta - new row
        const newRow = artistasSheet.addRow([]);
        
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Artista ID')), artistId);
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Nombre')), artistName.toUpperCase());
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Nombre normalizado')), normName);
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Spotify Artist ID')), item.spotifyId || '');
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Spotify')), item.spotifyUrl || '');
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Bio')), `Banda importada desde ${approvedData.edition.name}.`);
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Revisado')), true);
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Fecha Revisión')), new Date().toISOString().substring(0, 10));
        writeCellSafely(newRow.getCell(freshArtHeaders.indexOf('Imagen Aprobada')), true);

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

    // Helper to resolve day serial
    const getDaySerial = (dayStr) => {
      const d = dayStr.toLowerCase();
      if (d.includes('sábado') || d.includes('sabado')) {
        return startDateSerial + 1;
      }
      if (d.includes('domingo')) {
        return startDateSerial + 2;
      }
      if (d.includes('lunes')) {
        return startDateSerial + 3;
      }
      return startDateSerial; // default first day (e.g. Viernes o Jueves)
    };

    // 3. Write Actuaciones
    approvedData.lineup.forEach(item => {
      const artistId = item.artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const daySerial = getDaySerial(item.day);
      const startFraction = timeToFraction(item.startTime);
      const endFraction = timeToFraction(item.endTime);

      const edIdIdx = freshActHeaders.indexOf('Edicion ID');
      const artIdIdx = freshActHeaders.indexOf('Artista ID');
      const dateIdx = freshActHeaders.indexOf('Fecha');
      const stageIdx = freshActHeaders.indexOf('Escenario');
      const startIdx = freshActHeaders.indexOf('Inicio');
      const endIdx = freshActHeaders.indexOf('Fin');
      const stateIdx = freshActHeaders.indexOf('Estado');
      const actIdIdx = freshActHeaders.indexOf('Actuacion ID');

      // Find performance matching (edicionId, artistId, dateSerial, stage)
      let actRow = null;
      actuacionesSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rEd = row.getCell(edIdIdx).value;
        const rArt = row.getCell(artIdIdx).value;
        const rDate = row.getCell(dateIdx).value;
        const rStage = row.getCell(stageIdx).value;

        if (rEd === edicionId && rArt === artistId && Number(rDate) === daySerial && rStage === item.stage) {
          actRow = row;
        }
      });

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

        writeCellSafely(actRow.getCell(stateIdx), 'Programada');
      } else {
        // Alta - new row
        const newRow = actuacionesSheet.addRow([]);
        const actId = 'ACT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        writeCellSafely(newRow.getCell(edIdIdx), edicionId);
        writeCellSafely(newRow.getCell(artIdIdx), artistId);
        writeCellSafely(newRow.getCell(dateIdx), daySerial);
        writeCellSafely(newRow.getCell(stageIdx), item.stage);
        
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
  cleanBackups,
  unlinkWithRetry
};
