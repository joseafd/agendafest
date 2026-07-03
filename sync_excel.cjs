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

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getWeekdayLabel(dateSerial) {
  const dateStr = excelDateToYYYYMMDD(dateSerial);
  if (dateStr === '2026-07-01') return 'MIERCOLES 1';
  if (dateStr === '2026-07-02') return 'JUEVES 2';
  if (dateStr === '2026-07-03') return 'VIERNES 3';
  if (dateStr === '2026-07-04') return 'SABADO 4';
  return 'MIERCOLES 1';
}

function extractTitleAndDescription(desc) {
  if (!desc) return { title: '', description: '' };
  
  // Split on double space or more to separate catchphrase from description body
  const parts = desc.split(/  +/);
  if (parts.length > 1) {
    const firstPart = parts[0].trim();
    // If the first sentence is short (under 200 chars) and contains exclamation/emoji, treat as title
    if (firstPart.length < 200 && (firstPart.startsWith('¡') || firstPart.toUpperCase() === firstPart || firstPart.includes('!') || firstPart.includes('🔥') || firstPart.includes('💥'))) {
      const title = firstPart.replace(/\*\*/g, '').trim();
      const rest = parts.slice(1).join('\n\n').trim();
      return { title, description: rest };
    }
  }
  
  return { title: '', description: desc.trim() };
}

// 2. Read sheets
const artistasSheet = workbook.Sheets['Artistas'];
const actuacionesSheet = workbook.Sheets['Actuaciones'];
const firmasSheet = workbook.Sheets['Firmas'];
const noticiasSheet = workbook.Sheets['Noticias'];

const artistasData = XLSX.utils.sheet_to_json(artistasSheet);
const actuacionesData = XLSX.utils.sheet_to_json(actuacionesSheet);
const firmasData = XLSX.utils.sheet_to_json(firmasSheet);
const noticiasDataRaw = noticiasSheet ? XLSX.utils.sheet_to_json(noticiasSheet) : [];

// 3. Build maps
// Map of Artista ID -> Bio Details
const artistsMap = {};
artistasData.forEach(art => {
  const id = String(art['Artista ID']).toLowerCase().trim();
  const name = String(art['Nombre']).trim();
  const country = art['País'] ? String(art['País']).trim() : '';
  const genre = art['Género principal'] ? String(art['Género principal']).trim() : '';
  const rawDesc = art['Descripción'] ? String(art['Descripción']).trim() : '';
  const youtubeUrl = art['YouTube'] ? String(art['YouTube']).trim() : '';
  
  const { title, description } = extractTitleAndDescription(rawDesc);
  
  artistsMap[id] = {
    name,
    title,
    description,
    country,
    genre,
    youtubeUrl
  };
});

// Map of Artista ID -> Signing Session Info
const signaturesMap = {};
firmasData.forEach(f => {
  const id = String(f['Artista ID']).toLowerCase().trim();
  signaturesMap[id] = f;
});

// Process News Items (Sorted by date descending: newest first)
noticiasDataRaw.sort((a, b) => (b.Fecha_noticia || 0) - (a.Fecha_noticia || 0));

const noticias = noticiasDataRaw.map(n => {
  const dateStr = n['Fecha_noticia'] ? excelDateToYYYYMMDD(n['Fecha_noticia']) : '';
  const fecha = dateStr ? formatDate(dateStr) : '';
  return {
    fecha,
    imagen: n['Imagen'] ? String(n['Imagen']).trim() : '',
    entradilla: n['Entradilla'] ? String(n['Entradilla']).trim() : '',
    noticia: n['Noticia'] ? String(n['Noticia']).trim() : ''
  };
});

// 4. Group acts by day
const daysConfig = [
  { id: "2026-07-01", dayNumber: 1, dayLabel: "Miércoles 1", weekdayEs: "Miércoles", doors: "15:00" },
  { id: "2026-07-02", dayNumber: 2, dayLabel: "Jueves 2", weekdayEs: "Jueves", doors: "15:00" },
  { id: "2026-07-03", dayNumber: 3, dayLabel: "Viernes 3", weekdayEs: "Viernes", doors: "14:30" },
  { id: "2026-07-04", dayNumber: 4, dayLabel: "Sábado 4", weekdayEs: "Sábado", doors: "14:05" }
];

const actsByDay = {
  "2026-07-01": [],
  "2026-07-02": [],
  "2026-07-03": [],
  "2026-07-04": []
};

