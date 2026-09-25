const partFiles = import.meta.glob<unknown>('../../song_data/*.json', { import: 'default' });

export async function loadBundledSongTracks(): Promise<unknown[]> {
  return Promise.all(
    Object.entries(partFiles)
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([, load]) => load())
  );
}
