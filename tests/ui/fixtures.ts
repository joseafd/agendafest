import type {
  Act,
  EdicionConfig,
  FestivalDay,
  FestivalEdition,
  StageConfig,
} from '../../src/data/festivalData';

export const stages: StageConfig[] = [
  { id: 'main', name: 'Principal', order: 1, color: '#ff003c' },
  { id: 'second', name: 'Segundo', order: 2, color: '#2563eb' },
];

export const acts: Record<string, Act> = {
  alpha: {
    id: '2026-08-01-alpha',
    band: 'Alpha',
    stage: 'Principal',
    start: '18:00',
    end: '19:00',
    startMinutes: 240,
    endMinutes: 300,
    duration: 60,
  },
  beta: {
    id: '2026-08-01-beta',
    band: 'Beta',
    stage: 'Segundo',
    start: '19:30',
    end: '20:30',
    startMinutes: 330,
    endMinutes: 390,
    duration: 60,
  },
  gamma: {
    id: '2026-08-02-gamma',
    band: 'Gamma',
    stage: 'Segundo',
    start: '20:00',
    end: '21:00',
    startMinutes: 360,
    endMinutes: 420,
    duration: 60,
  },
};

export const days: FestivalDay[] = [
  {
    id: '2026-08-01',
    dayNumber: 1,
    dayLabel: 'Sábado 1',
    weekdayEs: 'Sábado',
    doors: '17:00',
    stages: ['Principal', 'Segundo'],
    acts: [acts.alpha, acts.beta],
  },
  {
    id: '2026-08-02',
    dayNumber: 2,
    dayLabel: 'Domingo 2',
    weekdayEs: 'Domingo',
    doors: '17:00',
    stages: ['Segundo'],
    acts: [acts.gamma],
  },
];

const createConfig = (
  edicionId: string,
  festivalName: string,
  visibleName: string,
  location: string,
): EdicionConfig => ({
  festivalId: edicionId.replace(/-\d{4}$/, ''),
  edicionId,
  festivalName,
  visibleName,
  year: 2026,
  startDate: '2026-08-01',
  endDate: '2026-08-02',
  location,
  timezone: 'Europe/Madrid',
  logo: 'logo.jpg',
  cartel: 'cartel.jpg',
  mapa: 'mapa.jpg',
  dayStartHour: 14,
  dayEndHour: 4,
  aftermovieUrl: '',
});

export const editions: FestivalEdition[] = [
  {
    config: createConfig('festival-norte-2026', 'Festival Norte', 'Festival Norte 2026', 'Gijón'),
    stages,
    days,
    noticias: [],
  },
  {
    config: createConfig('festival-sur-2026', 'Festival Sur', 'Festival Sur 2026', 'Sevilla'),
    stages,
    days,
    noticias: [],
  },
];
