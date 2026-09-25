import { formatClock, formatTuning, instrumentKind } from './instruments';

describe('instrumentKind', () => {
  it('detects kinds from names, percussion flags, and MIDI programs', () => {
    expect(instrumentKind({ id: '0', name: 'Drum Kit' })).toBe('drums');
    expect(instrumentKind({ id: '1', name: 'Track 2', isPercussion: true })).toBe('drums');
    expect(instrumentKind({ id: '2', name: 'Bass Guitar' })).toBe('bass');
    expect(instrumentKind({ id: '3', name: 'Low end', instrument: 'Program 33' })).toBe('bass');
    expect(instrumentKind({ id: '4', name: 'Josh Baines - Leads', instrument: 'Program 30' })).toBe('guitar');
    expect(instrumentKind({ id: '5', name: 'Track 6', instrument: 'Program 0' })).toBe('keys');
  });
});

describe('formatTuning', () => {
  it('converts MIDI tunings to low-to-high note names', () => {
    expect(formatTuning(['64', '59', '55', '50', '45', '40'])).toBe('E A D G B E');
    expect(formatTuning(['E', 'B', 'G', 'D', 'A', 'E'])).toBe('E A D G B E');
    expect(formatTuning([])).toBeNull();
  });
});

describe('formatClock', () => {
  it('formats milliseconds as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(125_400)).toBe('2:05');
    expect(formatClock(undefined)).toBe('--:--');
  });
});
