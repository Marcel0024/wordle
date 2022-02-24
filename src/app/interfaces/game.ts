import { Evaluation } from '../enums/evaluation';
import { GameStatus } from '../enums/gamestatus';

export interface GameEndResults {
  copyText: string;
  nextDay: number;
  gameStatus: GameStatus;
  totalGuesses: number;
}

export interface PlayerStats {
  totalGamesWon: number;
  totalGamesLost: number;
  totalGamesPlayed: number;
  wonsInTries: { tries: number; count: number }[];
  maxStreak: number;
  currentStreak: number;
}

export interface FoundLetter {
  letter: string;
  evaluation: Evaluation;
}
