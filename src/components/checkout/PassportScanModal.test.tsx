// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PassportScanModal } from './PassportScanModal';
import { getMyKyc } from '@/actions/auth';
import { scanPassportImage, type PassportOcrResult } from '@/lib/passport-ocr';

vi.mock('@/lib/passport-ocr', () => ({ scanPassportImage: vi.fn() }));
const scanImage = vi.mocked(scanPassportImage);
const extracted: PassportOcrResult = {
  firstName: 'SARA', lastName: 'TEST', passportNo: 'P1234567',
  passportExpiryDate: '2030-05-20', birthDate: '1990-04-12',
  gender: 'FEMALE', issuingCountry: 'UTO', hasSixMonthsValidity: true,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function chooseFile() {
  const file = new File(['test image bytes'], 'passport.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Scan from Gallery / File'), { target: { files: [file] } });
  return file;
}

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
function mockCamera() {
  const getUserMedia = vi.fn<() => Promise<MediaStream>>();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  return { getUserMedia, stop, stream };
}

vi.mock('@/actions/auth', () => ({ getMyKyc: vi.fn() }));
const lookup = vi.mocked(getMyKyc);
const approved = {
  success: true,
  kyc: {
    firstNameFa: '', lastNameFa: '', firstNameEn: 'SARA', lastNameEn: 'TEST',
    passportNo: 'P1234567', passportExpiry: '2030-05-20', nationalId: '1234567890',
    kycApproved: true,
  },
};

function mount(locale = 'en') {
  const onScanSuccess = vi.fn();
  const onOpenChange = vi.fn();
  const view = (open: boolean) => (
    <NextIntlClientProvider locale={locale} messages={{}} timeZone="UTC">
      <PassportScanModal open={open} onOpenChange={onOpenChange} onScanSuccess={onScanSuccess} />
    </NextIntlClientProvider>
  );
  return { ...render(view(true)), view, onScanSuccess, onOpenChange };
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
});

