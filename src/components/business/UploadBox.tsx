'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { UploadCloud, FileCheck2, AlertTriangle, Loader2 } from 'lucide-react';

export type UploadState = 'empty' | 'uploading' | 'done' | 'rejected';

interface UploadBoxProps {
  docType: string;
  state: UploadState;
  file?: string | null;
  /** دلیل رد شدن — فقط در حالت rejected */
  rejectReason?: string | null;
  accept?: string;
  onFileSelected: (file: File) => void;
  onRetry?: () => void;
}

/**
 * UploadBox — بارگذاری مدرک با چهار حالت سند:
 * خالی، در حال آپلود، بارگذاری‌شده، رد شده با دلیل.
 * input[type=file] واقعی با کلاس fz-sr داخل label — قابل کیبورد و screen reader.
 */
export function UploadBox({
  docType,
  state,
  file,
  rejectReason,
  accept = '.jpg,.jpeg,.png,.pdf',
  onFileSelected,
  onRetry,
}: UploadBoxProps) {
  const t = useTranslations('Business.upload');
  const inputRef = useRef<HTMLInputElement>(null);

  const cls =
    state === 'done'
      ? 'fz-upload is-done'
      : state === 'rejected'
        ? 'fz-upload is-rejected'
        : 'fz-upload';

  const isBusy = state === 'uploading';
  const isDone = state === 'done';
  const isRejected = state === 'rejected';

  return (
    <div className="fz-field">
      <label className={cls}>
        <input
          ref={inputRef}
          type="file"
          className="fz-sr"
          accept={accept}
          aria-label={t('fileAria')}
          disabled={isBusy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelected(f);
            e.target.value = '';
          }}
        />
        {isBusy && (
          <>
            <Loader2 size={28} className="animate-spin" aria-hidden="true" style={{ color: 'var(--fz-brand)' }} />
            <span className="fz-strong">{t('uploading')}</span>
          </>
        )}
        {isDone && (
          <>
            <FileCheck2 size={28} aria-hidden="true" style={{ color: 'var(--fz-brand)' }} />
            <span className="fz-strong">{file || t('uploaded')}</span>
            <span className="fz-faint">{t('replaceHint')}</span>
          </>
        )}
        {isRejected && (
          <>
            <AlertTriangle size={28} aria-hidden="true" style={{ color: 'var(--fz-warn-ink)' }} />
            <span className="fz-strong">{file || t('rejectedTitle')}</span>
            {rejectReason && <span className="fz-faint" style={{ color: 'var(--fz-warn-ink)' }}>{rejectReason}</span>}
            {onRetry && (
              <button
                type="button"
                className="fz-btn fz-btn--sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRetry();
                }}
              >
                {t('retry')}
              </button>
            )}
          </>
        )}
        {state === 'empty' && (
          <>
            <UploadCloud size={28} aria-hidden="true" style={{ color: 'var(--fz-brand)' }} />
            <span className="fz-strong">{t('chooseFile')}</span>
            <span className="fz-faint">{t('formatHint')}</span>
          </>
        )}
      </label>
      <span className="fz-sr" data-doc-type={docType} aria-hidden="true" />
    </div>
  );
}
