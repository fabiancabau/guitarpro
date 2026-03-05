import type { ScoreSession } from '@domain/types';

interface SessionMetadataProps {
  session: ScoreSession | null;
  fileName: string | null;
}

export function SessionMetadata({ session, fileName }: SessionMetadataProps) {
  if (!session) {
    return null;
  }

  return (
    <section className="session-metadata" aria-label="Loaded tab metadata">
      <p>
        <strong>File:</strong> {fileName ?? 'Unknown'}
      </p>
      <p>
        <strong>Bars:</strong> {session.length.bars}
      </p>
      <p>
        <strong>Tracks:</strong> {session.tracks.length}
      </p>
      <p>
        <strong>Tempo:</strong> {session.meta.tempo ?? 'n/a'}
      </p>
    </section>
  );
}
