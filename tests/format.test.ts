import { describe, expect, it } from 'vitest';
import { formatWithCommas, timeCruncher } from '../src/game/format';

describe('formatWithCommas', () => {
  it('formats like the original', () => {
    expect(formatWithCommas(0)).toBe('0');
    expect(formatWithCommas(999)).toBe('999');
    expect(formatWithCommas(1000)).toBe('1,000');
    expect(formatWithCommas(1234567.891, 2)).toBe('1,234,567.89');
    expect(formatWithCommas(5, 2)).toBe('5.00');
    expect(formatWithCommas(14.859, 2)).toBe('14.85'); // truncates, does not round
    expect(formatWithCommas(32.9, 0)).toBe('32');
  });
});

describe('timeCruncher', () => {
  it('formats ticks of 10ms', () => {
    expect(timeCruncher(100)).toBe('1 second');
    expect(timeCruncher(6100)).toBe('1 minute 1 second');
    expect(timeCruncher(372000)).toBe('1 hour 2 minutes ');
  });
});
