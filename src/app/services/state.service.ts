import { Injectable } from '@angular/core';
import { GameStatus, Grid } from '../interfaces/state';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  localStorageKey: string = 'usersettings2';
  private state!: SettingsState;

  constructor() {
    this.getOrCreateState();
  }

  getLatestState(): SettingsState {
    return this.state;
  }

  getCurrentGame(): Grid | undefined {
    return this.state.grid;
  }

  getViewedInstructions(): boolean {
    return this.state.user.viewedInstructions;
  }

  setViewedInstructions(): void {
    this.state.user.viewedInstructions = true;
    this.saveSettingsToStorage();
  }

  save(grid: Grid): void {
    this.state.grid = grid;
    this.state.currentGame = grid;
    this.saveSettingsToStorage();
  }

  updateGameStats(gameStatus: GameStatus, tries: number): void {
    this.state.user.totalGamesPlayed++;

    if (this.state.user.finishedGames === undefined) {
      this.state.user.finishedGames = [];
    }

    if (gameStatus === GameStatus.WON) {
      this.state.user.totalGamesWon++;

      if (this.state.user.currentStreak === undefined) {
        this.state.user.currentStreak = 0;
      }

      if (this.state.user.currentStreakWordIndex === undefined) {
        this.state.user.currentStreakWordIndex = 0;
      }

      this.state.user.currentStreak++;
      this.state.user.currentStreakWordIndex = this.state.grid?.wordIndex ?? 0;

      if (this.state.user.maxStreak === undefined) {
        this.state.user.maxStreak = 0;
      }

      if (this.state.user.maxStreak < this.state.user.currentStreak) {
        this.state.user.maxStreak = this.state.user.currentStreak;
      }

      let finished = this.state.user.finishedGames.find(
        (x) => x.tries === tries
      );
      if (finished) {
        finished.count++;
      } else {
        this.state.user.finishedGames.push({
          tries: tries,
          count: 1,
        });
      }
    } else if (gameStatus === GameStatus.LOST) {
      this.state.user.totalGamesLost++;
      this.state.user.currentStreak = 0;
    }
    this.saveSettingsToStorage();
  }

  getOrCreateState(): SettingsState {
    var settings = localStorage.getItem(this.localStorageKey);

    if (settings === undefined || settings === null) {
      this.createDefaultSettings();
    } else {
      try {
        this.state = JSON.parse(settings);
      } catch {
        this.createDefaultSettings();
      }
    }

    return this.state;
  }

  private createDefaultSettings(): void {
    this.state = {
      grid: undefined,
      currentGame: undefined,
      user: {
        viewedInstructions: false,
        totalGamesLost: 0,
        totalGamesPlayed: 0,
        totalGamesWon: 0,
        currentStreak: 0,
        currentStreakWordIndex: 0,
        maxStreak: 0,
        lastSaved: 0,
        finishedGames: [],
      },
    };

    this.saveSettingsToStorage();
  }

  private saveSettingsToStorage(): void {
    this.state.user.lastSaved = new Date().valueOf();
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.state));
  }
}

export interface SettingsState {
  grid: Grid | undefined; // deprecated
  currentGame: Grid | undefined;
  user: UserSettings;
}

export interface UserSettings {
  viewedInstructions: boolean;
  totalGamesPlayed: number;
  totalGamesWon: number;
  totalGamesLost: number;
  currentStreak: number;
  currentStreakWordIndex: number;
  maxStreak: number;
  lastSaved: number;
  finishedGames: FinishedGame[];
}

export interface FinishedGame {
  tries: number;
  count: number;
}
