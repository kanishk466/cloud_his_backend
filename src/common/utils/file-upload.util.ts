import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

const SIGNATURE_MIME_TYPES = new Map<string, string>([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/svg+xml', '.svg'],
]);

export const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024; // 2 MB

const SIGNATURE_DIR = join(process.cwd(), 'uploads', 'signatures');

export interface SavedFileResult {
  url: string;
  filename: string;
}

/**
 * Phase 2.2B — shared upload helper.
 *
 * Local-disk storage for now (`uploads/signatures/`, served at `/uploads/…`).
 * Swap this single file for S3/Cloudinary later — callers only see the URL.
 */
export function saveSignatureFile(
  doctorProfileId: string,
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  },
): SavedFileResult {
  if (!file) {
    throw new BadRequestException('No signature file uploaded');
  }

  const ext =
    SIGNATURE_MIME_TYPES.get(file.mimetype) ??
    (['.png', '.jpg', '.jpeg', '.svg'].includes(
      extname(file.originalname).toLowerCase(),
    )
      ? extname(file.originalname).toLowerCase()
      : null);

  if (!ext) {
    throw new BadRequestException(
      'Invalid file type. Only PNG, JPG and SVG images are allowed.',
    );
  }

  if (file.size > MAX_SIGNATURE_SIZE) {
    throw new BadRequestException(
      'Signature file too large. Max size is 2 MB.',
    );
  }

  if (!existsSync(SIGNATURE_DIR)) {
    mkdirSync(SIGNATURE_DIR, { recursive: true });
  }

  const filename = `${doctorProfileId}_${Date.now()}${ext}`;
  writeFileSync(join(SIGNATURE_DIR, filename), file.buffer);

  return { url: `/uploads/signatures/${filename}`, filename };
}

/** Deletes a previously stored signature file. Never throws. */
export function deleteSignatureFile(urlOrFilename: string | null | undefined) {
  if (!urlOrFilename) return;

  const filename = urlOrFilename.replace('/uploads/signatures/', '');
  // Guard against path traversal — only plain filenames inside SIGNATURE_DIR
  if (!filename || filename.includes('/') || filename.includes('..')) return;

  const fullPath = join(SIGNATURE_DIR, filename);
  try {
    if (existsSync(fullPath)) unlinkSync(fullPath);
  } catch {
    // best-effort cleanup; DB state is the source of truth
  }
}

// ─── PHASE 3.1: Panel document templates (PDF / image) ───────────────────────

const PANEL_TEMPLATE_MIME_TYPES = new Map<string, string>([
  ['application/pdf', '.pdf'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
]);

export const MAX_PANEL_TEMPLATE_SIZE = 10 * 1024 * 1024; // 10 MB

const PANEL_TEMPLATE_DIR = join(process.cwd(), 'uploads', 'panel-templates');

/** Saves a blank claim-document template (PDF/PNG/JPG) for a panel document. */
export function savePanelDocumentTemplate(
  panelDocumentId: string,
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  },
): SavedFileResult {
  if (!file) {
    throw new BadRequestException('No template file uploaded');
  }

  const ext =
    PANEL_TEMPLATE_MIME_TYPES.get(file.mimetype) ??
    (['.pdf', '.png', '.jpg', '.jpeg'].includes(
      extname(file.originalname).toLowerCase(),
    )
      ? extname(file.originalname).toLowerCase()
      : null);

  if (!ext) {
    throw new BadRequestException(
      'Invalid file type. Only PDF, PNG and JPG templates are allowed.',
    );
  }

  if (file.size > MAX_PANEL_TEMPLATE_SIZE) {
    throw new BadRequestException(
      'Template file too large. Max size is 10 MB.',
    );
  }

  if (!existsSync(PANEL_TEMPLATE_DIR)) {
    mkdirSync(PANEL_TEMPLATE_DIR, { recursive: true });
  }

  const filename = `${panelDocumentId}_${Date.now()}${ext}`;
  writeFileSync(join(PANEL_TEMPLATE_DIR, filename), file.buffer);

  return { url: `/uploads/panel-templates/${filename}`, filename };
}

/** Deletes a previously stored panel template file. Never throws. */
export function deletePanelDocumentTemplate(
  urlOrFilename: string | null | undefined,
) {
  if (!urlOrFilename) return;

  const filename = urlOrFilename.replace('/uploads/panel-templates/', '');
  if (!filename || filename.includes('/') || filename.includes('..')) return;

  const fullPath = join(PANEL_TEMPLATE_DIR, filename);
  try {
    if (existsSync(fullPath)) unlinkSync(fullPath);
  } catch {
    // best-effort cleanup
  }
}
