# AgendaFest

AgendaFest es una PWA responsive para consultar festivales, line-ups y agendas, marcar artistas favoritos y recibir avisos. Está pensada para funcionar con conexión limitada y mantener una navegación coherente en ordenador y móvil.

## Requisitos

- Node.js 22 o posterior.
- npm.

## Preparación y verificación

```bash
npm ci
npm --prefix importador ci
npm run verify
```

La verificación ejecuta las pruebas de la PWA, arquitectura, interfaz e importador, además de compilar y comprobar el tamaño de los bundles.

## Desarrollo

```bash
npm run dev
```

El servidor mostrará la URL local de la aplicación.

## Datos y recursos

`AgendaFest.xlsx` es la fuente de verdad de festivales, ediciones, artistas, escenarios, actuaciones y firmas. Las imágenes originales se guardan en `Recursos/`.

Después de modificar el Excel o los recursos:

```bash
npm run sync-excel
npm run verify
```

El sincronizador regenera `src/data/festivalData.ts` y `src/data/artistSocialLinks.ts`, y copia las imágenes necesarias a `public/images/`. No se deben editar manualmente los archivos generados.

## AgendaFest Studio

El importador local se inicia con:

```bash
npm run import-ui
```

El servicio solo escucha en el equipo local. Su configuración privada reside en `importador/.env`, que nunca debe incorporarse a Git.

## Publicación

Cada cambio enviado a `main` activa `.github/workflows/deploy.yml`. El flujo instala las dependencias, audita producción, ejecuta la verificación completa y publica `dist/` en `gh-pages`.

No deben añadirse al repositorio `dist/`, `node_modules/`, archivos `.env`, copias de seguridad ni resultados fallidos de importación.

## Estado móvil

La capa de servicios y la configuración de Capacitor se conservan como base técnica. La generación y evolución de los proyectos nativos Android/iOS queda pospuesta hasta completar la estabilización funcional y visual de la aplicación web.
