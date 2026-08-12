import { Game } from './game.models';
import {
  createShareText,
  dayDetails,
  evaluateGuess,
  normalizeGame,
  normalizeStats,
  serializeLegacyState,
  validationMessage,
} from './game.store';

const tile = (letter: string, evaluation: 'unknown' | 'absent' | 'present' | 'correct' = 'unknown') => ({
  letter,
  evaluation,
});

const gameWithRows = (rows: Game['rows'], status: Game['status'] = 'ongoing'): Game => ({
  status,
  word: 'DUSHI',
  rows: [
    ...rows,
    ...Array.from({ length: 6 - rows.length }, () => Array.from({ length: 5 }, () => tile(''))),
  ],
  nextDay: new Date(2030, 0, 2).valueOf(),
  wordIndex: 42,
});

describe('evaluateGuess', () => {
  it('marks letters in their exact position as correct', () => {
    expect(evaluateGuess('DUSHI', 'DUSHI')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('does not award the same solution letter twice', () => {
    expect(evaluateGuess('SISAS', 'KISAS')).toEqual([
      'absent',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('marks a valid letter in the wrong position as present', () => {
    expect(evaluateGuess('MAÑAN', 'ÑAMAR')).toEqual([
      'present',
      'correct',
      'present',
      'correct',
      'absent',
    ]);
  });
});

describe('production compatibility', () => {
  it('keeps February 2, 2022 as word zero and advances by local calendar day', () => {
    expect(dayDetails(new Date(2022, 1, 2, 12)).wordIndex).toBe(0);
    expect(dayDetails(new Date(2022, 1, 3, 12)).wordIndex).toBe(1);

    const daylightSavingDay = new Date(2024, 2, 31, 12);
    expect(dayDetails(daylightSavingDay).nextDay).toBe(new Date(2024, 3, 1).valueOf());
  });

  it('writes the established usersettings2 schema instead of a new versioned schema', () => {
    const game = gameWithRows([
      [tile('D', 'correct'), tile('U', 'present'), tile('S', 'absent'), tile('H', 'absent'), tile('I', 'absent')],
      [tile('P'), tile('A'), tile('T'), tile(''), tile('')],
    ]);
    const stored = serializeLegacyState({
      game,
      viewedInstructions: true,
      stats: { played: 4, won: 3, lost: 1, currentStreak: 2, maxStreak: 3, distribution: [1, 0, 2, 0, 0, 0] },
    });

    expect(stored).not.toHaveProperty('version');
    expect(stored.currentGame.gameStatus).toBe('ONGOING');
    expect(stored.currentGame.rows[0].status).toBe('CHECKED');
    expect(stored.currentGame.rows[0].tiles[0]).toEqual({
      letter: 'D',
      status: 'CHECKED',
      evaluation: 'CORRECT',
    });
    expect(stored.currentGame.rows[1].tiles[2].status).toBe('FILLED');
    expect(stored.user).toEqual({
      viewedInstructions: true,
      totalGamesPlayed: 4,
      totalGamesWon: 3,
      totalGamesLost: 1,
      currentStreak: 2,
      maxStreak: 3,
      finishedGames: [{ tries: 1, count: 1 }, { tries: 3, count: 2 }],
    });
  });

  it('reads an existing player save without changing game progress or statistics', () => {
    const game = gameWithRows([
      [tile('D', 'correct'), tile('U', 'present'), tile('S', 'absent'), tile('H', 'absent'), tile('I', 'absent')],
      [tile('P'), tile('A'), tile('T'), tile(''), tile('')],
    ]);
    const stats = { played: 9, won: 6, lost: 3, currentStreak: 2, maxStreak: 4, distribution: [1, 2, 0, 2, 1, 0] };
    const stored = serializeLegacyState({ game, stats, viewedInstructions: true });

    expect(normalizeGame(stored.currentGame)).toEqual(game);
    expect(normalizeStats(stored.user)).toEqual(stats);
  });

  it('keeps the exact public share format', () => {
    const game = gameWithRows(
      [[tile('D', 'correct'), tile('U', 'present'), tile('S', 'absent'), tile('H', 'absent'), tile('I', 'correct')]],
      'won',
    );
    expect(createShareText(game)).toBe('Papiamento Wordle\n1/6 43\n\n🟩🟨⬛⬛🟩\n');
  });

  it('keeps the original validation messages and duplicate rule', () => {
    const completed = [tile('P', 'absent'), tile('A', 'absent'), tile('T', 'absent'), tile('I', 'absent'), tile('N', 'absent')];
    const game = gameWithRows([completed]);

    expect(validationMessage(game, 1, 'GIAN')).toBe('No tin suficiente letter.');
    expect(validationMessage(game, 1, 'PATIN')).toBe("'PATIN' a wordo purba caba.");
    expect(validationMessage(game, 1, 'XXXXX')).toBe("'XXXXX' no ta un palabra den Papiamento.");
  });
});
