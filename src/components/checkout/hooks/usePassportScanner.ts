import { useState, useCallback, useRef, useEffect } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type { Passenger } from '@/lib/validations';
import { MOCK_PASSPORT_DATA } from '../constants';
import type { PassportScanResult } from '../types';

interface UsePassportScannerOptions {
  setValue?: UseFormSetValue<Passenger>;
  onScanComplete?: (data: PassportScanResult) => void;
  scanDuration?: number;
}

/**
 * Hook to simulate smart OCR passport scanning with realistic delay,
 * state indicators, form field population, and cleanup.
 */
export function usePassportScanner(options: UsePassportScannerOptions = {}) {
  const { setValue, onScanComplete, scanDuration = 1400 } = options;
  const [scanning, setScanning] = useState(false);
  const [passportScanned, setPassportScanned] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scanPassport = useCallback(
    (customData?: Partial<PassportScanResult>): Promise<PassportScanResult> => {
      setScanning(true);

      return new Promise((resolve) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          const scanResult: PassportScanResult = {
            ...MOCK_PASSPORT_DATA,
            ...customData,
          };

          if (setValue) {
            setValue('firstName', scanResult.firstName, { shouldValidate: true });
            setValue('lastName', scanResult.lastName, { shouldValidate: true });
            setValue('passportNo', scanResult.passportNo, { shouldValidate: true });
            setValue('birthDate', scanResult.birthDate, { shouldValidate: true });
            setValue('nationalId', scanResult.nationalId, { shouldValidate: true });
            setValue('gender', scanResult.gender, { shouldValidate: true });
          }

          onScanComplete?.(scanResult);
          setScanning(false);
          setPassportScanned(true);
          resolve(scanResult);
        }, scanDuration);
      });
    },
    [setValue, onScanComplete, scanDuration]
  );

  const resetScan = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setScanning(false);
    setPassportScanned(false);
  }, []);

  return {
    scanning,
    passportScanned,
    scanPassport,
    resetScan,
  };
}
