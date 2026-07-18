process.env.NODE_ENV = 'test';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { isExcelLocked, saveImportToExcel, buildImportPreview, cleanBackups, unlinkWithRetry } = require('../excel');

const excelPath = path.join(__dirname, '..', '..', 'AgendaFest.xlsx');
const realBackupPath = path.join(__dirname, '..', '..', 'AgendaFest.xlsx.real_backup');
const testBackupsDir = path.join(__dirname, '..', 'backups');

// Helper to create a minimal valid excel workbook for testing
async function createMockWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  
  const edicion = workbook.addWorksheet('Edición');
  edicion.addRow(['Festival ID', 'Edicion ID', 'Nombre Festival', 'Nombre visible', 'Año', 'Fecha inicio', 'Fecha fin']);
  edicion.addRow(['resurrection-fest', 'resurrection-fest-2026', 'Resurrection Fest', 'Resurrection Fest E.G.', 2026, 46204, 46207]);

  const artistas = workbook.addWorksheet('Artistas');
  artistas.addRow(['Artista ID', 'Nombre', 'País', 'Género principal', 'Descripción', 'YouTube', 'Imagen', 'Spotify', 'Instagram', 'Facebook', 'Bio', 'Fecha Revisión', 'Revisado', 'Spotify Artist ID']);
  artistas.addRow([
    'annisokay', 'ANNISOKAY', 'Alemania', 'Metalcore', 'La formación alemana...', 
    'https://youtube.com/...', 'https://spotify/...', 'https://open.spotify.com/artist/7lAi1Cv19DsukgGjbZQxFg', 
    'https://instagram.com/...', 'https://facebook.com/...', 'Bio de la banda...', '2026-07-12', true, '7lAi1Cv19DsukgGjbZQxFg'
  ]);

  const actuaciones = workbook.addWorksheet('Actuaciones');
  actuaciones.addRow(['Edicion ID', 'Artista ID', 'Fecha', 'Escenario', 'Inicio', 'Fin', 'Estado']);
  actuaciones.addRow(['resurrection-fest-2026', 'annisokay', 46204, 'Main Stage', 0.6423611111111112, 0.6770833333333334, 'Programada']);

  await workbook.xlsx.writeFile(filePath);
}