describe('PassportScanModal safety', () => {
  it.each([
    ['fa', 'اسکن از روی تصویر گالری', 'اسکن زنده با دوربین'],
    ['en', 'Scan from Gallery / File', 'Live Camera Scan'],
    ['ar', 'المسح من المعرض / الملفات', 'المسح المباشر بالكاميرا'],
    ['zh', '从相册 / 文件扫描', '摄像头实时扫描'],
    ['ru', 'Сканирование из галереи / файла', 'Сканирование с камеры'],
  ])('offers local gallery and camera controls in %s without starting automatically', (locale, gallery, camera) => {
    const { getUserMedia } = mockCamera();
    const { onScanSuccess, onOpenChange } = mount(locale);
    for (const name of [gallery, camera]) {
      const button = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
      expect(button.classList.contains('min-h-[44px]')).toBe(true);
    }
    const input = screen.getByLabelText(gallery) as HTMLInputElement;
    expect(input.type).toBe('file');
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: gallery }));
    expect(click).toHaveBeenCalledOnce();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(scanImage).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
    expect(onScanSuccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('forwards the selected file, shows progress and requires explicit confirmation', async () => {
    const pending = deferred<PassportOcrResult>();
    scanImage.mockReturnValue(pending.promise);
    const { onScanSuccess, onOpenChange } = mount();
    const file = chooseFile();
    await waitFor(() => expect(scanImage).toHaveBeenCalledOnce());
    const [image, options] = scanImage.mock.calls[0];
    expect(image).toBe(file);
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(options?.signal?.aborted).toBe(false);
    act(() => options?.onProgress?.(0.42));
    expect(screen.getByRole('progressbar')).toHaveProperty('value', 42);
    expect(screen.getByRole('button', { name: /Autofill from Verified/ })).toHaveProperty('disabled', true);
    expect(onScanSuccess).not.toHaveBeenCalled();
    await act(async () => pending.resolve(extracted));
    expect(screen.getByText('Review extracted details')).toBeTruthy();
    for (const value of ['SARA', 'TEST', 'P1234567', '1990-04-12', '2030-05-20', 'UTO', 'Female']) {
      expect(screen.getByText(value)).toBeTruthy();
    }
    expect(onScanSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm details and autofill' }));
    expect(onScanSuccess).toHaveBeenCalledExactlyOnceWith({
      firstName: 'SARA', lastName: 'TEST', passportNo: 'P1234567',
      passportExpiryDate: '2030-05-20', birthDate: '1990-04-12', gender: 'FEMALE',
    });
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('discards review on cancel and permits manual or KYC entry without autofill', async () => {
    scanImage.mockResolvedValue({ ...extracted, hasSixMonthsValidity: false });
    const { onScanSuccess, onOpenChange } = mount();
    chooseFile();
    await screen.findByRole('button', { name: 'Confirm details and autofill' });
    expect(screen.getByRole('alert').textContent).toContain('under six months');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and go back' }));
    expect(screen.queryByText('P1234567')).toBeNull();
    expect(screen.getByRole('button', { name: /Autofill from Verified/ })).toHaveProperty('disabled', false);
    expect(onScanSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'close', 'reopen', 'unmount'] as const)('aborts OCR and ignores late progress/results after %s', async scenario => {
    const pending = deferred<PassportOcrResult>();
    scanImage.mockReturnValue(pending.promise);
    const { rerender, view, unmount, onScanSuccess } = mount();
    chooseFile();
    await waitFor(() => expect(scanImage).toHaveBeenCalledOnce());
    const options = scanImage.mock.calls[0][1];
    if (scenario === 'cancel') fireEvent.click(screen.getByRole('button', { name: 'Cancel and go back' }));
    else if (scenario === 'close') fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    else if (scenario === 'unmount') unmount();
    else { rerender(view(false)); rerender(view(true)); }
    expect(options?.signal?.aborted).toBe(true);
    await act(async () => { options?.onProgress?.(1); pending.resolve(extracted); });
    expect(onScanSuccess).not.toHaveBeenCalled();
    expect(screen.queryByText('Review extracted details')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ignores a cancelled scan rejection during a new scan', async () => {
    const stale = deferred<PassportOcrResult>();
    const current = deferred<PassportOcrResult>();
    scanImage.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise);
    const { onScanSuccess } = mount();
    chooseFile();
    await waitFor(() => expect(scanImage).toHaveBeenCalledTimes(1));
    const staleProgress = scanImage.mock.calls[0][1]?.onProgress;
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and go back' }));
    chooseFile();
    await waitFor(() => expect(scanImage).toHaveBeenCalledTimes(2));
    await act(async () => { staleProgress?.(1); stale.reject(new Error('private stale failure')); });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('progressbar')).toHaveProperty('value', 0);
    await act(async () => current.resolve(extracted));
    expect(screen.getByText('Review extracted details')).toBeTruthy();
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  it('shows a safe OCR error and allows retry without exposing engine details', async () => {
    scanImage.mockRejectedValueOnce(new Error('private passport details')).mockResolvedValueOnce(extracted);
    const { onScanSuccess } = mount();
    chooseFile();
    expect((await screen.findByRole('alert')).textContent).toContain('Could not read the passport');
    expect(screen.queryByText('private passport details')).toBeNull();
    expect(onScanSuccess).not.toHaveBeenCalled();
    chooseFile();
    await screen.findByRole('button', { name: 'Confirm details and autofill' });
    expect(scanImage).toHaveBeenCalledTimes(2);
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  it('captures the actual video frame into the canvas passed to OCR and releases tracks', async () => {
    const { getUserMedia, stream, stop } = mockCamera();
    getUserMedia.mockResolvedValue(stream);
    scanImage.mockResolvedValue(extracted);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const { onScanSuccess } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Live Camera Scan' }));
    const video = screen.getByLabelText('Passport camera preview') as HTMLVideoElement;
    expect(screen.getByRole('button', { name: 'Capture and read' })).toHaveProperty('disabled', true);
    await waitFor(() => expect(video.srcObject).toBe(stream));
    expect(getUserMedia).toHaveBeenCalledExactlyOnceWith({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    Object.defineProperties(video, { videoWidth: { value: 1280 }, videoHeight: { value: 720 } });
    fireEvent.loadedData(video);
    fireEvent.click(screen.getByRole('button', { name: 'Capture and read' }));
    await screen.findByRole('button', { name: 'Confirm details and autofill' });
    const canvas = scanImage.mock.calls[0][0] as HTMLCanvasElement;
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(video, 0, 0, 1280, 720);
    expect(stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'close', 'reopen', 'unmount'] as const)('releases an active camera after %s', async scenario => {
    const { getUserMedia, stream, stop } = mockCamera();
    getUserMedia.mockResolvedValue(stream);
    const { rerender, view, unmount, onScanSuccess } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Live Camera Scan' }));
    const video = screen.getByLabelText('Passport camera preview') as HTMLVideoElement;
    await waitFor(() => expect(video.srcObject).toBe(stream));
    if (scenario === 'cancel') fireEvent.click(screen.getByRole('button', { name: 'Cancel and go back' }));
    else if (scenario === 'close') fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    else if (scenario === 'unmount') unmount();
    else { rerender(view(false)); rerender(view(true)); }
    expect(stop).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText('Passport camera preview')).toBeNull();
    expect(scanImage).not.toHaveBeenCalled();
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'close', 'reopen', 'unmount'] as const)('stops a camera stream granted late after %s', async scenario => {
    const { getUserMedia, stream, stop } = mockCamera();
    const pending = deferred<MediaStream>();
    getUserMedia.mockReturnValue(pending.promise);
    const { rerender, view, unmount, onScanSuccess } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Live Camera Scan' }));
    if (scenario === 'cancel') fireEvent.click(screen.getByRole('button', { name: 'Cancel and go back' }));
    else if (scenario === 'close') fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    else if (scenario === 'unmount') unmount();
    else { rerender(view(false)); rerender(view(true)); }
    await act(async () => pending.resolve(stream));
    expect(stop).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText('Passport camera preview')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(scanImage).not.toHaveBeenCalled();
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  it('does not replace a new camera session with an older permission response', async () => {
    const { getUserMedia, stream, stop } = mockCamera();
    const stale = deferred<MediaStream>();
    const currentStop = vi.fn();
    const currentStream = { getTracks: () => [{ stop: currentStop }] } as unknown as MediaStream;
    getUserMedia.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(currentStream);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Live Camera Scan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and go back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Live Camera Scan' }));
    const video = screen.getByLabelText('Passport camera preview') as HTMLVideoElement;
    await waitFor(() => expect(video.srcObject).toBe(currentStream));
    await act(async () => stale.resolve(stream));
    expect(stop).toHaveBeenCalledOnce();
    expect(currentStop).not.toHaveBeenCalled();
    expect(video.srcObject).toBe(currentStream);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and go back' }));
    expect(currentStop).toHaveBeenCalledOnce();
  });

  it('handles camera denial with safe feedback and keeps gallery entry available', async () => {
    const { getUserMedia } = mockCamera();
    getUserMedia.mockRejectedValue(new Error('private device information'));
    const { onScanSuccess } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Live Camera Scan' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Camera unavailable');
    expect(screen.queryByText('private device information')).toBeNull();
    expect(screen.getByRole('button', { name: 'Scan from Gallery / File' })).toHaveProperty('disabled', false);
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  it('imports only returned approved KYC fields, never guessed birth date or gender', async () => {
    lookup.mockResolvedValue(approved);
    const { onScanSuccess, onOpenChange } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Autofill from Verified/ }));
    await waitFor(() => expect(onScanSuccess).toHaveBeenCalledExactlyOnceWith({
      firstName: 'SARA', lastName: 'TEST', passportNo: 'P1234567',
      passportExpiryDate: '2030-05-20', nationalId: '1234567890',
    }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('omits unavailable optional KYC fields rather than fabricating them', async () => {
    lookup.mockResolvedValue({ ...approved, kyc: { ...approved.kyc, passportExpiry: '', nationalId: '' } });
    const { onScanSuccess } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Autofill from Verified/ }));
    await waitFor(() => expect(onScanSuccess).toHaveBeenCalledExactlyOnceWith({
      firstName: 'SARA', lastName: 'TEST', passportNo: 'P1234567',
    }));
  });

  it.each(['firstNameEn', 'lastNameEn', 'passportNo'] as const)('rejects missing %s instead of supplying sample data', async (field) => {
    lookup.mockResolvedValue({ ...approved, kyc: { ...approved.kyc, [field]: ' ' } });
    const { onScanSuccess } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Autofill from Verified/ }));
    await screen.findByRole('alert');
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  it.each(['unmount', 'close', 'reopen', 'reject'] as const)('ignores stale KYC completion after %s', async (scenario) => {
    let resolve!: (value: Awaited<ReturnType<typeof getMyKyc>>) => void;
    let reject!: (reason: Error) => void;
    lookup.mockReturnValue(new Promise((yes, no) => { resolve = yes; reject = no; }));
    const { unmount, rerender, view, onScanSuccess, onOpenChange } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Autofill from Verified/ }));
    if (scenario === 'unmount') unmount();
    else if (scenario === 'close') fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    else { rerender(view(false)); rerender(view(true)); }
    onOpenChange.mockClear();
    await act(async () => {
      if (scenario === 'reject') reject(new Error('late failure'));
      else resolve(approved);
    });
    expect(onScanSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports retrieval errors without leaking provider details or blocking manual dismissal', async () => {
    lookup.mockRejectedValue(new Error('private error'));
    const { onScanSuccess, onOpenChange } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Autofill from Verified/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Error retrieving KYC details');
    expect(screen.queryByText('private error')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onScanSuccess).not.toHaveBeenCalled();
  });

  it('ends loading and allows another lookup after no approved passport is found', async () => {
    lookup.mockResolvedValue({ success: true, kyc: { ...approved.kyc, kycApproved: false } });
    const { onScanSuccess, onOpenChange } = mount();
    const button = screen.getByRole('button', { name: /Autofill from Verified/ }) as HTMLButtonElement;
    fireEvent.click(button);
    expect(button.disabled).toBe(true);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent',
      'Complete approved passport details were not found in your account. Enter details manually or complete your KYC profile.');
    expect(button.disabled).toBe(false);
    expect(onScanSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(lookup).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(button.disabled).toBe(false));
  });
});
