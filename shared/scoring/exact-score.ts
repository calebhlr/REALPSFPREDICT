export function scoreExactPrediction(args: {
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  officialHomeScore: number | null;
  officialAwayScore: number | null;
}): 0 | 1 | 3 {
  if (args.predictedHomeScore === null || args.predictedAwayScore === null) return 0;
  if (args.officialHomeScore === null || args.officialAwayScore === null) return 0;

  const correctTeamScores = [
    args.predictedHomeScore === args.officialHomeScore,
    args.predictedAwayScore === args.officialAwayScore,
  ].filter(Boolean).length;

  if (correctTeamScores === 2) return 3;
  if (correctTeamScores === 1) return 1;
  return 0;
}
