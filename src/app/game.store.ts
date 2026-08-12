import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { validGuesses } from '../../validguesses';
import { words } from '../../words';
import {
  Evaluation,
  Game,
  GameState,
  LegacyStoredState,
  PlayerStats,
  Tile,
} from './game.models';
import { AnalyticsService } from './analytics.service';
import fx from 'fireworks';

const STORAGE_KEY = 'usersettings2';
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const REVEAL_DURATION_MS = 600;
const REVEAL_STAGGER_MS = 400;
const REVEAL_SETTLE_MS = 50;
const START_DATE = 'February 2, 2022 00:00:00';
const allowedWords = new Set([...words, ...validGuesses].map((word) => word.toUpperCase()));

const emptyStats = (): PlayerStats => ({
  played: 0,
  won: 0,
  lost: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: Array.from({ length: MAX_GUESSES }, () => 0),
});

export function dayDetails(now = new Date()): Pick<Game, 'word' | 'wordIndex' | 'nextDay'> {
  const start = new Date(START_DATE);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  let wordIndex = 0;
  while (start < today) {
    wordIndex += 1;
    start.setDate(start.getDate() + 1);
  }

  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 1);

  return {
    word: words[wordIndex % words.length].toUpperCase(),
    wordIndex,
    nextDay: nextDay.valueOf(),
  };
}

function createGame(): Game {
  return {
    status: 'ongoing',
    rows: Array.from({ length: MAX_GUESSES }, () =>
      Array.from({ length: WORD_LENGTH }, (): Tile => ({ letter: '', evaluation: 'unknown' })),
    ),
    ...dayDetails(),
  };
}

function normalizeEvaluation(value: unknown): Evaluation {
  const normalized = String(value).toLowerCase();
  return normalized === 'absent' || normalized === 'present' || normalized === 'correct'
    ? normalized
    : 'unknown';
}

export function normalizeGame(raw: unknown): Game | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (!Array.isArray(candidate['rows']) || typeof candidate['word'] !== 'string') return null;

  const rows = candidate['rows'].map((rawRow): Tile[] => {
    const row = rawRow as Record<string, unknown>;
    const rawTiles = Array.isArray(rawRow) ? rawRow : row['tiles'];
    if (!Array.isArray(rawTiles)) return [];
    return rawTiles.slice(0, WORD_LENGTH).map((rawTile) => {
      const tile = rawTile as Record<string, unknown>;
      return {
        letter: typeof tile['letter'] === 'string' ? tile['letter'].toUpperCase() : '',
        evaluation: normalizeEvaluation(tile['evaluation']),
      };
    });
  });

  if (rows.length !== MAX_GUESSES || rows.some((row) => row.length !== WORD_LENGTH)) return null;
  const statusValue = String(candidate['status'] ?? candidate['gameStatus']).toLowerCase();
  const status = statusValue === 'won' || statusValue === 'lost' ? statusValue : 'ongoing';

  return {
    status,
    word: candidate['word'].toUpperCase(),
    rows,
    nextDay: typeof candidate['nextDay'] === 'number' ? candidate['nextDay'] : dayDetails().nextDay,
    wordIndex: typeof candidate['wordIndex'] === 'number' ? candidate['wordIndex'] : dayDetails().wordIndex,
  };
}

export function normalizeStats(raw: unknown): PlayerStats {
  if (!raw || typeof raw !== 'object') return emptyStats();
  const stats = raw as Record<string, unknown>;
  const legacyFinished = Array.isArray(stats['finishedGames']) ? stats['finishedGames'] : [];
  const distribution = Array.isArray(stats['distribution'])
    ? stats['distribution'].slice(0, MAX_GUESSES).map((count) => Number(count) || 0)
    : Array.from({ length: MAX_GUESSES }, (_, index) => {
        const match = legacyFinished.find((entry) =>
          Number((entry as Record<string, unknown>)['tries']) === index + 1,
        ) as Record<string, unknown> | undefined;
        return Number(match?.['count']) || 0;
      });

  while (distribution.length < MAX_GUESSES) distribution.push(0);
  return {
    played: Number(stats['played'] ?? stats['totalGamesPlayed']) || 0,
    won: Number(stats['won'] ?? stats['totalGamesWon']) || 0,
    lost: Number(stats['lost'] ?? stats['totalGamesLost']) || 0,
    currentStreak: Number(stats['currentStreak']) || 0,
    maxStreak: Number(stats['maxStreak']) || 0,
    distribution,
  };
}

