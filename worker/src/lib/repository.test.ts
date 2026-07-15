import { describe, expect, it, vi } from 'vitest';
import { createRepository } from './repository';
import type { Database } from './db';

const kickoffAt = '2026-07-10T20:00:00.000Z';
const beforeKickoff = new Date('2026-07-10T19:59:59.000Z').getTime();
const atKickoff = new Date(kickoffAt).getTime();
const afterKickoff = new Date('2026-07-10T20:00:01.000Z').getTime();

// Helper to mock db rows
const mockMatch = (overrides = {}) => ({
  id: 1,
  externalId: 'match-1',
  round: 'round_of_16',
  kickoffAt: new Date(kickoffAt),
  status: 'scheduled',
  homeTeamId: 'home',
  homeTeamName: 'Home',
  homeTeamLogoUrl: null,
  homeTeamColor: null,
  homeTeamPlaceholder: false,
  awayTeamId: 'away',
  awayTeamName: 'Away',
  awayTeamLogoUrl: null,
  awayTeamColor: null,
  awayTeamPlaceholder: false,
  homeScore: null,
  awayScore: null,
  winnerTeamId: null,
  updatedAt: new Date(),
  ...overrides,
});

describe('repository prediction windows and reveal rules', () => {
  const getMockDb = (mockMatchData: unknown) => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([mockMatchData]),
  } as unknown as Database);

  it('allows predictions before kickoff', async () => {
    const db = getMockDb(mockMatch());
    const repo = createRepository(db);

    const result = await repo.validatePredictionWindow('match-1', beforeKickoff);
    expect(result).toEqual({ ok: true });
  });

  it('blocks predictions at or after kickoff', async () => {
    const db = getMockDb(mockMatch());
    const repo = createRepository(db);

    const result = await repo.validatePredictionWindow('match-1', atKickoff);
    expect(result).toMatchObject({ ok: false });
  });

  it('blocks predictions when either team is a placeholder', async () => {
    const db = getMockDb(mockMatch({ homeTeamPlaceholder: true, homeTeamName: 'A definir' }));
    const repo = createRepository(db);

    const result = await repo.validatePredictionWindow('match-1', beforeKickoff);
    expect(result).toMatchObject({
      ok: false,
      error: 'Partida ainda não tem os times definidos.',
    });
  });

  it('blocks public prediction reveal before kickoff', async () => {
    const db = getMockDb(mockMatch());
    const repo = createRepository(db);

    const result = await repo.getPublicPredictionsForMatch('match-1', beforeKickoff);
    expect(result).toMatchObject({
      ok: false,
      error: 'Palpites serão revelados após o kickoff.',
      predictions: [],
    });
  });

  it('allows public prediction reveal after kickoff', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation((condition: unknown) => {
        // We know it's a match lookup if there is limit
        const c = condition as Record<string, unknown>;
        if (c?.table || c?.config || c?.left) {
           return {
              limit: vi.fn().mockResolvedValue([mockMatch()])
           }
        }

        return Promise.resolve([
          { participant: { displayName: 'Jane Doe', usernameNormalized: 'jane' }, prediction: { homeScore: 1, awayScore: 0, points: 0, updatedAt: new Date() } }
        ]);
      }),
      innerJoin: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockMatch()]),
    } as unknown as Database;

    // We modify the select chain so where() returns what we want
    mockDb.from = vi.fn().mockReturnValue({
       where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockMatch()])
       }),
       innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { participant: { displayName: 'Jane Doe', usernameNormalized: 'jane' }, prediction: { homeScore: 1, awayScore: 0, points: 0, updatedAt: new Date() } }
          ])
       })
    });

    const repo = createRepository(mockDb);

    const result = await repo.getPublicPredictionsForMatch('match-1', afterKickoff);
    expect(result).toMatchObject({
      ok: true,
      predictions: [{ displayName: 'Jane Doe', homeScore: 1, awayScore: 0 }],
    });
  });
});

describe('repository ranking', () => {
  it('breaks ties by oldest participant registration', async () => {
    const olderCreatedAt = new Date('2026-07-10T10:00:00.000Z');
    const newerCreatedAt = new Date('2026-07-10T11:00:00.000Z');

    const mockParticipants = [
      { id: 2, displayName: 'Newer User', usernameNormalized: 'newer', createdAt: newerCreatedAt },
      { id: 1, displayName: 'Older User', usernameNormalized: 'older', createdAt: olderCreatedAt },
    ];

    const finalMatch = mockMatch({ status: 'final', homeScore: 2, awayScore: 0 });
    const mockPredictionRows = [
      { prediction: { participantId: 1, matchId: 1, homeScore: 3, awayScore: 0, points: 0 }, match: finalMatch },
      { prediction: { participantId: 2, matchId: 1, homeScore: 2, awayScore: 1, points: 0 }, match: finalMatch },
    ];

    let callCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(mockParticipants);
          return {
            innerJoin: vi.fn().mockResolvedValue(mockPredictionRows),
          };
        }),
      })),
    } as unknown as Database;

    const repo = createRepository(mockDb);
    const ranking = await repo.getRanking();

    expect(ranking.map((entry) => entry.username)).toEqual(['older', 'newer']);
    expect(ranking.map((entry) => entry.points)).toEqual([1, 1]);
  });

  it('calculates ranking from current match scores instead of stale stored prediction points', async () => {
    const createdAt = new Date('2026-07-10T10:00:00.000Z');
    const mockParticipants = [{ id: 1, displayName: 'Jane Doe', usernameNormalized: 'jane', createdAt }];
    const finalMatch = mockMatch({ status: 'final', homeScore: 2, awayScore: 0 });
    const mockPredictionRows = [
      { prediction: { participantId: 1, matchId: 1, homeScore: 3, awayScore: 0, points: 0 }, match: finalMatch },
    ];

    let callCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(mockParticipants);
          return {
            innerJoin: vi.fn().mockResolvedValue(mockPredictionRows),
          };
        }),
      })),
    } as unknown as Database;

    const repo = createRepository(mockDb);
    const ranking = await repo.getRanking();

    expect(ranking[0]).toMatchObject({ username: 'jane', points: 1 });
  });
});
