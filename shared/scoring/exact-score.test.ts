import { describe, expect, it } from 'vitest';
import { scoreExactPrediction } from './exact-score';

describe('scoreExactPrediction', () => {
  it('returns 1 for an exact score prediction', () => {
    expect(scoreExactPrediction({
      predictedHomeScore: 2,
      predictedAwayScore: 1,
      officialHomeScore: 2,
      officialAwayScore: 1,
    })).toBe(1);
  });

  it('returns 1 for a France 3 x 0 Morocco prediction when the official score is 2 x 0', () => {
    expect(scoreExactPrediction({
      predictedHomeScore: 3,
      predictedAwayScore: 0,
      officialHomeScore: 2,
      officialAwayScore: 0,
    })).toBe(1);
  });

  it('returns 1 for a France 3 x 0 Morocco prediction when the official score is 2 x 0', () => {
    expect(scoreExactPrediction({
      predictedHomeScore: 3,
      predictedAwayScore: 0,
      officialHomeScore: 2,
      officialAwayScore: 0,
    })).toBe(1);
  });

  it('returns 1 for a France 3 x 0 Morocco prediction when the official score is 2 x 0', () => {
    expect(scoreExactPrediction({
      predictedHomeScore: 3,
      predictedAwayScore: 0,
      officialHomeScore: 2,
      officialAwayScore: 0,
    })).toBe(1);
  });

  it('returns 0 when no team score matches', () => {
    expect(scoreExactPrediction({
      predictedHomeScore: 2,
      predictedAwayScore: 0,
      officialHomeScore: 2,
      officialAwayScore: 1,
    })).toBe(0);
  });
});
