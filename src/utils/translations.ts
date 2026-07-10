export type Language = 'es' | 'en' | 'fr';

export interface TranslationDict {
  // FestivalSelector.tsx
  tuPortal: string;
  buscarFestival: string;
  porFecha: string;
  porNombre: string;
  noFestivales: string;
  proximamente: string;
  enVivo: string;
  finalizado: string;
  de: string; // e.g. "de Jul" in Spanish dates
  
  // FestivalDashboard.tsx
  tabHome: string;
  tabAgenda: string;
  tabMap: string;
  tabNews: string;
  backToSelector: string;
  visits: string;
  conflictTitle: string;
  conflictDesc: string;
  importTitle: string;
  importDesc: string;
  importMerge: string;
  importReplace: string;
  importDiscard: string;
  toastMergeSuccess: string;
  toastReplaceSuccess: string;
  toastNoFavsShare: string;
  toastShareSuccess: string;
  toastShareError: string;
  countdownTitle: string;
  daysLabel: string;
  hoursLabel: string;
  minutesLabel: string;
  secondsLabel: string;
  festivalStarted: string;
  festivalFinished: string;

  // Header.tsx
  viewHours: string;
  viewStages: string;
  openFilters: string;
  shareFavs: string;
  helpTitle: string;
  goHome: string;

  // SearchBar.tsx
  searchBarPlaceholder: string;
  searchGlobalLabel: string;

  // FilterDrawer.tsx
  filterTitle: string;
  filterDesc: string;
  resetFilters: string;
  closeFilters: string;
  filterStages: string;
  dragToOrder: string;
  filterCountries: string;
  filterGenres: string;
  filterFavorites: string;

  // BandDetailModal.tsx
  countryLabel: string;
  genreLabel: string;
  stageLabel: string;
  timeLabel: string;
  dayLabel: string;
  noVideo: string;
  addFavorites: string;
  removeFavorites: string;
  linkCopied: string;

  // PwaInstallModal.tsx
  modalTitle: string;
  modalSubtitle: string;
  installTitle: string;
  recommended: string;
  required: string;
  androidBrowser: string;
  iosBrowser: string;
  pcBrowser: string;
  androidStep1: string;
  androidStep2: string;
  androidStep3: string;
  androidStep4: string;
  iosStep1: string;
  iosStep2: string;
  iosStep3: string;
  iosStep4: string;
  pcStep1: string;
  pcStep2: string;
  pcStep3: string;
  pcStep4: string;
  shareTitle: string;
  shareText: string;
  creditsTitle: string;
  creditsDesc: string;
  officialPhoto: string;
  copied: string;
  copy: string;

  // NewsView.tsx
  newsTitle: string;
  readMore: string;
  backToHome: string;
  emptyNews: string;
}

