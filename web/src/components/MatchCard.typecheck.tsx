import type { MatchSnapshot } from '../../../shared/types/domain';
import { MatchCard } from './MatchCard';

const placeholderTeam: MatchSnapshot['homeTeam'] = {
  id: 'placeholder',
  name: 'Placeholder',
  abbreviation: null,
  logoUrl: null,
  color: null,
  isPlaceholder: true,
};

const match: MatchSnapshot = {
  externalId: 'typecheck-match',
  round: 'round_of_16',
  kickoffAt: '2026-07-12T00:00:00.000Z',
  status: 'scheduled',
  homeTeam: placeholderTeam,
  awayTeam: placeholderTeam,
  homeScore: null,
  awayScore: null,
  winnerTeamId: null,
};

<MatchCard
  match={match}
  draft={{ homeScore: '', awayScore: '' }}
  now={0}
  publicPredictions={{ predictions: [] }}
  isOpen={true}
  allMatches={[match]}
  onChange={() => undefined}
  onReveal={() => undefined}
/>;
