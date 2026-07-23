/// <reference types="@capacitor/local-notifications" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agendafest.app',
  appName: 'AgendaFest',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      iconColor: '#ff003c',
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
};

export default config;
