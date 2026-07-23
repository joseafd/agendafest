import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('el paquete JavaScript inicial se mantiene por debajo de 250 KB', async () => {
  const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  const entryMatch = html.match(/<script[^>]+src="\.\/assets\/([^"]+\.js)"/);

  assert.ok(entryMatch, 'No se encontró el paquete JavaScript inicial en dist/index.html');

  const entryPath = path.join(root, 'dist/assets', entryMatch[1]);
  const entryStats = await stat(entryPath);

  assert.ok(
    entryStats.size < 250_000,
    `El paquete inicial ocupa ${entryStats.size} bytes; el máximo permitido es 250000`,
  );
});

test('la compilación contiene paquetes independientes para datos y pantallas', async () => {
  const files = await readdir(path.join(root, 'dist/assets'));
  const jsFiles = files.filter((file) => file.endsWith('.js'));

  assert.ok(jsFiles.length >= 4, `Se esperaban al menos 4 paquetes JavaScript y se encontraron ${jsFiles.length}`);
});
