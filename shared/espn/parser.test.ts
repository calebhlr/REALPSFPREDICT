import { describe, expect, it } from 'vitest';
import { normalizePlaceholderName, parseEspnScoreboardEvent } from './parser';
describe('normalizePlaceholderName', () => {
  it('marks placeholder teams parsed from ESPN labels', () => {
    expect(normalizePlaceholderName('Round of 16 3 Winner')).toEqual({
      name: 'Vencedor — Jogo 3',
      isPlaceholder: true,
    });
  });
});
describe('parseEspnScoreboard', () => {
  it('marks parsed placeholder competitors so predictions can be blocked', () => {
    const { match } = parseEspnScoreboardEvent({
      id: 'match-1',
      name: 'Quarterfinal',
      date: '2026-07-10T20:00:00.000Z',
      status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
      competitions: [{
        competitors: [
          { homeAway: 'home', score: '', team: { id: 'home', displayName: 'Round of 16 1 Winner' } },
          { homeAway: 'away', score: '', team: { id: 'away', displayName: 'Brazil', abbreviation: 'BRA' } },
        ],
      }],
    });
    expect(match).not.toBeNull();
    expect(match?.homeTeam).toMatchObject({ name: 'Vencedor — Jogo 1', isPlaceholder: true });
    expect(match?.awayTeam).toMatchObject({ name: 'Brazil', isPlaceholder: false });
  });

  it('keeps ESPN match events when the knockout round is only present in competition notes', () => {
    const { match } = parseEspnScoreboardEvent({
      id: '760513',
      name: 'Argentina v Switzerland',
      shortName: 'ARG v SUI',
      date: '2026-07-12T01:00Z',
      status: { type: { name: 'STATUS_SCHEDULED', state: 'pre' } },
      competitions: [{
        notes: [{ headline: 'FIFA World Cup, Quarterfinals' }],
        competitors: [
          { homeAway: 'home', score: '', team: { id: '202', displayName: 'Argentina', abbreviation: 'ARG' } },
          { homeAway: 'away', score: '', team: { id: '475', displayName: 'Switzerland', abbreviation: 'SUI' } },
        ],
      }],
    });

    expect(match).toMatchObject({
      externalId: '760513',
      round: 'quarterfinal',
      homeTeam: { name: 'Argentina', abbreviation: 'ARG', isPlaceholder: false },
      awayTeam: { name: 'Switzerland', abbreviation: 'SUI', isPlaceholder: false },
    });
  });
});
