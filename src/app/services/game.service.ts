import { EventEmitter, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  delay,
  filter,
  flatMap,
  interval,
  map,
  mergeAll,
  of,
  Subscription,
  take,
  takeUntil,
  tap,
  toArray,
} from 'rxjs';
import { validGuesses } from 'validguesses';
import { words as WORDS } from 'words';
import {
  Evaluation,
  GameStatus,
  Grid,
  Row,
  Status,
  Tile,
} from '../interfaces/state';
import { SettingsState, StateService } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  grid!: Grid;

  wordsLength = 5;
  tries = 6;

  nextDay: number = 0;

  gameStatus$ = new EventEmitter<SettingsState>();
  foundLetters$ = new EventEmitter<FoundLetter[]>();

  interval$: Subscription | undefined;

  constructor(
    private readonly stateService: StateService,
    private readonly snackBar: MatSnackBar
  ) {
    this.interval$ = interval(1000)
      .pipe(
        filter(() => this.grid?.nextDay - new Date().valueOf() < 0),
        tap(() => this.init())
      )
      .subscribe();
  }

  init(): void {
    let stateGrid = this.stateService.getGrid();

    if (stateGrid) {
      // firsttime
      this.grid = stateGrid;

      if (this.grid.nextDay - new Date().valueOf() < 0) {
        if (this.grid.gameStatus === GameStatus.ONGOING) {
          this.finishGame(GameStatus.LOST);
        }
        this.createNewGame();
      }
    } else {
      this.createNewGame();
    }
    this.broadcastFoundLetters();
    this.gameStatus$.emit(this.stateService.getLatestState());
  }

  createNewGame() {
    const todays = this.getTodaysWord();
    this.grid = {
      gameStatus: GameStatus.ONGOING,
      rows: [],
      word: todays.word,
      nextDay: todays.nextDay,
      wordIndex: todays.wordIndex,
    };

    for (let indexRow = 0; indexRow < this.tries; indexRow++) {
      const row = { tiles: [] as Tile[], status: Status.OPEN };

      for (let tileRow = 0; tileRow < this.wordsLength; tileRow++) {
        let tile: Tile = {
          letter: '',
          status: Status.OPEN,
          evaluation: Evaluation.UNKNOWN,
        };
        row.tiles.push(tile);
      }

      this.grid.rows.push(row);
    }
    this.stateService.updateGrid(this.grid);
  }

  getTodaysWord(): { word: string; nextDay: number; wordIndex: number } {
    const epochMs = new Date(`February 2, 2022 00:00:00`).valueOf();
    const now = Date.now();
    const msInDay = 86400000;
    const index = Math.floor((now - epochMs) / msInDay);
    const nextDay = (index + 1) * msInDay + epochMs;
    return {
      word: WORDS[index % WORDS.length].toUpperCase(),
      nextDay: nextDay,
      wordIndex: index,
    };
  }

  typeLetter(letter: string) {
    let row = this.getOpenRow();

    if (!row) {
      return; // Game is over
    }

    let tile = row.tiles.filter((r) => r.status === Status.OPEN)[0];

    if (!tile) {
      return;
    }

    if (this.grid.gameStatus !== GameStatus.ONGOING) {
      return;
    }

    tile.letter = letter;
    tile.status = Status.FILLED;
    tile.evaluation = Evaluation.UNKNOWN;

    this.stateService.updateGrid(this.grid);
  }

  backspace(): void {
    let row = this.getOpenRow();

    if (!row) {
      return; // Game is over
    }

    let previousTile = row.tiles
      .filter((r) => r.status === Status.FILLED)
      .slice(-1)[0];

    if (!previousTile) {
      return;
    }

    previousTile.letter = '';
    previousTile.status = Status.OPEN;
    previousTile.evaluation = Evaluation.UNKNOWN;

    this.stateService.updateGrid(this.grid);
  }

  enter(): void {
    let row = this.getOpenRow();

    if (!row) {
      return; // Game is over
    }

    const guessWord = row.tiles.map((x) => x.letter).join('');
    const solutionWord = this.getSolutionWord();

    if (!this.canEnterWord(row, guessWord)) {
      return;
    }

    const evaluations = this.getEvaluations(guessWord, solutionWord);

    interval(300) // interval for animation
      .pipe(
        take(this.tries - 1),
        map((index) => (row.tiles[index].evaluation = evaluations[index])), // set the evaluation
        toArray(),
        tap(() => (row.status = Status.COMPLETED)),
        delay(500),
        tap(() => this.broadcastFoundLetters()), // update keyboard
        tap(() => this.finishGameIfNecessary()) // if finish display popup
      )
      .subscribe(() => this.stateService.updateGrid(this.grid)); // save
  }

  getEvaluations(guess: string, solution: string): Evaluation[] {
    const splitSolution = solution.split('');
    const splitGuess = guess.split('');

    const statuses: Evaluation[] = Array.from(Array(guess.length));
    const solutionCharsTaken = statuses.map(() => false);

    splitGuess.forEach((letter, index) => {
      if (letter === splitSolution[index]) {
        statuses[index] = Evaluation.CORRECT;
        solutionCharsTaken[index] = true;
      }
    });

    splitGuess.forEach((letter, i) => {
      if (statuses[i]) return;

      if (!splitSolution.includes(letter)) {
        // handles the absent case
        statuses[i] = Evaluation.ABSENT;
        return;
      }

      // now we are left with "present"s
      const indexOfPresentChar = splitSolution.findIndex(
        (x, index) => x === letter && !solutionCharsTaken[index]
      );

      if (indexOfPresentChar > -1) {
        statuses[i] = Evaluation.PRESENT;
        solutionCharsTaken[indexOfPresentChar] = true;
        return;
      } else {
        statuses[i] = Evaluation.ABSENT;
        return;
      }
    });

    return statuses;
  }

  finishGameIfNecessary(): boolean {
    if (
      this.grid.rows.some((x) =>
        x.tiles.every((x) => x.evaluation === Evaluation.CORRECT)
      )
    ) {
      this.finishGame(GameStatus.WON);
      return true;
    } else if (this.grid.rows.every((x) => x.status === Status.COMPLETED)) {
      this.snackBar.open(`'${this.grid?.word}'`, undefined, {
        duration: 5000,
      });
      this.finishGame(GameStatus.LOST);
      return true;
    }

    return false;
  }

  canEnterWord(currentRow: Row, guessWord: string): boolean {
    if (!currentRow.tiles.every((x) => x.status === Status.FILLED)) {
      return false;
    }

    if (
      this.grid.rows
        .filter((r) => r.status === Status.COMPLETED)
        .some((r) => r.tiles.map((t) => t.letter).join('') === guessWord)
    ) {
      this.snackBar.open(`'${guessWord}' a wordo purba caba.`);
      return false;
    }

    if (!WORDS.includes(guessWord) && !validGuesses.includes(guessWord)) {
      this.snackBar.open(`'${guessWord}' no ta un palabra den Papiamento.`);
      return false;
    }

    return true;
  }

  finishGame(gameStatus: GameStatus): void {
    this.grid.gameStatus = gameStatus;
    this.stateService.updateGrid(this.grid);
    this.stateService.updateGameStats(gameStatus, this.getTotalGuesses());
    this.gameStatus$.emit(this.stateService.getLatestState());
  }

  getTotalGuesses(): number {
    return this.grid.rows.filter((x) => x.status === Status.COMPLETED).length;
  }

  broadcastFoundLetters(): void {
    const foundLetters: FoundLetter[] = [];

    this.grid.rows.forEach((row) =>
      row.tiles.map((t) => {
        let foundLetter = foundLetters.find((x) => x.letter === t.letter);

        if (foundLetter) {
          if (
            foundLetter.evaluation === Evaluation.ABSENT ||
            (foundLetter.evaluation === Evaluation.PRESENT &&
              t.evaluation === Evaluation.CORRECT)
          ) {
            foundLetter.evaluation = t.evaluation;
          }
        } else {
          foundLetters.push({
            letter: t.letter,
            evaluation: t.evaluation,
          });
        }
      })
    );

    this.foundLetters$.emit(foundLetters);
  }

  getOpenRow(): Row {
    return this.grid.rows.filter((r) => r.status === Status.OPEN)[0];
  }

  toCopyText(): string {
    let string = `Papiamento Wordle\n`;
    string += `${this.getTotalGuesses()}/${this.tries} ${
      this.grid.wordIndex + 1
    }\n\n`;
    this.grid.rows
      .filter((r) => r.status === Status.COMPLETED)
      .forEach((row) => {
        let rowString = '';
        row.tiles.forEach((tile) => {
          if (tile.evaluation == Evaluation.ABSENT) {
            rowString += '⬛';
          }
          if (tile.evaluation == Evaluation.PRESENT) {
            rowString += '🟨';
          }
          if (tile.evaluation == Evaluation.CORRECT) {
            rowString += '🟩';
          }
        });

        string += rowString + '\n';
      });

    return string;
  }

  getSolutionWord(): string {
    return this.grid.word;
  }
}

export interface FoundLetter {
  letter: string;
  evaluation: Evaluation;
}
