import { EventEmitter, Injectable } from '@angular/core';
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
import { WORDS } from 'words';
import { Evaluation } from '../enums/evaluation';
import { GameStatus } from '../enums/gamestatus';
import { MessageType as EventType } from '../enums/messagetype';
import { RowStatus } from '../enums/rowstatus';
import { FoundLetter, GameEndResults, PlayerStats } from '../interfaces/game';
import { Game, Row, Tile } from '../interfaces/grid';
import { StateService } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  startDate = 'February 2, 2022 00:00:00';
  wordsLength = 5;
  tries = 6;

  currentGame!: Game;
  uiBusy = false;

  gameEnd = new BehaviorSubject<GameEndResults | undefined>(undefined);
  gameStatsChange = new EventEmitter<PlayerStats>();
  foundLettersChange = new EventEmitter<FoundLetter[]>();
  gridChange = new EventEmitter<Row[]>();

  eventType = new EventEmitter<{
    type: EventType;
    data?: any;
  }>();

  interval$: Subscription | undefined;
  reloadTimer$: Subscription | undefined;

  constructor(
    private readonly gaService: GoogleAnalyticsService,
    private readonly stateService: StateService
  ) {
    this.startTimers();
  }

  init(): void {
    const gameInLocalStorage = this.stateService.loadGame();

    if (!gameInLocalStorage) {
      this.createNewGame();
    } else {
      this.currentGame = gameInLocalStorage;

      if (this.newDayHasDawned()) {
        if (this.isTheCurrentGameOnGoing()) {
          this.finishGame(GameStatus.LOST);
        } else {
          this.validateStreak();
        }
        this.createNewGame();
      }
    }

    this.notifyFoundLettersChange();
    this.notifyGridChange();
    this.notifyStatsChange();

    this.finishGameIfNecessary();

    this.updateGameEnd(this.currentGame.gameStatus);
  }

  processInput(text: string): void {
    if (this.isInputDisabled()) {
      return;
    }

    const input = text.toUpperCase();

    if (input === 'BACKSPACE') {
      this.processBackspace();
    } else if (input === 'ENTER') {
      this.processEnter();
    } else {
      if (input.length === 1) {
        this.processInputLetter(input);
      }
    }
  }

  private validateStreak(): void {
    const todays = this.getTodaysWord();
    const difference = todays.wordIndex - this.currentGame.wordIndex;

    // If game (old word index) is more then 2, then a day has passed so reset streak.
    if (difference >= 2) {
      this.eventType.emit({
        type: EventType.LOST_STREAK,
      });

      this.stateService.resetStreak();
    }
  }

  private startTimers(): void {
    this.interval$ = interval(1000)
      .pipe(
        filter(() => this.newDayHasDawned()),
        tap(() => {
          if (this.isTheCurrentGameOnGoing()) {
            this.eventType.emit({
              type: EventType.TIMES_UP,
              data: undefined,
            });
          }
          this.init();
          this.startFireworks(1);
        })
      )
      .subscribe();

    // reload front-end in two days to make sure client is always up to date
    // location.reload() is only reached if the client never closes the browser/tab
    const msInDay = 86400000;
    this.reloadTimer$ = timer(msInDay * 2)
      .pipe(tap(() => location.reload()))
      .subscribe();
  }

  private processInputLetter(letter: string): void {
    let row = this.getOpenRow();
    let tile = row.tiles.find((r) => r.letter === '');

    if (!tile) {
      return;
    }

    tile.letter = letter;
    tile.evaluation = Evaluation.UNKNOWN;

    this.stateService.save(this.currentGame);
    this.notifyGridChange();
  }

  private processBackspace(): void {
    let row = this.getOpenRow();
    let previousTile = row.tiles.filter((r) => r.letter).slice(-1)[0];

    if (!previousTile) {
      return;
    }

    previousTile.letter = '';
    previousTile.evaluation = Evaluation.UNKNOWN;

    this.stateService.save(this.currentGame);
    this.notifyGridChange();
  }

  private processEnter(): void {
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
    });

    row.status = RowStatus.COMPLETED;
    this.stateService.save(this.currentGame);

    this.gaService.gtag('event', 'select_content', {
      content_type: 'word',
      item_id: guessWord,
    });

    // Update UI
    this.uiBusy = true;
    this.gridChange.emit(copyRows);

    timer(0, 400) // timer for animation
      .pipe(
        take(this.tries - 1),
        map((index) => {
          copyRows[rowIndex].tiles[index].evaluation = evaluations[index]; // set the evaluation

          if (guessWord === 'PATIN') {
            // Easter egg
            const array = ['✊', '🍆', '💦', '💦', '😂'];

            copyRows[rowIndex].tiles[index].evaluation = Evaluation.CORRECT;
            copyRows[rowIndex].tiles[index].letter = array[index];
          }

          this.gridChange.emit(copyRows);
        }),
        toArray(),
        delay(500),
        tap(() => this.notifyFoundLettersChange()), // update keyboard
        tap(() => this.finishGameIfNecessary())
      )
      .subscribe(() => {
        this.uiBusy = false;
        if (guessWord === 'PATIN') {
          // easter egg
          this.eventType.emit({
            type: EventType.EASTER_EGG,
          });
          setTimeout(() => this.notifyGridChange(), 2500);
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
      const row = { tiles: [] as Tile[], status: RowStatus.OPEN };

      for (let tileRow = 0; tileRow < this.wordsLength; tileRow++) {
        let tile: Tile = {
          letter: '',
          evaluation: Evaluation.UNKNOWN,
        };
        row.tiles.push(tile);
      }

      this.currentGame.rows.push(row);
    }

    this.stateService.save(this.currentGame);
    this.gaService.gtag('event', 'level_start', {
      level_name: this.currentGame.word,
    });
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
      this.currentGame.rows.every((x) => x.status === RowStatus.COMPLETED)
    ) {
      this.eventType.emit({
        type: EventType.GAME_LOST_WORD_SOLUTION,
        data: this.currentGame.word,
      });
      this.finishGame(GameStatus.LOST);
    }
  }

  private canEnterWord(currentRow: Row, guessWord: string): boolean {
    if (!currentRow.tiles.every((x) => x.letter)) {
      this.eventType.emit({
        type: EventType.NO_ENOUGH_LETTERS,
      });
      return false;
    }

    if (
      this.currentGame.rows
        .filter((r) => r.status === RowStatus.COMPLETED)
        .some((r) => r.tiles.map((t) => t.letter).join('') === guessWord)
    ) {
      this.eventType.emit({
        type: EventType.WORD_ALREADY_TRIED,
        data: guessWord,
      });
      return false;
    }

    if (!WORDS.includes(guessWord) && !validGuesses.includes(guessWord)) {
      this.eventType.emit({
        type: EventType.WORD_IS_NOT_VALID,
        data: guessWord,
      });
      return false;
    }

    return true;
  }

  private finishGame(gameStatus: GameStatus): void {
    this.currentGame.gameStatus = gameStatus;

    this.stateService.save(this.currentGame);
    this.stateService.updateGameStats(gameStatus, this.getTotalGuesses());

    this.gaService.gtag('event', 'level_end', {
      level_name: this.getSolutionWord(),
      success: gameStatus === GameStatus.WON,
    });

    const userStats = this.stateService.getUserLatestStats();

    this.gaService.gtag('event', 'post_score', {
      score: userStats.totalGamesPlayed,
      level: userStats.totalGamesWon,
    });

    this.notifyStatsChange();
    this.updateGameEnd(gameStatus);
  }

  private getTotalGuesses(): number {
    return this.currentGame.rows.filter((x) => x.status === RowStatus.COMPLETED)
      .length;
  }

  private notifyFoundLettersChange(): void {
    const foundLetters: FoundLetter[] = [];

    this.currentGame.rows
      .filter((r) => r.status === RowStatus.COMPLETED)
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

    this.foundLettersChange.emit(foundLetters);
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
    const row = this.currentGame.rows.find((r) => r.status === RowStatus.OPEN);

    if (row) {
      return row;
    }

    throw new Error('No open row found');
  }

  private toCopyText(): string {
    let textToCopy = `Papiamento Wordle\n`;

    let totalGuesses = '-';
    if (this.currentGame.gameStatus === GameStatus.WON) {
      totalGuesses = this.getTotalGuesses().toString();
    }

    textToCopy += `${totalGuesses}/${this.tries} ${
      this.currentGame.wordIndex + 1
    }\n\n`;

    this.currentGame.rows
      .filter((r) => r.status === RowStatus.COMPLETED)
      .forEach((row) => {
        let rowEmoji = '';
        row.tiles.forEach((tile) => {
          if (tile.evaluation == Evaluation.ABSENT) {
            rowEmoji += '⬛';
          }
          if (tile.evaluation == Evaluation.PRESENT) {
            rowEmoji += '🟨';
          }
          if (tile.evaluation == Evaluation.CORRECT) {
            rowEmoji += '🟩';
          }
        });

        textToCopy += rowEmoji + '\n';
      });

    return textToCopy;
  }

  private getSolutionWord(): string {
    return this.currentGame.word;
  }

  private newDayHasDawned(): boolean {
    return this.currentGame?.nextDay - new Date().valueOf() < 0;
  }

  private notifyGridChange(): void {
    this.gridChange.emit(JSON.parse(JSON.stringify(this.currentGame.rows)));
  }

  private isTheCurrentGameOnGoing(): boolean {
    return this.currentGame.gameStatus === GameStatus.ONGOING;
  }

  private isInputDisabled(): boolean {
    return !this.isTheCurrentGameOnGoing() || this.uiBusy;
  }

  private notifyStatsChange(): void {
    const userStats = this.stateService.getUserLatestStats();

    let wonsInTries = userStats.finishedGames.filter(
      (x) => x.tries > 0 && x.tries <= this.tries
    );

    for (let i = 1; i < this.tries + 1; i++) {
      if (!wonsInTries.find((x) => x.tries === i)) {
        wonsInTries.push({ tries: i, count: 0 });
      }
    }

    this.gameStatsChange.emit({
      totalGamesPlayed: userStats.totalGamesPlayed,
      totalGamesLost: userStats.totalGamesLost,
      totalGamesWon: userStats.totalGamesWon,
      currentStreak: userStats.currentStreak,
      maxStreak: userStats.maxStreak,
      wonsInTries: wonsInTries,
    });
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

  private updateGameEnd(gameStatus: GameStatus): void {
    if (!this.isTheCurrentGameOnGoing()) {
      this.gameEnd.next({
        gameStatus,
        totalGuesses: this.getTotalGuesses(),
        copyText: this.toCopyText(),
        nextDay: this.currentGame.nextDay,
      });
    } else {
      this.gameEnd.next(undefined);
    }
  }
}
