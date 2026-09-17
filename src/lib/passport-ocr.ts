import { parseIcaoMrzTd3 } from './ocr-country-validator';
import type { Worker } from 'tesseract.js';

export interface PassportOcrResult {
  firstName: string;
  lastName: string;
  passportNo: string;
  passportExpiryDate: string;
  birthDate: string;
  gender?: 'MALE' | 'FEMALE';
  issuingCountry: string;
  hasSixMonthsValidity: boolean;
}

/** Only OCR text with complete, checksummed TD3 lines can populate a passport. */
export function extractPassportFields(text: string): PassportOcrResult {
  const lines = text.toUpperCase().split(/\r?\n/)
    .map(line => line.replace(/\s/g, '').replace(/[«‹]/g, '<')).filter(Boolean);
  // ICAO Doc 9303 fixes the alphabet of every field. A glyph misread between
  // similar OCR-B characters is therefore resolved deterministically per field
  // (letter-only fields: 0->O; numeric fields: O->0) — never guessed freely.
  // Any resulting line must still pass every checksum, or the MRZ is rejected.
  const asLetterField = (value: string) => value.replace(/0/g, 'O');
  const asNumericField = (value: string) => value.replace(/O/g, '0');
  for (let i = 0; i < lines.length - 1; i++) {
    let first = lines[i];
    let second = lines[i + 1];
    if (!/^P[A-Z<][A-Z0<]{3}[A-Z<]{39}$/.test(first) || second.length !== 44) continue;
    first = `${first.slice(0, 2)}${asLetterField(first.slice(2, 5))}${first.slice(5)}`;
    second = second.slice(0, 9) + asNumericField(second[9])
      + asLetterField(second.slice(10, 13))
      + asNumericField(second.slice(13, 20))
      + second[20]
      + asNumericField(second.slice(21, 28))
      + second.slice(28, 42) + asNumericField(second.slice(42));
    const parsed = parseIcaoMrzTd3(first, second);
    // Expiry policy is separate from transcription: show a warning in review,
    // rather than preventing users from reading a genuine expired document.
    const transcriptionErrors = parsed.errors.filter(error => error !== 'Passport has less than 6 months validity from today.');
    if (transcriptionErrors.length || !parsed.surname || !parsed.givenNames || !parsed.passportNo
      || !/^[A-Z<]{3}$/.test(parsed.nationality) || !/^[MF<]$/.test(second[20])) continue;
    return {
      firstName: parsed.givenNames, lastName: parsed.surname, passportNo: parsed.passportNo,
      passportExpiryDate: parsed.expiryDate, birthDate: parsed.birthDate,
      issuingCountry: parsed.issuingCountry, hasSixMonthsValidity: parsed.hasSixMonthsValidity,
      ...(parsed.gender === 'OTHER' ? {} : { gender: parsed.gender }),
    };
  }
  throw new Error('MRZ_NOT_READABLE');
}

async function prepareImage(image: Blob | HTMLCanvasElement): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap | undefined;
  try {
    if (image instanceof Blob) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type) || image.size > 12 * 1024 * 1024 || !image.size) {
        throw new Error('INVALID_IMAGE');
      }
      bitmap = await createImageBitmap(image);
    }
    const source = bitmap || image as HTMLCanvasElement;
    if (!source.width || !source.height || source.width * source.height > 40_000_000) throw new Error('INVALID_IMAGE');
    const scale = Math.min(2, 2400 / source.width, 3200 / source.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(source.width * scale);
    canvas.height = Math.round(source.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('CANVAS_UNAVAILABLE');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap?.close();
  }
}

/** Local-only OCR: no image upload, raw-text logging or persistence. */
export async function scanPassportImage(
  image: Blob | HTMLCanvasElement,
  options: { signal?: AbortSignal; onProgress?: (progress: number) => void } = {},
): Promise<PassportOcrResult> {
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  let worker: Worker | undefined;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: () => void = () => {};
  const terminate = () => {
    const active = worker;
    worker = undefined;
    if (active) void active.terminate().catch(() => {});
  };
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => { stopped = true; terminate(); reject(new DOMException('Aborted', 'AbortError')); };
    options.signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => { stopped = true; terminate(); reject(new Error('OCR_TIMEOUT')); }, 90_000);
  });
  const work = async () => {
    const canvas = await prepareImage(image);
    const { createWorker, OEM, PSM } = await import('tesseract.js');
    if (stopped) throw new DOMException('Aborted', 'AbortError');
    const base = new URL('/ocr/', window.location.origin).href;
    const created = await createWorker('ocrb_int', OEM.LSTM_ONLY, {
      workerPath: `${base}worker.min.js`, corePath: `${base}core`, langPath: `${base}lang`,
      gzip: false, workerBlobURL: false,
      logger: event => { if (!stopped && event.status === 'recognizing text') options.onProgress?.(event.progress); },
    });
    worker = created;
    if (stopped) { terminate(); throw new DOMException('Aborted', 'AbortError'); }
    await created.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK, user_defined_dpi: '300',
    });
    const result = await created.recognize(canvas, { rotateAuto: true });
    try {
      return extractPassportFields(result.data.text);
    } catch {
      // The MRZ normally occupies the lower part of a passport. A second pass
      // isolates it from portraits and visual-zone labels; never repair digits.
      if (stopped) throw new DOMException('Aborted', 'AbortError');
      await created.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      const top = Math.floor(canvas.height * 0.55);
      const cropped = await created.recognize(canvas, {
        rectangle: { left: 0, top, width: canvas.width, height: canvas.height - top },
      });
      return extractPassportFields(cropped.data.text);
    }
  };
  try {
    return await Promise.race([work(), cancelled]);
  } finally {
    stopped = true;
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
    terminate();
  }
}
