import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readProjectFile = (filePath) => readFile(path.join(root, filePath), 'utf8');

test('el manifiesto PWA es válido y todos sus iconos existen', async () => {
  const manifest = JSON.parse(await readProjectFile('public/manifest.json'));

  assert.equal(manifest.name, 'AgendaFest - Portal de Conciertos');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);

  for (const icon of manifest.icons) {
    assert.ok(icon.src, 'Cada icono debe declarar src');
    assert.ok(icon.sizes, `El icono ${icon.src} debe declarar sizes`);
    accessSync(path.join(root, 'public', icon.src), constants.R_OK);
  }
});

test('el documento enlaza el manifiesto y registra el Service Worker una sola vez', async () => {
  const [html, main] = await Promise.all([
    readProjectFile('index.html'),
    readProjectFile('src/main.tsx'),
  ]);

  assert.match(html, /rel="manifest"\s+href="\.\/manifest\.json"/);
  assert.doesNotMatch(html, /serviceWorker\.register/);
  assert.equal((main.match(/serviceWorker\.register/g) || []).length, 1);
});

test('los recursos esenciales precargados por el Service Worker existen', async () => {
  const serviceWorker = await readProjectFile('public/sw.js');
  const precacheBlock = serviceWorker.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/);

  assert.ok(precacheBlock, 'No se encontró PRECACHE_ASSETS');
  const assets = [...precacheBlock[1].matchAll(/['"]\.\/([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter(Boolean);

  for (const asset of assets) {
    const sourcePath = asset === 'index.html'
      ? path.join(root, asset)
      : path.join(root, 'public', asset);
    accessSync(sourcePath, constants.R_OK);
  }
});