function loadState(): Pick<GameState, 'game' | 'stats' | 'viewedInstructions'> & { isNewGame: boolean } {
  const fallback = { game: createGame(), stats: emptyStats(), viewedInstructions: false };
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return { ...fallback, isNewGame: true };
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const legacyUser = parsed['user'] as Record<string, unknown> | undefined;
    const game = normalizeGame(parsed['game'] ?? parsed['currentGame'] ?? parsed['grid']);
    return {
      game: game ?? fallback.game,
      stats: normalizeStats(parsed['stats'] ?? legacyUser),
      viewedInstructions: Boolean(parsed['viewedInstructions'] ?? legacyUser?.['viewedInstructions']),
      isNewGame: game === null,
    };
  } catch {
    return { ...fallback, isNewGame: true };
  }
}

export function serializeLegacyState(
  state: Pick<GameState, 'game' | 'stats' | 'viewedInstructions'>,
): LegacyStoredState {
  const evaluation = (value: Evaluation): 'UNKNOWN' | 'ABSENT' | 'PRESENT' | 'CORRECT' =>
    value.toUpperCase() as 'UNKNOWN' | 'ABSENT' | 'PRESENT' | 'CORRECT';

  return {
    currentGame: {
      gameStatus: state.game.status.toUpperCase() as 'ONGOING' | 'WON' | 'LOST',
      word: state.game.word,
      rows: state.game.rows.map((row) => {
        const checked = row.every((tile) => tile.evaluation !== 'unknown');
        return {
          tiles: row.map((tile) => ({
            letter: tile.letter,
            status: tile.evaluation !== 'unknown' ? 'CHECKED' : tile.letter ? 'FILLED' : 'OPEN',
            evaluation: evaluation(tile.evaluation),
          })),
          status: checked ? 'CHECKED' : 'OPEN',
        };
      }),
      nextDay: state.game.nextDay,
      wordIndex: state.game.wordIndex,
    },
    user: {
      viewedInstructions: state.viewedInstructions,
      totalGamesPlayed: state.stats.played,
      totalGamesWon: state.stats.won,
      totalGamesLost: state.stats.lost,
      currentStreak: state.stats.currentStreak,
      maxStreak: state.stats.maxStreak,
      finishedGames: state.stats.distribution
        .map((count, index) => ({ tries: index + 1, count }))
        .filter(({ count }) => count > 0),
    },
  };
}

function persist(state: Pick<GameState, 'game' | 'stats' | 'viewedInstructions'>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeLegacyState(state)));
}

export function evaluateGuess(guess: string, solution: string): Evaluation[] {
  const result: Evaluation[] = Array.from({ length: WORD_LENGTH }, () => 'absent');
  const available = solution.split('');

  guess.split('').forEach((letter, index) => {
    if (letter === solution[index]) {
      result[index] = 'correct';
      available[index] = '';
    }
  });
  guess.split('').forEach((letter, index) => {
    if (result[index] === 'correct') return;
    const match = available.indexOf(letter);
    if (match >= 0) {
      result[index] = 'present';
      available[match] = '';
    }
  });
  return result;
}

function cloneGame(game: Game): Game {
  return { ...game, rows: game.rows.map((row) => row.map((tile) => ({ ...tile }))) };
}

function cloneRows(rows: Tile[][]): Tile[][] {
  return rows.map((row) => row.map((tile) => ({ ...tile })));
}

