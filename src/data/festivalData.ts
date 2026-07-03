import rawMarkdown from '../../Resu 2026 banda a banda segun FB.md?raw';

export interface BandBio {
  name: string;
  title: string;
  description: string;
  country?: string;
  genre?: string;
  youtubeUrl?: string;
  signingSession?: string; // New optional property
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

// Global start hour for the timeline (14:00)
export const DAY_START_HOUR = 14;

/**
 * Converts a time string "HH:MM" to minutes relative to DAY_START_HOUR (14:00).
 * Handles crossings of midnight (00:00 to 06:00) as subsequent hours (24:00 to 30:00).
 */
export function timeToMinutes(timeStr: string): number {
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const minutes = parseInt(minStr, 10);

  // If the hour is after midnight (00:00 to 06:00), treat as next day
  if (hour >= 0 && hour <= 6) {
    hour += 24;
  }

  return (hour * 60 + minutes) - (DAY_START_HOUR * 60);
}

/**
 * Converts relative minutes back to a time string "HH:MM" (handles 24h format wraps).
 */
export function minutesToTime(minutes: number): string {
  const absoluteMinutes = minutes + (DAY_START_HOUR * 60);
  let hour = Math.floor(absoluteMinutes / 60);
  const min = absoluteMinutes % 60;

  if (hour >= 24) {
    hour = hour - 24;
  }

  const hourStr = hour.toString().padStart(2, '0');
  const minStr = min.toString().padStart(2, '0');
  return `${hourStr}:${minStr}`;
}

/**
 * Secondary helper to parse properties of a band bio section (extracts country, genre, youtube).
 */
function buildBandBio(name: string, title: string, paragraphs: string[]): BandBio {
  let country = '';
  let genre = '';
  let youtubeUrl = '';
  let signingSession = '';
  const descriptionParagraphs = [...paragraphs];

  // 1. Extract country & genre from the first line if it contains the " - " separator
  if (descriptionParagraphs.length > 0) {
    const firstLine = descriptionParagraphs[0];
    if (firstLine.includes(' - ')) {
      const parts = firstLine.split(' - ');
      country = parts[0].trim();
      genre = parts[1].trim();
      descriptionParagraphs.shift(); // remove from description list
    }
  }

  // 1.5. Extract signing session if the next line starts with "SESIONES DE FIRMAS"
  if (descriptionParagraphs.length > 0) {
    const nextLine = descriptionParagraphs[0];
    if (nextLine.toUpperCase().startsWith('SESIONES DE FIRMAS')) {
      signingSession = nextLine.trim();
      descriptionParagraphs.shift(); // remove from description list
    }
  }

  // 2. Extract youtubeUrl from the last line if it matches standard YouTube links
  if (descriptionParagraphs.length > 0) {
    const lastLine = descriptionParagraphs[descriptionParagraphs.length - 1];
    if (lastLine.startsWith('http') && (lastLine.includes('youtube.com') || lastLine.includes('youtu.be'))) {
      youtubeUrl = lastLine.trim();
      descriptionParagraphs.pop(); // remove from description list
    }
  }

  return {
    name,
    title: title.trim(),
    description: descriptionParagraphs.join('\n\n').trim(),
    country: country || undefined,
    genre: genre || undefined,
    youtubeUrl: youtubeUrl || undefined,
    signingSession: signingSession || undefined,
  };
}

/**
 * Parses the markdown file to build a map of band names to their descriptions/titles.
 */
export function parseBandBios(markdownText: string): Record<string, BandBio> {
  const bios: Record<string, BandBio> = {};
  const lines = markdownText.split(/\r?\n/);
  let currentBand: string | null = null;
  let currentTitle = '';
  let currentParagraphs: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for bold band header, e.g. **ANNISOKAY** - Title...
    const headerMatch = line.match(/^\*\*([^*]+)\*\*(.*)/);
    if (headerMatch) {
      // Save the previous band if we were accumulating
      if (currentBand) {
        bios[currentBand.toUpperCase()] = buildBandBio(currentBand, currentTitle, currentParagraphs);
      }

      const rawName = headerMatch[1].trim();
      const cleanedName = rawName.replace(/[\s-:]+$/, ''); // clean trailing spaces/dashes
      currentBand = cleanedName;
      
      const rest = headerMatch[2].trim();
      currentTitle = rest.replace(/^[\s-:]+/, ''); // clean leading spaces/dashes
      currentParagraphs = [];
    } else if (
      line.toUpperCase().startsWith('MIERCOLES ') ||
      line.toUpperCase().startsWith('JUEVES ') ||
      line.toUpperCase().startsWith('VIERNES ') ||
      line.toUpperCase().startsWith('SABADO ') ||
      line.toUpperCase().startsWith('SÁBADO ') ||
      line.toUpperCase() === 'MIERCOLES 1' ||
      line.toUpperCase() === 'JUEVES 2' ||
      line.toUpperCase() === 'VIERNES 3' ||
      line.toUpperCase() === 'SABADO 4' ||
      line.toUpperCase() === 'SÁBADO 4'
    ) {
      // Day boundary: save and reset
      if (currentBand) {
        bios[currentBand.toUpperCase()] = buildBandBio(currentBand, currentTitle, currentParagraphs);
        currentBand = null;
      }
    } else {
      if (currentBand) {
        if (line !== '') {
          currentParagraphs.push(line);
        }
      }
    }
  }