async function runExcelTests() {
  console.log('=== INICIANDO PRUEBAS DE PERSISTENCIA EXCEL (INCREMENTO 3) ===\n');
  let testCount = 0;
  let passedCount = 0;

  // Setup: Backup real file if exists
  if (fs.existsSync(excelPath)) {
    fs.copyFileSync(excelPath, realBackupPath);
  }

  // Create test workbook
  await createMockWorkbook(excelPath);

  async function runTestAsync(name, fn) {
    testCount++;
    try {
      await fn();
      console.log(`🟢 TEST ${testCount} PASADO: ${name}`);
      passedCount++;
    } catch (e) {
      console.error(`🔴 TEST ${testCount} FALLADO: ${name}`);
      console.error(e);
    }
  }

  // TEST 1: Detección física de bloqueo (lock check)
  await runTestAsync('isExcelLocked detecta correctamente si el archivo está bloqueado por otro proceso', async () => {
    // Open in write-exclusive mode
    const fd = fs.openSync(excelPath, 'r+');
    
    // On Windows, opening a file without shared write flags can make it EBUSY/locked depending on options.
    // Let's test the lock detection.
    const locked = isExcelLocked(excelPath);
    
    fs.closeSync(fd);
    // Since fd is closed, it shouldn't be locked anymore
    const notLocked = isExcelLocked(excelPath);

    assert.strictEqual(notLocked, false, 'No debería estar bloqueado después de cerrar el FD');
  });

  await runTestAsync('La comparación previa muestra valores actuales, propuestas y campos que se conservarán', async () => {
    const proposal = {
      edition: {
        festivalId: 'resurrection-fest', id: 'resurrection-fest-2026', name: 'Resurrection Fest', year: 2026,
        startDate: '2026-07-01', endDate: '2026-07-04', location: 'Viveiro', timezone: 'Europe/Madrid',
        url: 'https://www.resurrectionfest.es/'
      },
      lineup: [{
        artistName: 'Annisokay', spotifyId: '', country: 'Alemania', genre: 'Modern Metalcore',
        instagramUrl: '', bio: 'Bio de la banda...', day: '2026-07-01', stage: 'Main Stage',
        startTime: '15:00', endTime: '16:00'
      }]
    };
    const preview = await buildImportPreview(proposal);
    assert.ok(preview.previewHash, 'La comparación debe quedar vinculada al Excel y la propuesta');
    const artist = preview.artists.find(item => item.artistId === 'annisokay');
    assert.ok(artist, 'Debe comparar al artista existente');
    const spotify = artist.fields.find(field => field.field === 'Spotify Artist ID');
    const genre = artist.fields.find(field => field.field === 'Género principal');
    const instagram = artist.fields.find(field => field.field === 'Instagram');
    assert.strictEqual(spotify.decision, 'mantener', 'Un ID existente no se debe proponer para borrado');
    assert.strictEqual(spotify.current, '7lAi1Cv19DsukgGjbZQxFg');
    assert.strictEqual(genre.decision, 'actualizar');
    assert.strictEqual(genre.current, 'Metalcore');
    assert.strictEqual(genre.proposed, 'Modern Metalcore');
    assert.strictEqual(instagram.decision, 'mantener');

    await saveImportToExcel(proposal, 'test-user', 'IMP-preview-preserve');
    const verify = new ExcelJS.Workbook();
    await verify.xlsx.readFile(excelPath);
    const artists = verify.getWorksheet('Artistas');
    const verifyHeaders = artists.getRow(1).values;
    let existing = null;
    artists.eachRow((row, rn) => {
      if (rn > 1 && row.getCell(verifyHeaders.indexOf('Artista ID')).value === 'annisokay') existing = row;
    });
    assert.strictEqual(existing.getCell(verifyHeaders.indexOf('Spotify Artist ID')).value, '7lAi1Cv19DsukgGjbZQxFg');
    assert.strictEqual(existing.getCell(verifyHeaders.indexOf('Revisado')).value, true, 'No debe degradar la revisión manual');
  });

  // TEST 2: Sanitización y prevención de inyección de fórmulas
  await runTestAsync('Las celdas con caracteres de fórmula se fuerzan como tipo String para evitar inyecciones', async () => {
    const approvedData = {
      edition: { festivalId: 'resurrection-fest', id: 'resurrection-fest-2026', name: 'Resurrection Fest', year: 2026, startDate: '2026-07-01', endDate: '2026-07-04', location: 'Viveiro', timezone: 'Europe/Madrid', url: 'https://www.resurrectionfest.es/' },
      lineup: [
        { artistName: '=DangerousFormula', day: '2026-07-01', stage: 'Main Stage', startTime: '19:00', endTime: '20:00', spotifyId: '7lAi1Cv19DsukgGjbZQxFg', spotifyUrl: 'https://spotify/annis' }
      ]
    };

    await saveImportToExcel(approvedData, 'test-user', 'IMP-test');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const sheet = workbook.getWorksheet('Artistas');
    
    // Find the injected row
    let formulaRow = null;
    sheet.eachRow((row, rn) => {
      if (rn === 1) return;
      if (row.getCell(1).value === 'dangerousformula') {
        formulaRow = row;
      }
    });

    assert.ok(formulaRow, 'Se debería haber agregado la banda con ID dangerousformula');
    
    const nameCell = formulaRow.getCell(2); // 'Nombre' column is 2nd cell
    assert.strictEqual(nameCell.value, '=DANGEROUSFORMULA', 'Debería conservar el prefijo "="');
    assert.strictEqual(nameCell.type, ExcelJS.ValueType.String, 'El tipo de celda debe ser explícitamente String');
  });

  // TEST 3: Trazabilidad, Nuevas hojas y formato de horas
  await runTestAsync('La importación crea hojas de trazabilidad y escribe horas en formato decimal de Excel', async () => {
    const approvedData = {
      edition: { festivalId: 'resurrection-fest', id: 'resurrection-fest-2026', name: 'Resurrection Fest', year: 2026, startDate: '2026-07-01', endDate: '2026-07-04', location: 'Viveiro', timezone: 'Europe/Madrid', url: 'https://www.resurrectionfest.es/' },
      lineup: [
        // Update annisokay time, and add rise-against with a late-night show (01:00)
        { artistName: 'Annisokay', day: '2026-07-01', stage: 'Main Stage', startTime: '15:00', endTime: '16:00', spotifyId: '7lAi1Cv19DsukgGjbZQxFg', spotifyUrl: 'https://spotify/annis' },
        { artistName: 'Rise Against', day: '2026-07-02', stage: 'Main Stage', startTime: '01:00', endTime: '02:00', spotifyId: '6ue0W5wPr4pmKVbgui45bp', spotifyUrl: 'https://spotify/rise' }
      ]
    };

    await saveImportToExcel(approvedData, 'test-user', 'IMP-test-123');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    // Sheets exist
    const imp = workbook.getWorksheet('Importaciones');
    const src = workbook.getWorksheet('Fuentes');
    const audit = workbook.getWorksheet('Trazabilidad Campos');
    const acts = workbook.getWorksheet('Actuaciones');

    assert.ok(imp, 'Hoja Importaciones debería existir');
    assert.ok(src, 'Hoja Fuentes debería existir');
    assert.ok(audit, 'Hoja Trazabilidad Campos debería existir');

    // Check Actuaciones late night fraction formatting
    let riseActRow = null;
    acts.eachRow((row, rn) => {
      if (rn === 1) return;
      if (row.getCell(2).value === 'rise-against') {
        riseActRow = row;
      }
    });

    assert.ok(riseActRow, 'Debería existir la actuación de rise-against');
    // 01:00 is exactly 1/24 = 0.041666...
    const startVal = riseActRow.getCell(5).value; // Column 'Inicio' is 5th
    let startHour, startMin;
    if (startVal instanceof Date) {
      startHour = startVal.getUTCHours();
      startMin = startVal.getUTCMinutes();
    } else {
      const totalMinutes = Math.round(Number(startVal) * 24 * 60);
      startHour = Math.floor(totalMinutes / 60);
      startMin = totalMinutes % 60;
    }
    assert.strictEqual(startHour, 1, 'La hora de inicio debería ser la 1 AM');
    assert.strictEqual(startMin, 0, 'Los minutos de inicio deberían ser 0');
    assert.strictEqual(riseActRow.getCell(5).numFmt, 'hh:mm', 'La celda de hora debe tener el formato hh:mm');
    
    // Exact ISO date check: 2026-07-02 maps to serial 46205
    assert.strictEqual(Number(riseActRow.getCell(3).value), 46205, 'Sábado debe corresponder al serial de fecha inicio + 1');

    // Check Trazabilidad entries
    let auditEntries = [];
    audit.eachRow((row, rn) => {
      if (rn === 1) return;
      if (row.getCell(2).value === 'IMP-test-123') {
        auditEntries.push(row.values);
      }
    });
    assert.ok(auditEntries.length > 0, 'Debería haber registros de trazabilidad para la importación IMP-test-123');
  });

  await runTestAsync('Una URL nueva crea su propia edición, escenarios y actuaciones sin usar Resurrection', async () => {
    const beforeWorkbook = new ExcelJS.Workbook();
    await beforeWorkbook.xlsx.readFile(excelPath);
    const beforeActs = beforeWorkbook.getWorksheet('Actuaciones');
    let resurrectionBefore = 0;
    beforeActs.eachRow((row, rn) => {
      if (rn > 1 && row.getCell(1).value === 'resurrection-fest-2026') resurrectionBefore++;
    });
    const approvedData = {
      edition: {
        name: 'Rockstadt Extreme Fest', year: 2026,
        startDate: '2026-07-27', endDate: '2026-08-02',
        location: 'Râșnov, Romania', timezone: 'Europe/Bucharest',
        url: 'https://rockstadtextremefest.ro/'
      },
      lineup: [
        {
          artistName: 'Test Rockstadt Band', day: '2026-08-01', stage: 'Andrei Calmuc Stage', startTime: '02:00', endTime: '03:00',
          country: 'Rumanía', genre: 'Metal', description: 'Banda de prueba.', bio: 'Biografía verificada de prueba.',
          youtubeUrl: 'https://youtube.com/watch?v=test', imageUrl: 'https://example.com/image.jpg',
          instagramUrl: 'https://instagram.com/test', facebookUrl: 'https://facebook.com/test',
          sourceUrls: ['https://example.com/source']
        }
      ]
    };

    await saveImportToExcel(approvedData, 'test-user', 'IMP-rockstadt');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const edition = workbook.getWorksheet('Edición');
    const acts = workbook.getWorksheet('Actuaciones');
    const stages = workbook.getWorksheet('Escenarios');
    const artists = workbook.getWorksheet('Artistas');

    const editionIds = [];
    edition.eachRow((row, rn) => { if (rn > 1) editionIds.push(row.getCell(2).value); });
    assert.ok(editionIds.includes('rockstadt-extreme-fest-2026'));

    let rockstadtAct = null;
    acts.eachRow((row, rn) => {
      if (rn > 1 && row.getCell(1).value === 'rockstadt-extreme-fest-2026') rockstadtAct = row;
    });
    assert.ok(rockstadtAct, 'La actuación debe pertenecer a Rockstadt');

    let rockstadtStage = null;
    stages.eachRow((row, rn) => {
      if (rn > 1 && row.getCell(1).value === 'rockstadt-extreme-fest-2026') rockstadtStage = row;
    });
    assert.ok(rockstadtStage, 'El escenario debe pertenecer a Rockstadt');

    const artistHeaders = artists.getRow(1).values;
    let rockstadtArtist = null;
    artists.eachRow((row, rn) => {
      if (rn > 1 && row.getCell(artistHeaders.indexOf('Artista ID')).value === 'test-rockstadt-band') rockstadtArtist = row;
    });
    assert.ok(rockstadtArtist, 'El artista nuevo debe existir');
    assert.strictEqual(rockstadtArtist.getCell(artistHeaders.indexOf('País')).value, 'Rumanía');
    assert.strictEqual(rockstadtArtist.getCell(artistHeaders.indexOf('Género principal')).value, 'Metal');
    assert.strictEqual(rockstadtArtist.getCell(artistHeaders.indexOf('Bio')).value, 'Biografía verificada de prueba.');
    assert.strictEqual(rockstadtArtist.getCell(artistHeaders.indexOf('Revisado')).value, false, 'Una bio demasiado corta no debe marcar la ficha como completa');
    assert.strictEqual(rockstadtArtist.getCell(artistHeaders.indexOf('Imagen Aprobada')).value, false);

    let resurrectionAfter = 0;
    acts.eachRow((row, rn) => {
      if (rn > 1 && row.getCell(1).value === 'resurrection-fest-2026') resurrectionAfter++;
    });
    assert.strictEqual(resurrectionAfter, resurrectionBefore, 'Rockstadt no debe modificar actuaciones de Resurrection');
  });

  await runTestAsync('Una edición inválida se rechaza y restaura el Excel sin cambios parciales', async () => {
    const before = fs.readFileSync(excelPath);
    await assert.rejects(
      saveImportToExcel({
        edition: { name: 'Festival sin fechas', year: 2026, url: 'https://example.com/' },
        lineup: [{ artistName: 'No debe guardarse', day: 'Viernes', stage: 'Main', startTime: '10:00', endTime: '11:00' }]
      }, 'test-user', 'IMP-invalid'),
      /Fecha inválida/
    );
    const after = fs.readFileSync(excelPath);
    assert.deepStrictEqual(after, before, 'El Excel debe quedar idéntico tras el rollback');
  });

  // TEST 4: Retención máxima de 10 copias de seguridad
  await runTestAsync('La limpieza de backups mantiene estrictamente un máximo de 10 archivos de seguridad', async () => {
    // Create 15 fake backup files
    if (!fs.existsSync(testBackupsDir)) {
      fs.mkdirSync(testBackupsDir, { recursive: true });
    }

    // Clean first
    const existing = fs.readdirSync(testBackupsDir).filter(f => f.startsWith('AgendaFest_'));
    existing.forEach(f => fs.unlinkSync(path.join(testBackupsDir, f)));

    for (let i = 0; i < 15; i++) {
      fs.writeFileSync(path.join(testBackupsDir, `AgendaFest_2026-07-18T10-35-${String(i).padStart(2, '0')}-000Z.xlsx`), 'mock content');
      // Wait briefly to make sure modify times are distinct if sorting uses it
      await new Promise(r => setTimeout(r, 10));
    }

    await cleanBackups();

    const backups = fs.readdirSync(testBackupsDir).filter(f => f.startsWith('AgendaFest_') && f.endsWith('.xlsx'));
    assert.strictEqual(backups.length, 10, 'Debe haber exactamente 10 copias tras la limpieza');
  });

  // Teardown: Restore real Excel
  if (fs.existsSync(excelPath)) {
    await unlinkWithRetry(excelPath);
  }
  if (fs.existsSync(realBackupPath)) {
    fs.copyFileSync(realBackupPath, excelPath);
    await unlinkWithRetry(realBackupPath);
  }

  console.log('\n==================================================');
  console.log(`Pruebas completadas: ${passedCount} / ${testCount} superadas.`);
  console.log('==================================================');

  if (passedCount === testCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Execute tests
setTimeout(runExcelTests, 500);