// Helper to convert time "HH:MM" to minutes relative to 14:00 (matching festivalData.ts timeToMinutes)
function timeToMinutes(timeStr) {
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const minutes = parseInt(minStr, 10);
  if (hour >= 0 && hour <= 6) {
    hour += 24;
  }
  return (hour * 60 + minutes) - (14 * 60);
}

actuacionesData.forEach(act => {
  const artistId = String(act['Artista ID']).toLowerCase().trim();
  const dateStr = excelDateToYYYYMMDD(act['Fecha']);
  
  if (!actsByDay[dateStr]) {
    return; // Skip if date is outside our range
  }
  
  const stage = String(act['Escenario']).replace(/\s*Stage$/i, '').trim();
  const start = excelTimeToHHMM(act['Inicio']);
  const end = excelTimeToHHMM(act['Fin']);
  
  const artistInfo = artistsMap[artistId];
  if (!artistInfo) {
    console.warn(`Warning: No bio found for Artista ID "${artistId}"`);
    return;
  }
  
  // Look up signing session
  const signature = signaturesMap[artistId];
  let signingSession = undefined;
  if (signature) {
    const weekdayStr = getWeekdayLabel(signature.Fecha);
    const startSig = excelTimeToHHMM(signature.Inicio);
    const endSig = excelTimeToHHMM(signature.Fin);
    signingSession = `SESIONES DE FIRMAS - ${weekdayStr} - ${startSig} A ${endSig}`;
  }
  
  const bio = {
    name: artistInfo.name,
    title: artistInfo.title,
    description: artistInfo.description,
    country: artistInfo.country || undefined,
    genre: artistInfo.genre || undefined,
    youtubeUrl: artistInfo.youtubeUrl || undefined,
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

// Sort acts chronologically in each day
Object.keys(actsByDay).forEach(dateStr => {
  actsByDay[dateStr].sort((a, b) => {
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });
});

// Construct the final days structure
const days = daysConfig.map(day => {
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    dayLabel: day.dayLabel,
    weekdayEs: day.weekdayEs,
    doors: day.doors,
    stages: ["Main", "Ritual", "Chaos", "Desert"],
    acts: actsByDay[day.id]
  };
});

const rawFestivalData = {
  festival: "Resurrection Fest 2026",
  days
};

// 5. Generate festivalData.ts source code
const tsCode = `// Generated automatically from AgendaFest.xlsx by sync_excel.cjs
// Do not edit this file manually.

export interface BandBio {
  name: string;
  title: string;
  description: string;
  country?: string;
  genre?: string;
  youtubeUrl?: string;
  signingSession?: string;
}

export interface Act {
  id: string;
  band: string;
  stage: string;
  start: string;
  end: string;
  startMinutes: number; // relative to 14:00
  endMinutes: number;   // relative to 14:00
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

// Global start hour for the timeline (14:00)
export const DAY_START_HOUR = 14;

export function timeToMinutes(timeStr: string): number {
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const minutes = parseInt(minStr, 10);

  if (hour >= 0 && hour <= 6) {
    hour += 24;
  }

  return (hour * 60 + minutes) - (DAY_START_HOUR * 60);
}

export function minutesToTime(minutes: number): string {
  const absoluteMinutes = minutes + (DAY_START_HOUR * 60);
  let hour = Math.floor(absoluteMinutes / 60);
  const min = absoluteMinutes % 60;

  if (hour >= 24) {
    hour = hour - 24;
  }

  const hourStr = hour.toString().padStart(2, '0');
  const minStr = min.toString().padStart(2, '0');
  return \`\${hourStr}:\${minStr}\`;
}

// Raw source JSON dataset
const rawFestivalData = ${JSON.stringify(rawFestivalData, null, 2)};

// Process and enrich raw data
export const festivalData: FestivalData = {
  festival: rawFestivalData.festival,
  days: rawFestivalData.days.map((day) => {
    return {
      ...day,
      acts: day.acts.map((act, index) => {
        const startMin = timeToMinutes(act.start);
        const endMin = timeToMinutes(act.end);
        const duration = endMin - startMin;
        const id = \`\${day.id}-\${act.stage}-\${act.band.toLowerCase().replace(/[^a-z0-9]/g, '')}-\${index}\`;

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

export const noticiasData: NoticiaItem[] = ${JSON.stringify(noticias, null, 2)};
`;

const tsFilePath = path.join(__dirname, 'src', 'data', 'festivalData.ts');
fs.writeFileSync(tsFilePath, tsCode, 'utf8');
console.log(`festivalData.ts synchronized successfully from Excel!`);
