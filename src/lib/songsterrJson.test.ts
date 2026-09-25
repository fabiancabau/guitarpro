import { parseSongsterrJson } from './songsterrJson';
import cleanLead from '../../song_data/0.json';
import lead from '../../song_data/1.json';
import cleanRhythm from '../../song_data/2.json';
import rhythm from '../../song_data/3.json';
import distortedLead from '../../song_data/4.json';
import bass from '../../song_data/5.json';
import drums from '../../song_data/6.json';

const parts = [cleanLead, lead, cleanRhythm, rhythm, distortedLead, bass, drums];

describe('Song JSON score parser', () => {
  it('builds a playable score with the original bars and tracks', () => {
    const score = parseSongsterrJson(parts, { title: 'Silhouette', artist: 'Malevolence' });

    expect(score.title).toBe('Silhouette');
    expect(score.tempo).toBe(110);
    expect(score.masterBars).toHaveLength(118);
    expect(score.masterBars[82].start).toBe(82 * 3840);
    expect(score.masterBars[117].start).toBe(117 * 3840);
    expect(score.tracks).toHaveLength(7);
    expect(score.tracks[1].name).toBe('Josh Baines - Leads');
    expect(score.tracks[1].staves[0].tuning).toEqual([61, 56, 52, 47, 42, 35]);
    expect(score.masterBars[82].section?.text).toBe('Solo');

    const soloBeat = score.tracks[1].staves[0].bars[82].voices[0].beats[0];
    expect(soloBeat.notes[0].fret).toBe(15);
    expect(soloBeat.notes[0].string).toBe(5);
    expect(soloBeat.notes[0].bendPoints?.some((point) => point.value === 4)).toBe(true);

    const triplet = score.tracks[1].staves[0].bars[85].voices[0].beats[1];
    expect(triplet.tupletNumerator).toBe(3);
    expect(triplet.tupletDenominator).toBe(2);

    const drumBeat = score.tracks[6].staves[0].bars[82].voices[0].beats[0];
    expect(score.tracks[6].isPercussion).toBe(true);
    expect(drumBeat.notes.map((note) => note.percussionArticulation)).toEqual([49, 57, 36]);
    expect(score.tracks[1].staves[0].bars[40].voices[0].beats[0].automations[0]?.value).toBe(30);
  });

  it('rejects a mix of different song revisions', () => {
    const wrongRevision = { ...lead, revisionId: lead.revisionId + 1 };
    expect(() => parseSongsterrJson([cleanLead, wrongRevision])).toThrow(/same song revision/i);
  });
});