  // Save the last band
  if (currentBand) {
    bios[currentBand.toUpperCase()] = buildBandBio(currentBand, currentTitle, currentParagraphs);
  }

  return bios;
}

/**
 * Searches for a bio entry matching the band name (fuzzy search to handle formatting differences).
 */
export function findBandBio(bandName: string, bios: Record<string, BandBio>): BandBio | undefined {
  const upperName = bandName.toUpperCase().trim();
  
  if (bios[upperName]) return bios[upperName];
  
  const keys = Object.keys(bios);
  const normName = upperName.replace(/[^A-Z0-9]/g, '');
  
  // Special case for Sepultura / Cavalera Conspiracy
  if (normName.includes('CAVALERA') || normName.includes('CAVBALERA')) {
    const cavMatch = keys.find(k => k.includes('CAVBALERA') || k.includes('CAVALERA'));
    if (cavMatch) return bios[cavMatch];
  }

  for (const key of keys) {
    const normKey = key.replace(/[^A-Z0-9]/g, '');
    if (normKey === normName) {
      return bios[key];
    }
    if (normKey.startsWith(normName) || normName.startsWith(normKey)) {
      return bios[key];
    }
    if (normKey.includes(normName) || normName.includes(normKey)) {
      return bios[key];
    }
  }
  
  return undefined;
}

// Parse the raw markdown content once
const parsedBios = parseBandBios(rawMarkdown);

