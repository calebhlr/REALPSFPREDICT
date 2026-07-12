import { describe, expect, it } from 'vitest';
import { buildScoreboardDateParams } from './espn';

describe('buildScoreboardDateParams', () => {
  it('splits a knockout range into daily ESPN scoreboard requests', () => {
    expect(buildScoreboardDateParams('20260710-20260712')).toEqual(['20260710', '20260711', '20260712']);
  });

  it('keeps non-range values unchanged', () => {
    expect(buildScoreboardDateParams('20260712')).toEqual(['20260712']);
  });
});
