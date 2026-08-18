const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const TEMP_ROOT = path.join(__dirname, 'temp', 'resources');
const RESOURCES_ROOT = path.join(PROJECT_ROOT, 'Recursos');

const MAX_RESOURCE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const MAX_SCHEDULE_BYTES = 12 * 1024 * 1024;
const MAX_SCHEDULE_FILES = 6;
const GEMINI_INLINE_IMAGE_BYTES = 13 * 1024 * 1024;
const SINGLETON_TYPES = new Set(['cartel', 'logo', 'mapa']);
const RESOURCE_TYPES = new Set([...SINGLETON_TYPES, 'horario']);

function assertImportId(importId) {
  if (!/^IMP-[A-Za-z0-9-]{8,80}$/.test(String(importId || ''))) {
    throw new Error('Identificador de importación no válido.');
  }
}

function normalizeResourceType(value) {
  const type = String(value || '').trim().toLowerCase();
  if (!RESOURCE_TYPES.has(type)) throw new Error('Tipo de recurso no permitido.');
  return type;
}

function detectImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (
    buffer.length >= 4 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff &&
    buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9
  ) {
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }
  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
    buffer.subarray(12, 16).toString('ascii') === 'IHDR' &&
    buffer.includes(Buffer.from('IEND'))
  ) {
    return { extension: 'png', mimeType: 'image/png' };
  }
  if (
    buffer.length >= 20 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP' &&
    buffer.readUInt32LE(4) + 8 <= buffer.length
  ) {
    return { extension: 'webp', mimeType: 'image/webp' };
  }
  return null;
}

function sanitizeOriginalName(value) {
  const decoded = [...String(value || 'imagen')]
    .filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('');
  return path.basename(decoded).slice(0, 120) || 'imagen';
}

function publicResource(resource) {
  return {
    id: resource.id,
    type: resource.type,
    originalName: resource.originalName,
    mimeType: resource.mimeType,
    size: resource.size,
    sha256: resource.sha256,
    plannedName: resource.plannedName || ''
  };
}

function removeFileQuietly(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function storeTemporaryResource({ importId, type, originalName, declaredMimeType, buffer, existingResources = [] }) {
  assertImportId(importId);
  const normalizedType = normalizeResourceType(type);
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('El archivo está vacío.');
  if (buffer.length > MAX_RESOURCE_BYTES) throw new Error('El archivo supera el máximo de 8 MB.');

  const detected = detectImage(buffer);
  if (!detected) throw new Error('El archivo no es una imagen JPEG, PNG o WebP válida.');
  const declared = String(declaredMimeType || '').split(';')[0].trim().toLowerCase();
  if (declared && declared !== 'application/octet-stream' && declared !== detected.mimeType) {
    throw new Error('El tipo declarado no coincide con el contenido real de la imagen.');
  }

  const resourcesToKeep = SINGLETON_TYPES.has(normalizedType)
    ? existingResources.filter(resource => resource.type !== normalizedType)
    : [...existingResources];
  if (normalizedType === 'horario' && resourcesToKeep.filter(resource => resource.type === 'horario').length >= MAX_SCHEDULE_FILES) {
    throw new Error(`Solo se permiten ${MAX_SCHEDULE_FILES} imágenes de horarios.`);
  }
  const prospectiveBytes = resourcesToKeep.reduce((total, resource) => total + resource.size, 0) + buffer.length;
  if (prospectiveBytes > MAX_TOTAL_BYTES) throw new Error('Los recursos superan el máximo total de 30 MB.');
  const prospectiveScheduleBytes = resourcesToKeep
    .filter(resource => resource.type === 'horario')
    .reduce((total, resource) => total + resource.size, 0) + (normalizedType === 'horario' ? buffer.length : 0);
  if (prospectiveScheduleBytes > MAX_SCHEDULE_BYTES) {
    throw new Error('Las imágenes de horarios superan el máximo conjunto de 12 MB.');
  }

  const importDir = path.join(TEMP_ROOT, importId);
  fs.mkdirSync(importDir, { recursive: true, mode: 0o700 });
  const id = crypto.randomBytes(12).toString('hex');
  const tempPath = path.join(importDir, `${normalizedType}-${id}.${detected.extension}`);
  fs.writeFileSync(tempPath, buffer, { flag: 'wx', mode: 0o600 });

  if (SINGLETON_TYPES.has(normalizedType)) {
    existingResources.filter(resource => resource.type === normalizedType).forEach(resource => removeFileQuietly(resource.tempPath));
  }
  const resource = {
    id,
    type: normalizedType,
    originalName: sanitizeOriginalName(originalName),
    mimeType: detected.mimeType,
    extension: detected.extension,
    size: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    tempPath
  };
  return [...resourcesToKeep, resource];
}

function compactFestivalId(edition) {
  const compact = String(edition?.festivalId || edition?.id || edition?.name || 'festival')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 60);
  return compact || 'festival';
}

