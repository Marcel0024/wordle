import { EventEmitter, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import fx from 'fireworks';
import { GoogleAnalyticsService } from 'ngx-google-analytics';
import {
  BehaviorSubject,
  delay,
  filter,
  interval,
  map,
  Subscription,
  take,
  tap,
  timer,
  toArray,
} from 'rxjs';
import { validGuesses } from 'validguesses';
import { words as WORDS } from 'words';
import { FoundLetter, GameEndResults, GameStats } from '../interfaces/game';
import {
  Evaluation,
  GameStatus,
  Game,
  Row,
  Status,
  Tile,
} from '../interfaces/state';
import { StateService } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  startDate: string = 'February 2, 2022 00:00:00';
  wordsLength = 5;
  tries = 6;

  currentGame!: Game;
  uiBusy = false;

  gameEnd$ = new BehaviorSubject<GameEndResults | undefined>(undefined);
  gameStatsChange$ = new EventEmitter<GameStats>();
  foundLetters$ = new EventEmitter<FoundLetter[]>();
  grid$ = new EventEmitter<Row[]>();

  interval$: Subscription | undefined;
  timer: Subscription | undefined;

  constructor(
    private readonly gaService: GoogleAnalyticsService,
    private readonly stateService: StateService,
    private readonly snackBar: MatSnackBar
  ) {
    this.startTimers();
  }

  init(): void {
    let gameInState = this.stateService.getCurrentGame();

    if (gameInState) {
      this.currentGame = gameInState;

      if (this.newDayHasDawned()) {
        if (this.isTheCurrentGameOnGoing()) {
          this.finishGame(GameStatus.LOST);
        }
        this.createNewGame();
      }
    } else {
      this.createNewGame();
    }

    this.updateFoundLetters();
    this.updateGrid();
    this.updateStats();

    this.finishGameIfNecessary();

    this.updateGameEnd(this.currentGame.gameStatus);
  }

  processInput(text: string): void {
    if (this.isInputDisabled()) {
      return;
    }

    const input = text.toUpperCase();

    if (input === 'BACKSPACE') {
      this.backspace();
    } else if (input === 'ENTER') {
      this.enter();
    } else {
      if (input.length === 1) {
        this.typeLetter(input);
      }
    }
  }

  private startTimers(): void {
    this.interval$ = interval(1000)
      .pipe(
        filter(() => this.newDayHasDawned()),
        tap(() => {
          if (this.isTheCurrentGameOnGoing()) {
            this.snackBar.open('Times up!');
          }
          this.init();
          this.startFireworks(1);
        })
      )
      .subscribe();

    // reload front-end in two days to make sure client is always up to date
    // location.reload() is only reached if the client never closes the browser/tab
    const msInDay = 86400000;
    this.timer = timer(msInDay * 2)
      .pipe(tap(() => location.reload()))
      .subscribe();
  }

  private typeLetter(letter: string): void {
    let row = this.getOpenRow();
    let tile = row.tiles.filter((r) => r.status === Status.OPEN)[0];

    if (!tile) {
      return;
    }

    tile.letter = letter;
    tile.status = Status.FILLED;
    tile.evaluation = Evaluation.UNKNOWN;

    this.stateService.save(this.currentGame);
    this.updateGrid();
  }

  private backspace(): void {
    let row = this.getOpenRow();
    let previousTile = row.tiles
      .filter((r) => r.status === Status.FILLED)
      .slice(-1)[0];

    if (!previousTile) {
      return;
    }

    previousTile.letter = '';
    previousTile.status = Status.OPEN;
    previousTile.evaluation = Evaluation.UNKNOWN;

    this.stateService.save(this.currentGame);
    this.updateGrid();
  }

  private enter(): void {
    let row = this.getOpenRow();

    const guessWord = row.tiles.map((x) => x.letter).join('');
    const solutionWord = this.getSolutionWord();

    if (!this.canEnterWord(row, guessWord)) {
      return;
    }

    const copyRows = JSON.parse(JSON.stringify(this.currentGame.rows)) as Row[];
    const rowIndex = this.currentGame.rows.indexOf(row);

    const evaluations = this.getEvaluations(guessWord, solutionWord);

    row.tiles.forEach((tile, index) => {
      tile.evaluation = evaluations[index]; // set the evaluation
      tile.status = Status.COMPLETED;
    });

    row.status = Status.COMPLETED;
    this.stateService.save(this.currentGame);

    this.gaService.event('select_content', 'enter_word', guessWord);

    // Update UI
    this.uiBusy = true;
    this.grid$.emit(copyRows);

    timer(0, 400) // timer for animation
      .pipe(
        take(this.tries - 1),
        map((index) => {
          copyRows[rowIndex].tiles[index].evaluation = evaluations[index]; // set the evaluation

          if (guessWord === 'PATIN') {
            // Easter egg
            const array = ['✊', '🍆', '💦', '💦', '😂'];
            copyRows[rowIndex].tiles[index].letter = array[index]; // set the evaluation
          }

          this.grid$.emit(copyRows);
        }),
        toArray(),
        delay(500),
        tap(() => this.updateFoundLetters()), // update keyboard
        tap(() => this.finishGameIfNecessary())
      )
      .subscribe(() => {
        this.uiBusy = false;
        if (guessWord === 'PATIN') {
          // easter egg
          this.snackBar.open('ayy 😂', undefined, { duration: 3000 });
          setTimeout(() => this.updateGrid(), 3000);
        }
      });
  }

  private createNewGame(): void {
    const todays = this.getTodaysWord();
    this.currentGame = {
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

      this.currentGame.rows.push(row);
    }
    this.stateService.save(this.currentGame);
  }

  private getEvaluations(guess: string, solution: string): Evaluation[] {
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
      if (statuses[i]) {
        return;
      }

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

  private finishGameIfNecessary(): void {
    if (!this.isTheCurrentGameOnGoing()) {
      return;
    }

    if (
      this.currentGame.rows.some((x) =>
        x.tiles.every((x) => x.evaluation === Evaluation.CORRECT)
      )
    ) {
      this.finishGame(GameStatus.WON);
      this.startFireworks(3);
    } else if (
      this.currentGame.rows.every((x) => x.status === Status.COMPLETED)
    ) {
      this.snackBar.open(`'${this.currentGame?.word}'`, undefined, {
        duration: 5000,
      });
      this.finishGame(GameStatus.LOST);
    }
  }

  private startFireworks(times: number) {
    timer(0, 1500)
      .pipe(
        take(times),
        map(() => {
          for (let index = 0; index <= 5; index++) {
            fx({
              x:
                Math.floor(Math.random() * (window.innerWidth / 2)) +
                window.innerWidth / 4,
              y:
                Math.floor(Math.random() * (window.innerHeight / 2)) +
                window.innerHeight / 4 -
                250,
              particleTimeout: 4000 + Math.floor(Math.random() * 3000),
              colors: index % 2 === 0 ? ['#538d3e', '#b59f3b'] : ['red'],
            });
          }
        })
      )
      .subscribe();
  }

  private canEnterWord(currentRow: Row, guessWord: string): boolean {
    if (guessWord === 'GIAN') {
      this.snackBar.open(`No tin suficiente letter y e ta marico.`);
      return false;
    }

    if (!currentRow.tiles.every((x) => x.status === Status.FILLED)) {
      this.snackBar.open(`No tin suficiente letter.`);
      return false;
    }

    if (
      this.currentGame.rows
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

  private finishGame(gameStatus: GameStatus): void {
    this.currentGame.gameStatus = gameStatus;

    if (gameStatus === GameStatus.WON) {
      this.gaService.event('level_end', 'won', this.getSolutionWord());
    } else if (gameStatus === GameStatus.LOST) {
      this.gaService.event('level_end', 'lost', this.getSolutionWord());
    }

    this.stateService.save(this.currentGame);
    this.stateService.updateGameStats(gameStatus, this.getTotalGuesses());

    this.updateStats();
    this.updateGameEnd(gameStatus);
  }

  private getTotalGuesses(): number {
    return this.currentGame.rows.filter((x) => x.status === Status.COMPLETED)
      .length;
  }

  private updateFoundLetters(): void {
    const foundLetters: FoundLetter[] = [];

    this.currentGame.rows
      .filter((r) => r.status === Status.COMPLETED)
      .forEach((row) =>
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

  private getTodaysWord(): {
    word: string;
    nextDay: number;
    wordIndex: number;
  } {
    const epochMs = new Date(this.startDate).valueOf();
    const now = Date.now();
    const msInDay = 86400000;
    const index = Math.floor((now - epochMs) / msInDay);
    const nextDay = (index + 1) * msInDay + epochMs;

    return {
      word: WORDS[index % WORDS.length],
      nextDay: nextDay,
      wordIndex: index,
    };
  }

  private getOpenRow(): Row {
    const row = this.currentGame.rows.find((r) => r.status === Status.OPEN);

    if (row) {
      return row;
    }

    throw new Error('No open row found');
  }

  private toCopyText(): string {
    let string = `Papiamento Wordle\n`;

    let totalGuesses = '-';
    if (this.currentGame.gameStatus === GameStatus.WON) {
      totalGuesses = this.getTotalGuesses().toString();
    }

    string += `${totalGuesses}/${this.tries} ${
      this.currentGame.wordIndex + 1
    }\n\n`;

    this.currentGame.rows
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

  private getSolutionWord(): string {
    return this.currentGame.word;
  }

  private newDayHasDawned(): boolean {
    return this.currentGame?.nextDay - new Date().valueOf() < 0;
  }

  private updateGrid(): void {
    this.grid$.emit(JSON.parse(JSON.stringify(this.currentGame.rows)));
  }

  isTheCurrentGameOnGoing(): boolean {
    return this.currentGame.gameStatus === GameStatus.ONGOING;
  }

  public isInputDisabled(): boolean {
    return !this.isTheCurrentGameOnGoing() || this.uiBusy;
  }

  private updateStats(): void {
    const userStats = this.stateService.getUserLatestStats();

    let wonsInTries = userStats.finishedGames.filter(
      (x) => x.tries > 0 && x.tries <= this.tries
    );

    for (let i = 1; i < this.tries + 1; i++) {
      if (!wonsInTries.find((x) => x.tries === i)) {
        wonsInTries.push({ tries: i, count: 0 });
      }
    }

    this.gameStatsChange$.emit({
      totalGamesPlayed: userStats.totalGamesPlayed,
      totalGamesLost: userStats.totalGamesLost,
      totalGamesWon: userStats.totalGamesWon,
      currentStreak: userStats.currentStreak,
      maxStreak: userStats.maxStreak,
      wonsInTries: wonsInTries,
    });
  }

  private updateGameEnd(gameStatus: GameStatus): void {
    if (!this.isTheCurrentGameOnGoing()) {
      this.gameEnd$.next({
        gameStatus,
        totalGuesses: this.getTotalGuesses(),
        copyText: this.toCopyText(),
        nextDay: this.currentGame.nextDay,
      });
    } else {
      this.gameEnd$.next(undefined);
    }
  }
}