export const translations: Record<Language, TranslationDict> = {
  es: {
    tuPortal: "Tu Portal de Conciertos",
    buscarFestival: "Buscar festival o ciudad...",
    porFecha: "Por Fecha",
    porNombre: "Por Nombre",
    noFestivales: "No se encontraron festivales que coincidan con tu búsqueda.",
    proximamente: "Próximamente",
    enVivo: "En Vivo",
    finalizado: "Finalizado",
    de: "de",

    tabHome: "Inicio",
    tabAgenda: "Horarios",
    tabMap: "Recinto",
    tabNews: "Noticias",
    backToSelector: "← Cambiar de Festival",
    visits: "Visitas",
    conflictTitle: "⚠️ CONFLICTO DE HORARIOS",
    conflictDesc: "Tocas en la misma franja horaria que las siguientes bandas:",
    importTitle: "IMPORTAR AGENDA",
    importDesc: "Te han compartido un itinerario con {count} bandas favoritas. ¿Qué deseas hacer?",
    importMerge: "Importar (Combinar con mis favoritos)",
    importReplace: "Reemplazar (Borrará mis favoritos actuales)",
    importDiscard: "Descartar",
    toastMergeSuccess: "✅ ¡Favoritos combinados con éxito!",
    toastReplaceSuccess: "✅ Tu agenda ha sido reemplazada",
    toastNoFavsShare: "Añade primero alguna banda a favoritos para compartir",
    toastShareSuccess: "🔗 ¡Enlace de tu agenda copiado al portapapeles!",
    toastShareError: "No se pudo copiar el enlace de forma automática",
    countdownTitle: "YA FALTA POCO PARA EL INICIO",
    daysLabel: "Días",
    hoursLabel: "Horas",
    minutesLabel: "Min",
    secondsLabel: "Seg",
    festivalStarted: "🤘 EL FESTIVAL YA HA COMENZADO 🤘",
    festivalFinished: "🤘 EL FESTIVAL YA HA FINALIZADO 🤘",

    viewHours: "Ver lista por horas",
    viewStages: "Ver cuadrícula de escenarios",
    openFilters: "Abrir filtros y ordenar escenarios",
    shareFavs: "Compartir favoritos",
    helpTitle: "Guía de instalación y ayuda",
    goHome: "Volver a la portada",

    searchBarPlaceholder: "Buscar banda...",
    searchGlobalLabel: "Buscar en todos los días",

    filterTitle: "FILTRAR Y ORDENAR",
    filterDesc: "Personaliza tu experiencia seleccionando escenarios, países o estilos de música.",
    resetFilters: "Restablecer filtros",
    closeFilters: "Cerrar filtros",
    filterStages: "Escenarios visibles",
    dragToOrder: "(Arrastra para ordenar prioridad de escenarios)",
    filterCountries: "Países de origen",
    filterGenres: "Estilos / Géneros",
    filterFavorites: "Ver solo mis favoritos",

    countryLabel: "País",
    genreLabel: "Estilos",
    stageLabel: "Escenario",
    timeLabel: "Horario",
    dayLabel: "Jornada",
    noVideo: "No hay video oficial disponible",
    addFavorites: "Añadir a favoritos",
    removeFavorites: "Quitar de favoritos",
    linkCopied: "¡Enlace copiado!",

    modalTitle: "UTILIDADES Y GUÍA",
    modalSubtitle: "Instala la PWA y comparte {festival}",
    installTitle: "📲 ¿Cómo fijar la App en tu pantalla?",
    recommended: "RECOMENDADO",
    required: "OBLIGATORIO",
    androidBrowser: "Google Chrome / Samsung Internet",
    iosBrowser: "Safari Browser",
    pcBrowser: "Chrome, Edge, Opera",
    androidStep1: "Abre el navegador y entra a la web.",
    androidStep2: "Pulsa el botón de tres puntos `⋮` en la esquina superior derecha.",
    androidStep3: "Selecciona la opción `Añadir a pant. de inicio` o `Instalar aplicación`.",
    androidStep4: "Confirma y la app aparecerá en tu escritorio como una app nativa (¡funciona sin conexión!).",
    iosStep1: "Abre la app obligatoriamente en Safari.",
    iosStep2: "Pulsa el botón de Compartir `[+]` (el icono del cuadrado con una flecha hacia arriba, en el menú inferior).",
    iosStep3: "Baja en el menú flotante y selecciona `Añadir a la pantalla de inicio`.",
    iosStep4: "Pulsa `Añadir` arriba a la derecha.",
    pcStep1: "Fíjate en la barra de direcciones de tu navegador (arriba a la derecha).",
    pcStep2: "Verás un icono circular con un símbolo de más (+) o un icono de ordenador con una flecha.",
    pcStep3: "Haz clic en él y selecciona `Instalar`.",
    pcStep4: "AgendaFest se abrirá en su propia ventana independiente con icono en tu escritorio.",
    shareTitle: "🔗 Compartir AgendaFest",
    shareText: "Compartir por WhatsApp, Redes, etc.",
    creditsTitle: "📷 Créditos y Autoría",
    creditsDesc: "Esta aplicación no oficial ha sido desarrollada para facilitar la consulta de horarios y escenarios.",
    officialPhoto: "Fotografía oficial",
    copied: "Copiado",
    copy: "Copiar",

    newsTitle: "ÚLTIMAS NOTICIAS",
    readMore: "Leer más",
    backToHome: "Volver",
    emptyNews: "No hay noticias disponibles en este momento."
  },
  en: {
    tuPortal: "Your Concert Portal",
    buscarFestival: "Search festival or city...",
    porFecha: "By Date",
    porNombre: "By Name",
    noFestivales: "No festivals match your search.",
    proximamente: "Upcoming",
    enVivo: "Live Now",
    finalizado: "Finished",
    de: "of",

    tabHome: "Home",
    tabAgenda: "Schedule",
    tabMap: "Venue Map",
    tabNews: "News",
    backToSelector: "← Switch Festival",
    visits: "Visits",
    conflictTitle: "⚠️ SCHEDULE CLASH",
    conflictDesc: "Clashes in the same time frame as these bands:",
    importTitle: "IMPORT THE SCHEDULE",
    importDesc: "A schedule with {count} favorite bands has been shared with you. What would you like to do?",
    importMerge: "Import (Merge with my favorites)",
    importReplace: "Replace (Deletes my current favorites)",
    importDiscard: "Discard",
    toastMergeSuccess: "✅ Favorites merged successfully!",
    toastReplaceSuccess: "✅ Your schedule has been replaced",
    toastNoFavsShare: "Add bands to favorites first to share",
    toastShareSuccess: "🔗 Schedule link copied to clipboard!",
    toastShareError: "Could not copy the link automatically",
    countdownTitle: "GETTING CLOSER TO THE START",
    daysLabel: "Days",
    hoursLabel: "Hours",
    minutesLabel: "Min",
    secondsLabel: "Sec",
    festivalStarted: "🤘 THE FESTIVAL HAS STARTED 🤘",
    festivalFinished: "🤘 THE FESTIVAL HAS ENDED 🤘",

    viewHours: "View list by hours",
    viewStages: "View stage grid",
    openFilters: "Open filters and order stages",
    shareFavs: "Share favorites",
    helpTitle: "Installation guide & Help",
    goHome: "Back to Home",

    searchBarPlaceholder: "Search band...",
    searchGlobalLabel: "Search in all days",

    filterTitle: "FILTER & SORT",
    filterDesc: "Customize your experience by selecting stages, countries, or music genres.",
    resetFilters: "Reset filters",
    closeFilters: "Close filters",
    filterStages: "Visible stages",
    dragToOrder: "(Drag to sort stage priority)",
    filterCountries: "Countries of origin",
    filterGenres: "Styles / Genres",
    filterFavorites: "Show only my favorites",

    countryLabel: "Country",
    genreLabel: "Genres",
    stageLabel: "Stage",
    timeLabel: "Time",
    dayLabel: "Day",
    noVideo: "No official video available",
    addFavorites: "Add to favorites",
    removeFavorites: "Remove from favorites",
    linkCopied: "Link copied!",

    modalTitle: "UTILITIES & GUIDE",
    modalSubtitle: "Install the PWA and share {festival}",
    installTitle: "📲 How to pin the App on your screen?",
    recommended: "RECOMMENDED",
    required: "REQUIRED",
    androidBrowser: "Google Chrome / Samsung Internet",
    iosBrowser: "Safari Browser",
    pcBrowser: "Chrome, Edge, Opera",
    androidStep1: "Open your browser and enter the website.",
    androidStep2: "Tap the three dots `⋮` in the top right corner.",
    androidStep3: "Select the option `Add to Home screen` or `Install app`.",
    androidStep4: "Confirm and the app will appear on your screen as a native app (works offline!).",
    iosStep1: "You must open the app in Safari.",
    iosStep2: "Tap the Share button `[+]` (square icon with an arrow pointing up, in the bottom menu).",
    iosStep3: "Scroll down and select `Add to Home Screen`.",
    iosStep4: "Tap `Add` in the top right corner.",
    pcStep1: "Look at the address bar of your browser (top right).",
    pcStep2: "You will see a circular icon with a plus sign (+) or a computer icon with an arrow.",
    pcStep3: "Click it and select `Install`.",
    pcStep4: "AgendaFest will open in its own window with an icon on your desktop.",
    shareTitle: "🔗 Share AgendaFest",
    shareText: "Share via WhatsApp, Social Media, etc.",
    creditsTitle: "📷 Credits & Authorship",
    creditsDesc: "This unofficial app has been developed to make checking schedules and stages easy.",
    officialPhoto: "Official Photography",
    copied: "Copied",
    copy: "Copy",

    newsTitle: "LATEST NEWS",
    readMore: "Read more",
    backToHome: "Back",
    emptyNews: "No news available at the moment."
  },
  fr: {
    tuPortal: "Votre Portail de Concerts",
    buscarFestival: "Rechercher un festival ou une ville...",
    porFecha: "Par Date",
    porNombre: "Par Nom",
    noFestivales: "Aucun festival ne correspond à votre recherche.",
    proximamente: "À venir",
    enVivo: "En direct",
    finalizado: "Terminé",
    de: "de",

    tabHome: "Accueil",
    tabAgenda: "Horaires",
    tabMap: "Plan du site",
    tabNews: "Actualités",
    backToSelector: "← Changer de festival",
    visits: "Visites",
    conflictTitle: "⚠️ CONFLIT D'HORAIRES",
    conflictDesc: "Conflits dans la même tranche horaire avec ces groupes :",
    importTitle: "IMPORTER L'AGENDA",
    importDesc: "Un itinéraire avec {count} groupes favoris a été partagé avec vous. Que souhaitez-vous faire ?",
    importMerge: "Importer (Fusionner avec mes favoris)",
    importReplace: "Remplacer (Supprime mes favoris actuels)",
    importDiscard: "Ignorer",
    toastMergeSuccess: "✅ Favoris fusionnés avec succès !",
    toastReplaceSuccess: "✅ Votre agenda a été remplacé",
    toastNoFavsShare: "Ajoutez d'abord des groupes à vos favoris pour partager",
    toastShareSuccess: "🔗 Lien de l'agenda copié dans le presse-papiers !",
    toastShareError: "Impossible de copier le lien automatiquement",
    countdownTitle: "LE DÉPART APPROCHE",
    daysLabel: "Jours",
    hoursLabel: "Heures",
    minutesLabel: "Min",
    secondsLabel: "Sec",
    festivalStarted: "🤘 LE FESTIVAL A COMMENCÉ 🤘",
    festivalFinished: "🤘 LE FESTIVAL EST TERMINÉ 🤘",

    viewHours: "Affichage par heures",
    viewStages: "Affichage par scènes",
    openFilters: "Ouvrir les filtres et trier les scènes",
    shareFavs: "Partager les favoris",
    helpTitle: "Guide d'installation & Aide",
    goHome: "Retour à l'accueil",

    searchBarPlaceholder: "Rechercher un groupe...",
    searchGlobalLabel: "Rechercher tous les jours",

    filterTitle: "FILTRER & TRIER",
    filterDesc: "Personnalisez votre expérience en sélectionnant les scènes, les pays ou les genres musicaux.",
    resetFilters: "Réinitialiser les filtres",
    closeFilters: "Fermer les filtres",
    filterStages: "Scènes visibles",
    dragToOrder: "(Glissez pour trier les priorités des scènes)",
    filterCountries: "Pays d'origine",
    filterGenres: "Styles / Genres",
    filterFavorites: "Afficher uniquement mes favoris",

    countryLabel: "Pays",
    genreLabel: "Genres",
    stageLabel: "Scène",
    timeLabel: "Horaire",
    dayLabel: "Jour",
    noVideo: "Aucune vidéo officielle disponible",
    addFavorites: "Ajouter aux favoris",
    removeFavorites: "Retirer des favoris",
    linkCopied: "Lien copié !",

    modalTitle: "UTILITAIRES & GUIDE",
    modalSubtitle: "Installez la PWA et partagez {festival}",
    installTitle: "📲 Comment épingler l'application sur votre écran ?",
    recommended: "RECOMMANDÉ",
    required: "OBLIGATOIRE",
    androidBrowser: "Google Chrome / Samsung Internet",
    iosBrowser: "Navigateur Safari",
    pcBrowser: "Chrome, Edge, Opera",
    androidStep1: "Ouvrez votre navigateur et accédez au site web.",
    androidStep2: "Appuyez sur les trois points `⋮` dans le coin supérieur droit.",
    androidStep3: "Sélectionnez l'option `Ajouter à l'écran d'accueil` ou `Installer l'application`.",
    androidStep4: "Confirmez et l'application apparaîtra sur votre écran comme une application native (fonctionne hors ligne !).",
    iosStep1: "Vous devez ouvrir l'application dans Safari.",
    iosStep2: "Appuyez sur le bouton Partager `[+]` (icône carrée avec une flèche vers le haut, dans le menu du bas).",
    iosStep3: "Faites défiler vers le bas et sélectionnez `Sur l'écran d'accueil`.",
    iosStep4: "Appuyez sur `Ajouter` dans le coin supérieur droit.",
    pcStep1: "Regardez la barre d'adresse de votre navigateur (en haut à droite).",
    pcStep2: "Vous verrez une icône circulaire avec un signe plus (+) ou une icône d'ordinateur avec une flèche.",
    pcStep3: "Cliquez dessus et sélectionnez `Installer`.",
    pcStep4: "AgendaFest s'ouvrira dans sa propre fenêtre avec une icône sur votre bureau.",
    shareTitle: "🔗 Partager AgendaFest",
    shareText: "Partager via WhatsApp, Réseaux Sociaux, etc.",
    creditsTitle: "📷 Crédits & Auteurs",
    creditsDesc: "Cette application non officielle a été développée pour faciliter la consultation des horaires et des scènes.",
    officialPhoto: "Photographie Officielle",
    copied: "Copié",
    copy: "Copier",

    newsTitle: "DERNIÈRES NOUVELLES",
    readMore: "Lire la suite",
    backToHome: "Retour",
    emptyNews: "Aucune actualité disponible pour le moment."
  }
};

