import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'src');
const storageService = path.join(sourceRoot, 'services', 'storage.ts');
const platformService = path.join(sourceRoot, 'services', 'platform.ts');

const listSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  }));

  return nestedFiles.flat();
};

test('solo el servicio de almacenamiento accede directamente a localStorage', async () => {
  const sourceFiles = await listSourceFiles(sourceRoot);
  const violations = [];

  for (const filePath of sourceFiles) {
    if (filePath === storageService) continue;
    const source = await readFile(filePath, 'utf8');
    if (/\b(?:window\.)?localStorage\.(?:getItem|setItem|removeItem|clear)\b/.test(source)) {
      violations.push(path.relative(root, filePath));
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Accesos directos fuera del servicio: ${violations.join(', ')}`
  );
});

test('solo el servicio de plataforma usa APIs dependientes del dispositivo', async () => {
  const sourceFiles = await listSourceFiles(sourceRoot);
  const violations = [];
  const directPlatformApis = [
    /\bnavigator\.(?:share|clipboard)\b/,
    /\bNotification\.(?:permission|requestPermission)\b/,
    /\bnew\s+Notification\b/,
    /\bwindow\.open\s*\(/,
    /\bwindow\.location\.(?:assign|replace)\s*\(/,
    /\bwindow\.location\.href\s*=/,
  ];

  for (const filePath of sourceFiles) {
    if (filePath === platformService) continue;
    const source = await readFile(filePath, 'utf8');
    if (directPlatformApis.some((pattern) => pattern.test(source))) {
      violations.push(path.relative(root, filePath));
    }
  }

  assert.deepEqual(
    violations,
    [],
    `APIs de plataforma usadas fuera del servicio: ${violations.join(', ')}`
  );
});