function assignPlannedNames(resources, edition) {
  const base = `${compactFestivalId(edition)}${Number(edition?.year) || new Date().getFullYear()}`;
  const schedules = resources.filter(resource => resource.type === 'horario');
  let scheduleIndex = 0;
  return resources.map(resource => {
    let plannedName;
    if (resource.type === 'horario') {
      scheduleIndex++;
      const suffix = schedules.length > 1 ? `-${String(scheduleIndex).padStart(2, '0')}` : '';
      plannedName = `horarios${base}${suffix}.${resource.extension}`;
    } else {
      plannedName = `${resource.type}${base}.${resource.extension}`;
    }
    return { ...resource, plannedName };
  });
}

function applyResourceNamesToEdition(edition, resources) {
  const planned = assignPlannedNames(resources, edition);
  for (const type of SINGLETON_TYPES) {
    const resource = planned.find(item => item.type === type);
    if (resource) edition[type] = resource.plannedName;
  }
  edition.horarios = planned.filter(item => item.type === 'horario').map(item => item.plannedName);
  return planned;
}

function mergeScheduleImages(resources, websiteImages = []) {
  const merged = [];
  let totalBytes = 0;
  for (const resource of resources.filter(item => item.type === 'horario')) {
    const buffer = fs.readFileSync(resource.tempPath);
    if (totalBytes + buffer.length > GEMINI_INLINE_IMAGE_BYTES) break;
    totalBytes += buffer.length;
    merged.push({
      url: `recurso-local://${resource.originalName}`,
      mimeType: resource.mimeType,
      data: buffer.toString('base64'),
      source: 'uploaded-schedule'
    });
  }
  for (const image of websiteImages) {
    if (!image.data) {
      merged.push(image);
      continue;
    }
    const bytes = Math.ceil(image.data.length * 3 / 4);
    if (totalBytes + bytes > GEMINI_INLINE_IMAGE_BYTES) continue;
    totalBytes += bytes;
    merged.push(image);
  }
  return merged;
}

function commitTemporaryResources(resources, edition) {
  const planned = assignPlannedNames(resources, edition);
  fs.mkdirSync(RESOURCES_ROOT, { recursive: true });
  const operations = [];
  try {
    for (const resource of planned) {
      const destination = path.join(RESOURCES_ROOT, resource.plannedName);
      const backupPath = fs.existsSync(destination)
        ? `${destination}.upload-backup-${crypto.randomBytes(6).toString('hex')}`
        : '';
      if (backupPath) fs.copyFileSync(destination, backupPath);
      const incoming = `${destination}.uploading-${crypto.randomBytes(6).toString('hex')}`;
      operations.push({ destination, backupPath, incoming, created: !backupPath });
      try {
        fs.copyFileSync(resource.tempPath, incoming);
        fs.copyFileSync(incoming, destination);
      } finally {
        removeFileQuietly(incoming);
      }
    }
    return { planned, operations };
  } catch (error) {
    rollbackResourceCommit({ operations });
    throw error;
  }
}

function rollbackResourceCommit(handle) {
  for (const operation of [...(handle?.operations || [])].reverse()) {
    try {
      if (operation.backupPath && fs.existsSync(operation.backupPath)) {
        fs.copyFileSync(operation.backupPath, operation.destination);
        fs.unlinkSync(operation.backupPath);
      } else if (operation.created) {
        removeFileQuietly(operation.destination);
      }
    } catch {}
    removeFileQuietly(operation.incoming);
  }
}

function cleanupImportResources(importId, resources = []) {
  resources.forEach(resource => removeFileQuietly(resource.tempPath));
  if (!importId) return;
  try {
    const importDir = path.join(TEMP_ROOT, importId);
    if (fs.existsSync(importDir)) fs.rmSync(importDir, { recursive: true, force: true });
  } catch {}
}

function finalizeResourceCommit(handle, importId, resources) {
  for (const operation of handle?.operations || []) removeFileQuietly(operation.backupPath);
  cleanupImportResources(importId, resources);
}

module.exports = {
  MAX_RESOURCE_BYTES,
  MAX_TOTAL_BYTES,
  MAX_SCHEDULE_BYTES,
  MAX_SCHEDULE_FILES,
  normalizeResourceType,
  detectImage,
  publicResource,
  storeTemporaryResource,
  assignPlannedNames,
  applyResourceNamesToEdition,
  mergeScheduleImages,
  commitTemporaryResources,
  rollbackResourceCommit,
  finalizeResourceCommit,
  cleanupImportResources
};