export function validationMessage(game: Game, rowIndex: number, guess: string): string | null {
  if (guess.length !== WORD_LENGTH) return 'No tin suficiente letter.';
  if (
    game.rows
      .slice(0, rowIndex)
      .some(
        (previous) =>
          previous.some((tile) => tile.evaluation !== 'unknown') &&
          previous.map((tile) => tile.letter).join('') === guess,
      )
  ) {
    return `'${guess}' a wordo purba caba.`;
  }
  if (!allowedWords.has(guess)) return `'${guess}' no ta un palabra den Papiamento.`;
  return null;
}

export function createShareText(game: Game): string {
  const score = game.status === 'won'
    ? game.rows.filter((row) => row.some((tile) => tile.evaluation !== 'unknown')).length.toString()
    : '-';
  let result = `Papiamento Wordle\n${score}/${MAX_GUESSES} ${game.wordIndex + 1}\n\n`;
  game.rows
    .filter((row) => row.some((tile) => tile.evaluation !== 'unknown'))
    .forEach((row) => {
      result += row
        .map((tile) => ({ absent: '⬛', present: '🟨', correct: '🟩', unknown: '' })[tile.evaluation])
        .join('');
      result += '\n';
    });
  return result;
}

function startFireworks(times: number): void {
  for (let burst = 0; burst < times; burst += 1) {
    window.setTimeout(() => {
      for (let index = 0; index <= 5; index += 1) {
        fx({
          x: Math.floor(Math.random() * (window.innerWidth / 2)) + window.innerWidth / 4,
          y:
            Math.floor(Math.random() * (window.innerHeight / 2)) +
            window.innerHeight / 4 -
            250,
          particleTimeout: 4000 + Math.floor(Math.random() * 3000),
          colors: index % 2 === 0 ? ['#538d3e', '#b59f3b'] : ['red'],
        });
      }
    }, burst * 1500);
  }
}

let messageTimer: ReturnType<typeof setTimeout> | undefined;
let animationTimer: ReturnType<typeof setTimeout> | undefined;
let previewTimer: ReturnType<typeof setTimeout> | undefined;
const revealTimers: ReturnType<typeof setTimeout>[] = [];

const initialState: GameState = {
  game: createGame(),
  stats: emptyStats(),
  viewedInstructions: false,
  modal: null,
  message: '',
  busy: false,
  submittedRow: null,
  previewRows: null,
  revealedTiles: 0,
};

