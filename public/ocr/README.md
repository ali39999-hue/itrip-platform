# Local passport OCR assets

These files are served by Firuzo itself; document pixels and extracted text are
not transmitted to an OCR service. The OCR-B model reads the ICAO
Latin MRZ alphabet on international passports.

- `worker.min.js`: tesseract.js 7.0.0, copied from npm `dist/worker.min.js`.
- `core/*`: tesseract.js-core LSTM WebAssembly JS bundles from the installed
  dependency. Includes scalar, SIMD and relaxed-SIMD variants selected by worker.
  Embedded WASM bundles do not require separate `.wasm` files.
- `lang/ocrb_int.traineddata`: OCR-B integer LSTM model, fine-tuned from
  tessdata_best/eng by Shreeshrii. Source: https://github.com/Shreeshrii/tessdata_ocrb
  SHA256: 814f0d862538249d4122db8d41807b08fd7c31181455df7f596a2ed5ce4434ee
  Upstream provides no separate license declaration; verify redistribution terms
  before public distribution. The Apache notice for the base tessdata is included.
- License notices for the engine and base tessdata are included alongside assets.

Keep these assets in deployment `public/`. Do not change the npm worker version
without copying its matching worker and core bundles. Camera use requires HTTPS
(or localhost). JPEG, PNG and WebP are accepted; HEIC/PDF and national-ID OCR are
not currently supported. The user must review the extracted data before applying
it. A checksum is a transcription check, not document authenticity verification.
