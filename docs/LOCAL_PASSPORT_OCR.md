# Local passport OCR — implementation and verification

## Delivered

- Tesseract.js 7.0.0, lazy-loaded only when an image is selected or captured.
- Real gallery input and camera-to-canvas capture in the existing checkout modal.
- Same-origin worker, WebAssembly bundles and OCR-B model in `public/ocr`.
- No document upload, raw document logging or storage by the OCR engine.
- Strict TD3 length, alphabet, dates and checksum validation. O/0 normalization
  is restricted to fixed-alphabet fields; alphanumeric passport numbers and
  optional data are preserved. Low-quality/invalid scans are rejected.
- Review with explicit confirmation before fields are applied. KYC remains.
- Cancellation aborts recognition and discards late results; camera tracks stop
  on capture, cancellation and close. Recognition has a 90-second deadline.

## Verified on 2026-09-17

- 72 focused unit/component tests passed (including camera lifecycle via mocks).
- Six Playwright tests passed on the actual checkout page: fa/en, desktop
  Chromium/mobile Chromium/mobile Safari (WebKit). They use a fixed fictional MRZ PNG,
  pass it through
  the real OCR worker, verify fields remain empty before confirmation, and
  verify names and passport number after confirmation. Network requests during
  recognition are restricted to same-origin GET/HEAD, with no upload allowed.
- TypeScript and targeted ESLint passed; full lint passed.
- UI-only test fixture does not authenticate a server session or create bookings.

## Limits / deployment requirements

- Clear JPEG/PNG/WebP, at most 12 MB, up to 40 megapixels. Include both bottom MRZ
  lines, keep them horizontal and avoid glare. No PDF/HEIC/national-ID OCR yet.
- OCR is transcription, not proof of identity/document authenticity. Users must
  verify results. Short-expiry passports are read with a separate warning.
- Camera requires HTTPS or localhost and browser permission. Physical phone
  cameras and arbitrary real-world passport images have not been exhaustively
  tested. WebKit verification uses the same fixed PNG as Chromium; it is not a
  guarantee for all real-world photos or physical iPhones.
- Model century inference is inherently ambiguous; review birth dates carefully.
- Ship `public/ocr` with the deployment. Approximately 13 MB of bundled assets;
  a browser downloads only its selected core variant plus the 1.45 MB model.
- OCR-B upstream has no separate explicit license statement. Confirm model
  redistribution terms before public release; provenance/hash in public/ocr/README.md.
- Other existing repository failures (including tour reservation lifecycle tests)
  are not fixed or hidden by this OCR change.
