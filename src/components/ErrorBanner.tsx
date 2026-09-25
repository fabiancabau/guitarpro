import type { ReaderEngineError } from '@domain/errors';
import { CloseIcon } from './Icons';

interface ErrorBannerProps {
  error: ReaderEngineError;
  onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  return (
    <section className="error-banner" role="alert" aria-live="assertive">
      <span className="error-banner__dot" aria-hidden="true" />
      <div className="error-banner__content">
        <strong>{error.code.replaceAll('_', ' ').toLowerCase()}</strong>
        <p>{error.message}</p>
      </div>
      <button type="button" onClick={onDismiss} className="icon-button" aria-label="Dismiss">
        <CloseIcon size={16} />
      </button>
    </section>
  );
}
