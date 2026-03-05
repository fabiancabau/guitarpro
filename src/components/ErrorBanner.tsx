import type { ReaderEngineError } from '@domain/errors';

interface ErrorBannerProps {
  error: ReaderEngineError;
  onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  return (
    <section className="error-banner" role="alert" aria-live="assertive">
      <div className="error-banner__content">
        <strong>{error.code.replaceAll('_', ' ')}</strong>
        <p>{error.message}</p>
      </div>
      <button type="button" onClick={onDismiss} className="ghost-button">
        Dismiss
      </button>
    </section>
  );
}