export const t = (lang: Language, key: keyof TranslationDict): string => {
  return translations[lang][key] || translations['es'][key] || '';
};

export const tFormat = (
  lang: Language,
  key: keyof TranslationDict,
  replacements: Record<string, string | number>
): string => {
  let text = t(lang, key);
  Object.entries(replacements).forEach(([k, val]) => {
    text = text.replace(new RegExp(`{${k}}`, 'g'), String(val));
  });
  return text;
};

// Translate Spanish month abbreviations for UI dates
const dateMonthsES: Record<string, Record<Language, string>> = {
  'Ene': { es: 'Ene', en: 'Jan', fr: 'Jan' },
  'Feb': { es: 'Feb', en: 'Feb', fr: 'Fév' },
  'Mar': { es: 'Mar', en: 'Mar', fr: 'Mar' },
  'Abr': { es: 'Abr', en: 'Apr', fr: 'Avr' },
  'May': { es: 'May', en: 'May', fr: 'Mai' },
  'Jun': { es: 'Jun', en: 'Jun', fr: 'Juin' },
  'Jul': { es: 'Jul', en: 'Jul', fr: 'Juil' },
  'Ago': { es: 'Ago', en: 'Aug', fr: 'Aoû' },
  'Sep': { es: 'Sep', en: 'Sep', fr: 'Sep' },
  'Oct': { es: 'Oct', en: 'Oct', fr: 'Oct' },
  'Nov': { es: 'Nov', en: 'Nov', fr: 'Nov' },
  'Dic': { es: 'Dic', en: 'Dec', fr: 'Déc' },
};

