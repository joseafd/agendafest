const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Load the Excel file
const excelPath = path.join(__dirname, 'AgendaFest.xlsx');
if (!fs.existsSync(excelPath)) {
  console.error("AgendaFest.xlsx not found!");
  process.exit(1);
}
const workbook = XLSX.readFile(excelPath);

// Helper functions for Excel conversions
function excelDateToYYYYMMDD(serial) {
  // Convert Excel serial date to YYYY-MM-DD
  const utc_days = Math.floor(serial - 25569);
  const date = new Date(utc_days * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper to convert Excel fractional day (0-1) to HH:MM time string
function excelTimeToHHMM(fractionalDay) {
  const totalMinutes = Math.round(fractionalDay * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm}`;
}

function excelFractionalDayToHour(fractionalDay) {
  if (typeof fractionalDay !== 'number') return 14; // default
  return Math.round(fractionalDay * 24);
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getWeekdayLabel(dateSerial) {
  const dateStr = excelDateToYYYYMMDD(dateSerial);
  const dateObj = new Date(dateStr);
  const weekdayEsList = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  return `${weekdayEsList[dateObj.getUTCDay()]} ${dateObj.getUTCDate()}`;
}

function extractTitleAndDescription(desc) {
  if (!desc) return { title: '', description: '' };
  
  const parts = desc.split(/  +/);
  if (parts.length > 1) {
    const firstPart = parts[0].trim();
    if (firstPart.length < 200 && (firstPart.startsWith('¡') || firstPart.toUpperCase() === firstPart || firstPart.includes('!') || firstPart.includes('🔥') || firstPart.includes('💥'))) {
      const title = firstPart.replace(/\*\*/g, '').trim();
      const rest = parts.slice(1).join('\n\n').trim();
      return { title, description: rest };
    }
  }
  
  return { title: '', description: desc.trim() };
}

function normalizeAssetFilename(value, fallback) {
  const filename = value ? String(value).trim() : fallback;
  return path.basename(filename.replace(/,([a-z0-9]{2,5})$/i, '.$1'));
}

function syncResourceAsset(filename) {
  const source = path.join(__dirname, 'Recursos', filename);
  if (!fs.existsSync(source)) return;

  const publicImagesDir = path.join(__dirname, 'public', 'images');
  const target = path.join(publicImagesDir, filename);
  fs.mkdirSync(publicImagesDir, { recursive: true });
  fs.copyFileSync(source, target);
}

// 2. Read sheets
const edicionSheet = workbook.Sheets['Edición'];
const artistasSheet = workbook.Sheets['Artistas'];
const actuacionesSheet = workbook.Sheets['Actuaciones'];
const firmasSheet = workbook.Sheets['Firmas'];
const escenariosSheet = workbook.Sheets['Escenarios'];
const noticiasSheet = workbook.Sheets['Noticias'];

const edicionData = XLSX.utils.sheet_to_json(edicionSheet);
const artistasData = XLSX.utils.sheet_to_json(artistasSheet);
const actuacionesData = XLSX.utils.sheet_to_json(actuacionesSheet);
const firmasData = XLSX.utils.sheet_to_json(firmasSheet);
const escenariosData = escenariosSheet ? XLSX.utils.sheet_to_json(escenariosSheet) : [];
const noticiasDataRaw = noticiasSheet ? XLSX.utils.sheet_to_json(noticiasSheet) : [];

// 3. Build Global Artists Map
const artistsMap = {};
const artistSocialLinks = {};

function normalizeArtistName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

artistasData.forEach(art => {
  const id = String(art['Artista ID']).toLowerCase().trim();
  const name = String(art['Nombre']).trim();
  const country = art['País'] ? String(art['País']).trim() : '';
  const genre = art['Género principal'] ? String(art['Género principal']).trim() : '';
  const rawDesc = art['Descripción'] ? String(art['Descripción']).trim() : '';
  const rawBio = art['Bio'] ? String(art['Bio']).trim() : '';
  const youtubeUrl = art['YouTube'] ? String(art['YouTube']).trim() : '';
  const imageUrl = art['Imagen'] ? String(art['Imagen']).trim() : '';
  const spotifyUrl = art['Spotify'] ? String(art['Spotify']).trim() : '';
  const instagramUrl = art['Instagram'] ? String(art['Instagram']).trim() : '';
  const facebookUrl = art['Facebook'] ? String(art['Facebook']).trim() : '';
  const officialWebsite = art['Web Oficial Artista'] ? String(art['Web Oficial Artista']).trim() : '';
  const tiktokUrl = art['TikTok'] ? String(art['TikTok']).trim() : '';
  const xUrl = art['X URL'] ? String(art['X URL']).trim() : '';
  
  const { title, description } = extractTitleAndDescription(rawDesc);
  const finalDescription = rawBio || description;

  const socialKey = normalizeArtistName(name);
  if (socialKey && (officialWebsite || tiktokUrl || xUrl)) {
    artistSocialLinks[socialKey] = { officialWebsite, tiktokUrl, xUrl };
  }
  
  artistsMap[id] = {
    name,
    title: rawBio ? '' : title, // Hide the promotional title if a generic bio is used
    description: finalDescription,
    country,
    genre,
    youtubeUrl,
    imageUrl,
    spotifyUrl,
    instagramUrl,
    facebookUrl
  };
});

// 4. Process each Edition
const agendaFestData = {};

edicionData.forEach(edRow => {
  const edicionId = String(edRow['Edicion ID'] || edRow['Festival ID'] || 'default').trim();
  
  const edicionConfig = {
    festivalId: String(edRow['Festival ID'] || 'default').trim(),
    edicionId: edicionId,
    festivalName: String(edRow['Nombre Festival'] || 'Festival').trim(),
    visibleName: String(edRow['Nombre visible'] || edRow['Nombre Festival'] || 'Festival').trim(),
    year: edRow['Año'] ? Number(edRow['Año']) : new Date().getFullYear(),
    startDate: edRow['Fecha inicio'] ? excelDateToYYYYMMDD(edRow['Fecha inicio']) : '2026-07-01',
    endDate: edRow['Fecha fin'] ? excelDateToYYYYMMDD(edRow['Fecha fin']) : '2026-07-04',
    location: edRow['Localidad'] ? String(edRow['Localidad']).trim() : '',
    timezone: edRow['Zona horaria'] ? String(edRow['Zona horaria']).trim() : 'Europe/Madrid',
    logo: normalizeAssetFilename(edRow['Logo'], 'logo.svg'),
    cartel: normalizeAssetFilename(edRow['Cartel'], 'PORTADA.jpg'),
    mapa: normalizeAssetFilename(edRow['Mapa'], 'MAPA.jpg'),
    dayStartHour: excelFractionalDayToHour(edRow['Hora inicio parrilla']),
    dayEndHour: excelFractionalDayToHour(edRow['Hora fin parrilla']),
    aftermovieUrl: edRow['Aftermovie'] ? String(edRow['Aftermovie']).trim() : '',
  };

  syncResourceAsset(edicionConfig.logo);
  syncResourceAsset(edicionConfig.cartel);
  syncResourceAsset(edicionConfig.mapa);

  const startHour = edicionConfig.dayStartHour;

  // Helper to convert time "HH:MM" to minutes relative to startHour
  function timeToMinutesLocal(timeStr) {
    const [hourStr, minStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    const minutes = parseInt(minStr, 10);
    if (hour < startHour) {
      hour += 24;
    }
    return (hour * 60 + minutes) - (startHour * 60);
  }

  // Filter stages for this edition
  const edEscenarios = escenariosData.filter(e => {
    const edId = String(e['Edicion ID'] || '').trim();
    return edId === '' || edId === edicionId;
  });

  // Sort stages by order
  edEscenarios.sort((a, b) => Number(a['Orden'] || 0) - Number(b['Orden'] || 0));
  
  const stages = edEscenarios.map(e => ({
    id: String(e['ID']).trim(),
    name: String(e['Nombre']).trim(),
    order: Number(e['Orden'] || 0),
    color: String(e['Color'] || '#ffffff').trim()
  }));

  const stageNames = stages.map(s => s.name);

  // Filter acts for this edition
  const edActuaciones = actuacionesData.filter(act => {
    const edId = String(act['Edicion ID'] || '').trim();
    return edId === '' || edId === edicionId;
  });

  // Filter signatures for this edition
  const edFirmas = firmasData.filter(f => {
    const edId = String(f['Edicion ID'] || '').trim();
    return edId === '' || edId === edicionId;
  });

  // Filter news for this edition
  const edNoticiasRaw = noticiasDataRaw.filter(n => {
    const edId = String(n['Edicion ID'] || '').trim();
    return edId === '' || edId === edicionId;
  });

  // Map all signing sessions by Artist ID. An artist can have more than one
  // session during the same edition (for example, Jordi Wild at Leyendas 2026).
  const signaturesMap = {};
  edFirmas.forEach(f => {
    const id = String(f['Artista ID']).toLowerCase().trim();
    if (!signaturesMap[id]) signaturesMap[id] = [];
    signaturesMap[id].push(f);
  });

  Object.values(signaturesMap).forEach(sessions => {
    sessions.sort((a, b) => Number(a.Fecha || 0) - Number(b.Fecha || 0) || Number(a.Inicio || 0) - Number(b.Inicio || 0));
  });

  // Sort news descending
  edNoticiasRaw.sort((a, b) => (b.Fecha_noticia || 0) - (a.Fecha_noticia || 0));
  const noticias = edNoticiasRaw.map(n => {
    const dateStr = n['Fecha_noticia'] ? excelDateToYYYYMMDD(n['Fecha_noticia']) : '';
    const fecha = dateStr ? formatDate(dateStr) : '';
    return {
      fecha,
      imagen: n['Imagen'] ? String(n['Imagen']).trim() : '',
      entradilla: n['Entradilla'] ? String(n['Entradilla']).trim() : '',
      noticia: n['Noticia'] ? String(n['Noticia']).trim() : ''
    };
  });

  // Build days list
  const daysConfig = [];
  const startDay = new Date(edicionConfig.startDate);
  const endDay = new Date(edicionConfig.endDate);
  const weekdayEsList = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  let currentDay = new Date(startDay);
  let dayNum = 1;

  while (currentDay <= endDay) {
    const y = currentDay.getUTCFullYear();
    const m = String(currentDay.getUTCMonth() + 1).padStart(2, '0');
    const d = String(currentDay.getUTCDate()).padStart(2, '0');
    const dateId = `${y}-${m}-${d}`;
    
    const weekdayEs = weekdayEsList[currentDay.getUTCDay()];
    const dayLabel = `${weekdayEs} ${currentDay.getUTCDate()}`;
    
    daysConfig.push({
      id: dateId,
      dayNumber: dayNum,
      dayLabel,
      weekdayEs
    });
    
    currentDay.setUTCDate(currentDay.getUTCDate() + 1);
    dayNum++;
  }

  const actsByDay = {};
  daysConfig.forEach(day => {
    actsByDay[day.id] = [];
  });

  edActuaciones.forEach(act => {
    const artistId = String(act['Artista ID']).toLowerCase().trim();
    const dateStr = excelDateToYYYYMMDD(act['Fecha']);
    
    if (!actsByDay[dateStr]) return;
    
    const stage = String(act['Escenario']).trim();
    const start = excelTimeToHHMM(act['Inicio']);
    const end = excelTimeToHHMM(act['Fin']);
    
    const artistInfo = artistsMap[artistId];
    if (!artistInfo) {
      console.warn(`Warning: No bio found for Artista ID "${artistId}"`);
      return;
    }
    
    // Look up signing session
    const signatures = signaturesMap[artistId] || [];
    let signingSession = undefined;
    if (signatures.length > 0) {
      const sessionLabels = signatures.map(signature => {
        const weekdayStr = getWeekdayLabel(signature.Fecha);
        const startSig = excelTimeToHHMM(signature.Inicio);
        const endSig = excelTimeToHHMM(signature.Fin);
        return `${weekdayStr} - ${startSig} A ${endSig}`;
      });
      signingSession = `SESIONES DE FIRMAS - ${sessionLabels.join(' · ')}`;
    }
    
    const bio = {
      name: artistInfo.name,
      title: artistInfo.title,
      description: artistInfo.description,
      country: artistInfo.country || undefined,
      genre: artistInfo.genre || undefined,
      youtubeUrl: artistInfo.youtubeUrl || undefined,
      spotifyUrl: artistInfo.spotifyUrl || undefined,
      instagramUrl: artistInfo.instagramUrl || undefined,
      facebookUrl: artistInfo.facebookUrl || undefined,
      imageUrl: artistInfo.imageUrl || undefined,
      signingSession: signingSession || undefined
    };
    
    actsByDay[dateStr].push({
      band: artistInfo.name,
      stage,
      start,
      end,
      bio
    });
  });

  // Sort acts and calculate doors per day dynamically (30m before first act)
  const days = daysConfig.map(day => {
    const dayActs = actsByDay[day.id];
    dayActs.sort((a, b) => {
      return timeToMinutesLocal(a.start) - timeToMinutesLocal(b.start);
    });

    let doors = "15:00"; // fallback
    if (dayActs.length > 0) {
      const firstActStart = dayActs[0].start;
      const [h, m] = firstActStart.split(':').map(Number);
      let doorsH = h;
      let doorsM = m - 30;
      if (doorsM < 0) {
        doorsH -= 1;
        doorsM += 60;
      }
      doors = `${String(doorsH).padStart(2, '0')}:${String(doorsM).padStart(2, '0')}`;
    }

    return {
      id: day.id,
      dayNumber: day.dayNumber,
      dayLabel: day.dayLabel,
      weekdayEs: day.weekdayEs,
      doors: doors,
      stages: stageNames,
      acts: [] // will be enriched in the output TS file
    };
  });

  // Save the structured data
  agendaFestData[edicionId] = {
    config: edicionConfig,
    stages,
    days: days.map(d => {
      // Keep raw acts to be enriched in tsCode
      const rawActs = actsByDay[d.id];
      return {
        ...d,
        acts: rawActs
      };
    }),
    noticias
  };
});

// 5. Generate festivalData.ts source code
const tsCode = `// Generated automatically from AgendaFest.xlsx by sync_excel.cjs
// Do not edit this file manually.

export interface EdicionConfig {
  festivalId: string;
  edicionId: string;
  festivalName: string;
  visibleName: string;
  year: number;
  startDate: string;
  endDate: string;
  location: string;
  timezone: string;
  logo: string;
  cartel: string;
  mapa: string;
  dayStartHour: number;
  dayEndHour: number;
  aftermovieUrl: string;
}

export interface StageConfig {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface BandBio {
  name: string;
  title: string;
  description: string;
  country?: string;
  genre?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  imageUrl?: string;
  signingSession?: string;
}

export interface Act {
  id: string;
  band: string;
  stage: string;
  start: string;
  end: string;
  startMinutes: number; // relative to dayStartHour
  endMinutes: number;   // relative to dayStartHour
  duration: number;     // in minutes
  bio?: BandBio;
}

export interface FestivalDay {
  id: string;
  dayNumber: number;
  dayLabel: string;
  weekdayEs: string;
  doors: string;
  stages: string[];
  acts: Act[];
}

export interface FestivalData {
  festival: string;
  days: FestivalDay[];
}

export interface NoticiaItem {
  fecha: string;
  imagen: string;
  entradilla: string;
  noticia: string;
}

export interface FestivalEdition {
  config: EdicionConfig;
  stages: StageConfig[];
  days: FestivalDay[];
  noticias: NoticiaItem[];
}

export function timeToMinutes(timeStr: string, dayStartHour: number): number {
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const minutes = parseInt(minStr, 10);

  if (hour < dayStartHour) {
    hour += 24;
  }

  return (hour * 60 + minutes) - (dayStartHour * 60);
}

export function minutesToTime(minutes: number, dayStartHour: number): string {
  const absoluteMinutes = minutes + (dayStartHour * 60);
  let hour = Math.floor(absoluteMinutes / 60);
  const min = absoluteMinutes % 60;

  if (hour >= 24) {
    hour = hour - 24;
  }

  const hourStr = hour.toString().padStart(2, '0');
  const minStr = min.toString().padStart(2, '0');
  return \`\${hourStr}:\${minStr}\`;
}

// Raw source JSON dataset containing all festivals/editions
const rawAgendaFestData: any = ${JSON.stringify(agendaFestData, null, 2)};

// Process and enrich raw data
export const agendaFestData: Record<string, FestivalEdition> = {};

Object.keys(rawAgendaFestData).forEach((edicionId) => {
  const edition = rawAgendaFestData[edicionId];
  const startHour = edition.config.dayStartHour;

  agendaFestData[edicionId] = {
    config: edition.config,
    stages: edition.stages,
    noticias: edition.noticias,
    days: edition.days.map((day: any) => {
      return {
        ...day,
        acts: day.acts.map((act: any, index: number) => {
          const startMin = timeToMinutes(act.start, startHour);
          const endMin = timeToMinutes(act.end, startHour);
          const duration = endMin - startMin;
          const id = \`\${day.id}-\${act.stage.replace(/[^a-z0-9]/gi, '')}-\${act.band.toLowerCase().replace(/[^a-z0-9]/g, '')}-\${index}\`;

          return {
            id,
            band: act.band,
            stage: act.stage,
            start: act.start,
            end: act.end,
            startMinutes: startMin,
            endMinutes: endMin,
            duration,
            bio: act.bio
          };
        })
      };
    })
  };
});
`;

const tsFilePath = path.join(__dirname, 'src', 'data', 'festivalData.ts');
fs.writeFileSync(tsFilePath, tsCode, 'utf8');

const socialLinksCode = `// Generated automatically from AgendaFest.xlsx by sync_excel.cjs
// Do not edit this file manually.

export interface ArtistSocialLinks {
  officialWebsite?: string;
  tiktokUrl?: string;
  xUrl?: string;
}

const artistSocialLinks: Record<string, ArtistSocialLinks> = ${JSON.stringify(artistSocialLinks, null, 2)};

function normalizeArtistName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function getArtistSocialLinks(name: string): ArtistSocialLinks {
  return artistSocialLinks[normalizeArtistName(name)] || {};
}
`;

const socialLinksFilePath = path.join(__dirname, 'src', 'data', 'artistSocialLinks.ts');
fs.writeFileSync(socialLinksFilePath, socialLinksCode, 'utf8');
console.log(`festivalData.ts and artistSocialLinks.ts synchronized successfully from Excel!`);
