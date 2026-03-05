import { ReaderEngineError } from '@domain/errors';

export const SUPPORTED_GUITAR_PRO_EXTENSIONS = new Set([
  '.gp',
  '.gpx',
  '.gp3',
  '.gp4',
  '.gp5',
  '.gp6',
  '.gp7',
  '.gp8'
]);

interface ValidationSuccess {
  ok: true;
  extension: string;
}

interface ValidationFailure {
  ok: false;
  error: ReaderEngineError;
}

export type FileValidationResult = ValidationSuccess | ValidationFailure;

export function getFileExtension(fileName: string): string {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf('.');

  if (dotIndex === -1 || dotIndex === trimmed.length - 1) {
    return '';
  }

  return trimmed.slice(dotIndex).toLowerCase();
}

export function validateGuitarProFile(file: Pick<File, 'name' | 'type'>): FileValidationResult {
  const extension = getFileExtension(file.name);

  if (!extension || !SUPPORTED_GUITAR_PRO_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: new ReaderEngineError(
        'UNSUPPORTED_FORMAT',
        'Unsupported file format. Please choose a Guitar Pro file (.gp, .gpx, .gp3 - .gp8).'
      )
    };
  }

  return { ok: true, extension };
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  try {
    return await file.arrayBuffer();
  } catch (error) {
    throw new ReaderEngineError('PARSE_FAILED', 'Unable to read this file from your device.', error);
  }
}
