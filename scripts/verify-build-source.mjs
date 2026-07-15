/* global process */
import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'shared/scoring/exact-score.ts',
    mustInclude: [
      'const homeScoreMatches = args.predictedHomeScore === args.officialHomeScore;',
      'const awayScoreMatches = args.predictedAwayScore === args.officialAwayScore;',
      'if (homeScoreMatches && awayScoreMatches) return 3;',
    ],
    mustNotInclude: ['correctTeamScores', '.filter(Boolean).length'],
  },
  {
    file: 'web/src/components/MatchCard.tsx',
    mustInclude: [
      "import { isPlaceholderTeam, teamCode, teamEmoji } from '../lib/teams';",
      'type TeamBlockProps = {',
      'name: string;',
      'logoUrl: string | null;',
      "function TeamBlock(props: TeamBlockProps)",
    ],
    mustNotInclude: ['<TeamBlock name={match.homeTeam.name}', '<TeamBlock name={match.awayTeam.name}'],
  },
];

for (const check of checks) {
  const source = readFileSync(check.file, 'utf8');

  for (const expected of check.mustInclude) {
    if (!source.includes(expected)) {
      throw new Error(`${check.file} is missing expected build-safe source: ${expected}`);
    }
  }

  for (const forbidden of check.mustNotInclude) {
    if (source.includes(forbidden)) {
      throw new Error(`${check.file} still contains stale build-breaking source: ${forbidden}`);
    }
  }
}

process.stdout.write('Build source verification passed.\n');