export const formatDatesByLang = (
  lang: Language,
  start: string,
  end: string
): string => {
  const [sY, sM, sD] = start.split('-').map(Number);
  const [, eM, eD] = end.split('-').map(Number);
  const monthsES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  const mS_ES = monthsES[sM - 1];
  const mE_ES = monthsES[eM - 1];

  const sMonth = dateMonthsES[mS_ES]?.[lang] || mS_ES;
  const eMonth = dateMonthsES[mE_ES]?.[lang] || mE_ES;

  if (sM === eM) {
    if (lang === 'en') {
      return `${sMonth} ${sD} - ${eD}, ${sY}`;
    }
    const prep = t(lang, 'de');
    return `${sD} - ${eD} ${prep} ${sMonth} ${sY}`;
  } else {
    if (lang === 'en') {
      return `${sMonth} ${sD} - ${eMonth} ${eD}, ${sY}`;
    }
    const prep = t(lang, 'de');
    return `${sD} ${prep} ${sMonth} - ${eD} ${prep} ${eMonth} ${sY}`;
  }
};

export const getLocalizedDayLabel = (label: string, lang: Language): string => {
  if (lang === 'es') return label;
  
  const translationsMap: Record<string, Record<Language, string>> = {
    'miércoles': { es: 'Miércoles', en: 'Wednesday', fr: 'Mercredi' },
    'jueves': { es: 'Jueves', en: 'Thursday', fr: 'Jeudi' },
    'viernes': { es: 'Viernes', en: 'Friday', fr: 'Vendredi' },
    'sábado': { es: 'Sábado', en: 'Saturday', fr: 'Samedi' },
    'domingo': { es: 'Domingo', en: 'Sunday', fr: 'Dimanche' },
    'miercoles': { es: 'Miércoles', en: 'Wednesday', fr: 'Mercredi' },
    'sabado': { es: 'Sábado', en: 'Saturday', fr: 'Samedi' },
  };

  const lowerLabel = label.toLowerCase();
  for (const [key, val] of Object.entries(translationsMap)) {
    if (lowerLabel.startsWith(key)) {
      const remaining = label.substring(key.length);
      return `${val[lang]}${remaining}`;
    }
  }
  return label;
};