export const GameStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    activeRowIndex: computed(() =>
      store.game().rows.findIndex((row) => row.every((tile) => tile.evaluation === 'unknown')),
    ),
    guessesUsed: computed(() =>
      store.game().rows.filter((row) => row.some((tile) => tile.evaluation !== 'unknown')).length,
    ),
    displayRows: computed(() => store.previewRows() ?? store.game().rows),
    keyboardEvaluations: computed(() => {
      const priority: Record<Evaluation, number> = { unknown: 0, absent: 1, present: 2, correct: 3 };
      const evaluations = new Map<string, Evaluation>();
      store.game().rows.forEach((row, rowIndex) => {
        if (store.submittedRow() === rowIndex) return;
        row.forEach((tile) => {
          const current = evaluations.get(tile.letter) ?? 'unknown';
          if (tile.letter && priority[tile.evaluation] > priority[current]) {
            evaluations.set(tile.letter, tile.evaluation);
          }
        });
      });
      return evaluations;
    }),
    shareText: computed(() => {
      return createShareText(store.game());
    }),
  })),
  withMethods((store) => {
    const analytics = inject(AnalyticsService);
    const save = (): void =>
      persist({
        game: store.game(),
        stats: store.stats(),
        viewedInstructions: store.viewedInstructions(),
      });

    const notify = (message: string, duration = 2600): void => {
      if (messageTimer) clearTimeout(messageTimer);
      patchState(store, { message });
      if (duration > 0) {
        messageTimer = setTimeout(() => patchState(store, { message: '' }), duration);
      }
    };

    const finishGame = (game: Game, stats: PlayerStats): { game: Game; stats: PlayerStats } => {
      if (game.status !== 'ongoing') return { game, stats };
      const won = game.rows.some((row) => row.every((tile) => tile.evaluation === 'correct'));
      const lost = !won && game.rows.every((row) => row.every((tile) => tile.evaluation !== 'unknown'));
      if (!won && !lost) return { game, stats };

      const guesses = game.rows.filter((row) => row.some((tile) => tile.evaluation !== 'unknown')).length;
      const distribution = [...stats.distribution];
      if (won) distribution[guesses - 1] += 1;
      const currentStreak = won ? stats.currentStreak + 1 : 0;
      const finishedGame: Game = { ...game, status: won ? 'won' : 'lost' };
      const finishedStats: PlayerStats = {
        ...stats,
        played: stats.played + 1,
        won: stats.won + Number(won),
        lost: stats.lost + Number(lost),
        currentStreak,
        maxStreak: Math.max(stats.maxStreak, currentStreak),
        distribution,
      };
      analytics.trackEvent('level_end', { level_name: game.word, success: won });
      analytics.trackEvent('post_score', { score: finishedStats.played, level: finishedStats.won });
      if (won) startFireworks(3);
      if (lost) notify(`'${game.word}'`, 10_000);
      return { game: finishedGame, stats: finishedStats };
    };

    const performInitialize = (liveRollover: boolean): void => {
      const loaded = loadState();
      const today = dayDetails();
      let stats = loaded.stats;
      let game = loaded.game;
      let isNewGame = loaded.isNewGame;

        if (game.nextDay - Date.now() < 0) {
        if (liveRollover && game.status === 'ongoing') notify('Times up!');
        if (game.status === 'ongoing') {
          game = { ...game, status: 'lost' };
          stats = {
            ...stats,
            played: stats.played + 1,
            lost: stats.lost + 1,
            currentStreak: 0,
          };
          analytics.trackEvent('level_end', { level_name: game.word, success: false });
          analytics.trackEvent('post_score', { score: stats.played, level: stats.won });
        } else if (today.wordIndex - game.wordIndex >= 2) {
          stats = { ...stats, currentStreak: 0 };
        }
        game = createGame();
        isNewGame = true;
      } else {
        ({ game, stats } = finishGame(game, stats));
      }

      // The production app records the intro as viewed as soon as it opens.
      const viewedInstructions = true;
      patchState(store, {
        game,
        stats,
        viewedInstructions,
        modal: loaded.viewedInstructions ? (game.status === 'ongoing' ? null : 'stats') : 'help',
        busy: false,
        submittedRow: null,
        previewRows: null,
        revealedTiles: 0,
      });
      save();
      if (isNewGame) analytics.trackEvent('level_start', { level_name: game.word });
      if (liveRollover) startFireworks(1);
    };

    const reveal = (
      rowIndex: number,
      finalRow: Tile[],
      easterEgg?: { letters: string[]; evaluations: Evaluation[] },
      after?: () => void,
    ): void => {
      revealTimers.splice(0).forEach((timer) => clearTimeout(timer));
      finalRow.forEach((tile, tileIndex) => {
        const timer = setTimeout(() => {
          const previewRows = cloneRows(store.previewRows() ?? store.game().rows);
          previewRows[rowIndex][tileIndex] = easterEgg
            ? { letter: easterEgg.letters[tileIndex], evaluation: easterEgg.evaluations[tileIndex] }
            : { ...tile };
          patchState(store, { previewRows, revealedTiles: tileIndex + 1 });
        }, tileIndex * REVEAL_STAGGER_MS);
        revealTimers.push(timer);
      });
      if (animationTimer) clearTimeout(animationTimer);
      const revealTime =
        REVEAL_STAGGER_MS * (WORD_LENGTH - 1) + REVEAL_DURATION_MS + REVEAL_SETTLE_MS;
      animationTimer = setTimeout(() => after?.(), revealTime);
    };

    return {
      initialize(): void {
        performInitialize(false);
      },

      rollover(): void {
        performInitialize(true);
      },

      input(rawKey: string): void {
        if (store.busy() || store.game().status !== 'ongoing') return;
        const key = rawKey.toUpperCase();
        const game = cloneGame(store.game());
        const rowIndex = store.activeRowIndex();
        if (rowIndex < 0) return;
        const row = game.rows[rowIndex];

        if (key === 'BACKSPACE') {
          let index = -1;
          for (let cursor = row.length - 1; cursor >= 0; cursor -= 1) {
            if (row[cursor].letter) {
              index = cursor;
              break;
            }
          }
          if (index >= 0) row[index] = { letter: '', evaluation: 'unknown' };
          patchState(store, { game });
          save();
          return;
        }

        if (key !== 'ENTER') {
          if (!/^[A-ZÑ]$/.test(key)) return;
          const index = row.findIndex((tile) => tile.letter === '');
          if (index >= 0) row[index] = { letter: key, evaluation: 'unknown' };
          patchState(store, { game });
          save();
          return;
        }

        const guess = row.map((tile) => tile.letter).join('');
        if (guess === 'GIAN') {
          patchState(store, {
            busy: true,
            submittedRow: rowIndex,
            previewRows: cloneRows(game.rows),
            revealedTiles: 0,
          });
          reveal(
            rowIndex,
            row,
            {
              letters: ['T', 'A', 'G', 'A', 'Y'],
              evaluations: ['present', 'present', 'correct', 'correct', 'correct'],
            },
            () => {
              patchState(store, { busy: false, submittedRow: null });
              notify('lmaoo 😂', 3000);
              if (previewTimer) clearTimeout(previewTimer);
              previewTimer = setTimeout(() => patchState(store, { previewRows: null, revealedTiles: 0 }), 3000);
              startFireworks(5);
            },
          );
        }
        const invalidMessage = validationMessage(game, rowIndex, guess);
        if (invalidMessage) {
          notify(invalidMessage);
          return;
        }

        const evaluations = evaluateGuess(guess, game.word);
        analytics.trackEvent('select_content', {
          content_type: 'word',
          item_id: guess,
        });
        const previewRows = cloneRows(game.rows);
        game.rows[rowIndex] = row.map((tile, index) => ({ ...tile, evaluation: evaluations[index] }));
        const finalRow = game.rows[rowIndex];
        patchState(store, {
          game,
          busy: true,
          submittedRow: rowIndex,
          previewRows,
          revealedTiles: 0,
        });
        save();
        const patin = guess === 'PATIN';
        reveal(
          rowIndex,
          finalRow,
          patin
            ? {
                letters: ['✊', '🍆', '💦', '💦', '😂'],
                evaluations: ['correct', 'correct', 'correct', 'correct', 'correct'],
              }
            : undefined,
          () => {
            const finished = finishGame(store.game(), store.stats());
            const didFinish = finished.game.status !== 'ongoing';
            patchState(store, {
              game: finished.game,
              stats: finished.stats,
              busy: false,
              submittedRow: null,
              previewRows: patin ? store.previewRows() : null,
              revealedTiles: patin ? WORD_LENGTH : 0,
              modal: didFinish ? 'stats' : null,
            });
            save();
            if (patin) {
              notify('ayy 😂', 3000);
              if (previewTimer) clearTimeout(previewTimer);
              previewTimer = setTimeout(() => patchState(store, { previewRows: null, revealedTiles: 0 }), 3000);
            }
          },
        );
      },

      openModal(modal: 'help' | 'stats'): void {
        patchState(store, { modal });
      },

      closeModal(): void {
        patchState(store, { modal: null });
        if (!store.viewedInstructions()) {
          patchState(store, { viewedInstructions: true });
          save();
        }
      },

      notify,
    };
  }),
  withHooks({
    onInit(store) {
      store.initialize();
    },
  }),
);