// Raw source JSON dataset
const rawFestivalData = {
  "festival": "Resurrection Fest 2026",
  "days": [
    {
      "id": "2026-07-01",
      "dayNumber": 1,
      "dayLabel": "Miércoles 1",
      "weekdayEs": "Miércoles",
      "doors": "15:00",
      "stages": ["Main", "Ritual", "Chaos", "Desert"],
      "acts": [
        { "band": "Annisokay", "stage": "Main", "start": "15:25", "end": "16:15" },
        { "band": "Crowded", "stage": "Chaos", "start": "15:25", "end": "16:10" },
        { "band": "Aneuma", "stage": "Ritual", "start": "16:15", "end": "16:55" },
        { "band": "Man With A Mission", "stage": "Main", "start": "16:55", "end": "17:45" },
        { "band": "God Complex", "stage": "Chaos", "start": "16:55", "end": "17:45" },
        { "band": "TSS", "stage": "Ritual", "start": "17:45", "end": "18:30" },
        { "band": "Black Maracas", "stage": "Desert", "start": "17:45", "end": "18:35" },
        { "band": "President", "stage": "Main", "start": "18:30", "end": "19:20" },
        { "band": "Immortal Disfigurement", "stage": "Chaos", "start": "18:30", "end": "19:20" },
        { "band": "The Pretty Wild", "stage": "Ritual", "start": "19:20", "end": "20:10" },
        { "band": "Cardiac", "stage": "Desert", "start": "19:20", "end": "20:10" },
        { "band": "The Scratch", "stage": "Chaos", "start": "20:05", "end": "21:05" },
        { "band": "Thrown", "stage": "Main", "start": "20:10", "end": "21:00" },
        { "band": "The Browning", "stage": "Ritual", "start": "21:00", "end": "21:50" },
        { "band": "Last Train", "stage": "Desert", "start": "21:00", "end": "22:00" },
        { "band": "A Day To Remember", "stage": "Main", "start": "21:50", "end": "23:00" },
        { "band": "Get The Shot", "stage": "Chaos", "start": "22:00", "end": "23:00" },
        { "band": "Self Deception", "stage": "Ritual", "start": "23:00", "end": "23:55" },
        { "band": "Lampr3a", "stage": "Desert", "start": "23:00", "end": "00:00" },
        { "band": "Sabaton", "stage": "Main", "start": "00:00", "end": "01:50" },
        { "band": "High Vis", "stage": "Chaos", "start": "00:00", "end": "01:10" },
        { "band": "Faetooth", "stage": "Desert", "start": "01:10", "end": "02:20" },
        { "band": "Testament", "stage": "Ritual", "start": "01:50", "end": "03:00" }
      ]
    },
    {
      "id": "2026-07-02",
      "dayNumber": 2,
      "dayLabel": "Jueves 2",
      "weekdayEs": "Jueves",
      "doors": "15:00",
      "stages": ["Main", "Ritual", "Chaos", "Desert"],
      "acts": [
        { "band": "Arson Tides", "stage": "Desert", "start": "15:20", "end": "16:00" },
        { "band": "Fallen At Dawn", "stage": "Main", "start": "15:25", "end": "16:10" },
        { "band": "Fuet!", "stage": "Chaos", "start": "15:45", "end": "16:35" },
        { "band": "Her Anxiety", "stage": "Ritual", "start": "16:10", "end": "16:50" },
        { "band": "Silly Goose", "stage": "Desert", "start": "16:35", "end": "17:20" },
        { "band": "Caskets", "stage": "Main", "start": "16:50", "end": "17:40" },
        { "band": "Blood Command", "stage": "Chaos", "start": "17:20", "end": "18:20" },
        { "band": "Burning Witches", "stage": "Ritual", "start": "17:40", "end": "18:30" },
        { "band": "Blues Pills", "stage": "Desert", "start": "18:20", "end": "19:30" },
        { "band": "Angelus Apatrida", "stage": "Main", "start": "18:30", "end": "19:30" },
        { "band": "The Funeral Portrait", "stage": "Ritual", "start": "19:30", "end": "20:30" },
        { "band": "Belvedere", "stage": "Chaos", "start": "19:30", "end": "20:30" },
        { "band": "Ciclonautas", "stage": "Desert", "start": "20:30", "end": "21:30" },
        { "band": "Iron Maiden", "stage": "Main", "start": "20:50", "end": "23:00" },
        { "band": "The Callous Daoboys", "stage": "Chaos", "start": "21:35", "end": "22:35" },
        { "band": "Vulvarine", "stage": "Desert", "start": "22:35", "end": "23:35" },
        { "band": "Caliban", "stage": "Ritual", "start": "23:10", "end": "00:20" },
        { "band": "Lionheart", "stage": "Chaos", "start": "23:45", "end": "01:00" },
        { "band": "Anthrax", "stage": "Main", "start": "00:20", "end": "01:35" },
        { "band": "Psychonaut", "stage": "Desert", "start": "01:00", "end": "02:00" },
        { "band": "Authority Zero", "stage": "Ritual", "start": "01:35", "end": "02:25" },
        { "band": "Feuerschwanz", "stage": "Main", "start": "02:25", "end": "03:25" }
      ]
    },
    {
      "id": "2026-07-03",
      "dayNumber": 3,
      "dayLabel": "Viernes 3",
      "weekdayEs": "Viernes",
      "doors": "14:30",
      "stages": ["Main", "Ritual", "Chaos", "Desert"],
      "acts": [
        { "band": "Nukore", "stage": "Ritual", "start": "15:05", "end": "15:50" },
        { "band": "The Fall Of Atlantis", "stage": "Desert", "start": "15:05", "end": "15:45" },
        { "band": "Nevertel", "stage": "Main", "start": "15:50", "end": "16:35" },
        { "band": "Pants Off", "stage": "Chaos", "start": "15:50", "end": "16:35" },
        { "band": "Not Yet", "stage": "Ritual", "start": "16:35", "end": "17:20" },
        { "band": "Madmess", "stage": "Desert", "start": "16:35", "end": "17:20" },
        { "band": "The Rasmus", "stage": "Main", "start": "17:20", "end": "18:10" },
        { "band": "Oslo Ovnies", "stage": "Chaos", "start": "17:20", "end": "18:10" },
        { "band": "Okkultist", "stage": "Ritual", "start": "18:10", "end": "19:00" },
        { "band": "Mourir", "stage": "Desert", "start": "18:10", "end": "19:00" },
        { "band": "Bleed From Within", "stage": "Main", "start": "19:00", "end": "20:00" },
        { "band": "Initiate", "stage": "Chaos", "start": "19:00", "end": "19:50" },
        { "band": "Hulder", "stage": "Ritual", "start": "20:00", "end": "20:50" },
        { "band": "Rosalie Cunningham", "stage": "Desert", "start": "20:00", "end": "20:50" },
        { "band": "Trivium", "stage": "Main", "start": "20:50", "end": "22:00" },
        { "band": "Dying Wish", "stage": "Chaos", "start": "20:50", "end": "21:50" },
        { "band": "Gaerea", "stage": "Ritual", "start": "22:00", "end": "23:00" },
        { "band": "Return To Dust", "stage": "Desert", "start": "22:00", "end": "23:00" },
        { "band": "End It", "stage": "Chaos", "start": "23:00", "end": "00:00" },
        { "band": "Limp Bizkit", "stage": "Main", "start": "23:10", "end": "00:30" },
        { "band": "Blaze The Trail", "stage": "Ritual", "start": "00:35", "end": "01:25" },
        { "band": "Borknagar", "stage": "Desert", "start": "00:35", "end": "01:45" },
        { "band": "Cavalera Conspiracy", "stage": "Main", "start": "01:25", "end": "02:40" },
        { "band": "House Of Protection", "stage": "Chaos", "start": "01:40", "end": "02:40" }
      ]
    },
    {
      "id": "2026-07-04",
      "dayNumber": 4,
      "dayLabel": "Sábado 4",
      "weekdayEs": "Sábado",
      "doors": "14:05",
      "stages": ["Main", "Ritual", "Chaos", "Desert"],
      "acts": [
        { "band": "I Scream Never Ground", "stage": "Main", "start": "14:50", "end": "15:40" },
        { "band": "Down To Suffer", "stage": "Desert", "start": "14:50", "end": "15:30" },
        { "band": "Stellvris", "stage": "Ritual", "start": "15:40", "end": "16:25" },
        { "band": "Donuts Hole", "stage": "Chaos", "start": "15:40", "end": "16:25" },
        { "band": "Hamlet", "stage": "Main", "start": "16:25", "end": "17:15" },
        { "band": "Kruddö", "stage": "Desert", "start": "16:25", "end": "17:15" },
        { "band": "Todo Mal", "stage": "Ritual", "start": "17:15", "end": "18:05" },
        { "band": "The Family Men", "stage": "Chaos", "start": "17:15", "end": "18:05" },
        { "band": "Imminence", "stage": "Main", "start": "18:05", "end": "19:05" },
        { "band": "The Gems", "stage": "Desert", "start": "18:15", "end": "19:05" },
        { "band": "Hand Of Juno", "stage": "Ritual", "start": "19:05", "end": "19:55" },
        { "band": "Frontierer", "stage": "Chaos", "start": "19:05", "end": "19:55" },
        { "band": "P.O.D.", "stage": "Main", "start": "19:55", "end": "20:55" },
        { "band": "Cwfen", "stage": "Desert", "start": "19:55", "end": "20:55" },
        { "band": "Distant", "stage": "Ritual", "start": "20:55", "end": "21:55" },
        { "band": "Gridiron", "stage": "Chaos", "start": "20:55", "end": "21:55" },
        { "band": "Mastodon", "stage": "Main", "start": "21:55", "end": "23:10" },
        { "band": "A.A. Williams", "stage": "Desert", "start": "21:55", "end": "22:55" },
        { "band": "Dogma", "stage": "Ritual", "start": "23:10", "end": "00:20" },
        { "band": "Converge", "stage": "Chaos", "start": "23:10", "end": "00:20" },
        { "band": "Marilyn Manson", "stage": "Main", "start": "00:30", "end": "02:00" },
        { "band": "The Vintage Caravan", "stage": "Desert", "start": "00:50", "end": "02:00" },
        { "band": "Blood Incantation", "stage": "Ritual", "start": "02:10", "end": "03:25" },
        { "band": "Elwood Stray", "stage": "Chaos", "start": "02:10", "end": "03:20" }
      ]
    }
  ]
};

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
        const id = `${day.id}-${act.stage}-${act.band.toLowerCase().replace(/[^a-z0-9]/g, '')}-${index}`;
        const bio = findBandBio(act.band, parsedBios);

        return {
          id,
          band: act.band,
          stage: act.stage,
          start: act.start,
          end: act.end,
          startMinutes: startMin,
          endMinutes: endMin,
          duration: duration > 0 ? duration : duration + 24 * 60, // safeguard for midnight crossings
          bio,
        };
      }),
    };
  }),
};
