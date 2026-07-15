import { parseEspnScoreboard } from '../../../shared/espn/parser';
import type { MatchSnapshot } from '../../../shared/types/domain';
import type { Env } from './env';

const ESPN_REQUEST_HEADERS = { accept: 'application/json' };
const ESPN_SCOREBOARD_LIMIT = '100';
const MAX_DAILY_SCOREBOARD_REQUESTS = 60;

export async function fetchKnockoutMatches(env: Env) {
  const matchesById = new Map<string, MatchSnapshot>();

  const payloads = await Promise.all(
    buildScoreboardDateParams(env.ESPN_KNOCKOUT_DATES).map((dateParam) => fetchScoreboard(env.ESPN_SCOREBOARD_URL, dateParam)),
  );

  for (const payload of payloads) {
    for (const match of parseEspnScoreboard(payload)) {
      matchesById.set(match.externalId, match);
    }
  }

  return Array.from(matchesById.values()).sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
}

export function buildScoreboardDateParams(rawDates: string) {
  const normalized = rawDates.trim();
  const range = normalized.match(/^(\d{8})-(\d{8})$/);
  if (!range) return [normalized];

  const start = parseEspnDate(range[1]);
  const end = parseEspnDate(range[2]);
  if (!start || !end || start.getTime() > end.getTime()) return [normalized];

  const params: string[] = [];
  for (const cursor = new Date(start); cursor.getTime() <= end.getTime() && params.length < MAX_DAILY_SCOREBOARD_REQUESTS; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    params.push(formatEspnDate(cursor));
  }

  return params.length > 0 ? params : [normalized];
}

async function fetchScoreboard(baseUrl: string, dates: string) {
  const url = new URL(baseUrl);
  url.searchParams.set('dates', dates);
  url.searchParams.set('limit', ESPN_SCOREBOARD_LIMIT);
  url.searchParams.set('lang', 'pt');
  url.searchParams.set('region', 'br');

  const response = await fetch(url, { headers: ESPN_REQUEST_HEADERS });
  if (!response.ok) throw new Error(`ESPN sync failed for dates=${dates} with status ${response.status}`);

  return response.json();
}

function parseEspnDate(value: string) {
  const year = Number(value.slice(0, 4));
  const monthIndex = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) return null;
  return new Date(Date.UTC(year, monthIndex, day));
}

function formatEspnDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}
