import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  DialogComponent,
  dialogData as DialogData,
} from './components/dialog/dialog.component';
import { IntroDialogComponent } from './components/intro-dialog/intro-dialog.component';
import { GameStatus, Row } from './interfaces/state';
import {
  FoundLetter,
  GameEndResults,
  GameService,
  GameStats,
} from './services/game.service';
import { StateService } from './services/state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  gameStats!: GameStats;

  grid: Row[] | undefined;

  foundLetters: FoundLetter[] = [];
  disabledKeyboard: boolean = false;
  gameEndResults: GameEndResults | undefined;

  constructor(
    private readonly gameService: GameService,
    private readonly stateService: StateService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (!this.stateService.getViewedInstructions()) {
      this.stateService.setViewedInstructions();
      this.openInstructionsDialog();
    }

    this.subscribeToGameEvents();
    this.gameService.init();
  }

  subscribeToGameEvents(): void {
    this.gameService.gameStatsChange$.subscribe((stats) => {
      this.gameStats = stats;
    });

    this.gameService.gameEnd$.subscribe((gameEndResults) => {
      if (gameEndResults && gameEndResults.gameStatus != GameStatus.ONGOING) {
        this.disabledKeyboard = true;
      }
      this.gameEndResults = gameEndResults;
      this.showGameResultsPopup(gameEndResults);
    });

    this.gameService.foundLetters$.subscribe((x) => (this.foundLetters = x));
    this.gameService.grid$.subscribe((x) => (this.grid = x));
  }

  onDisplayKeyboardClick(letter: string): void {
    if (this.gameService.isInputDisabled()) {
      return;
    }

    if (letter === 'BACKSPACE') {
      this.gameService.backspace();
    } else if (letter === 'ENTER') {
      this.gameService.enter();
    } else {
      this.gameService.typeLetter(letter);
    }
  }

  @HostListener('document:keydown', ['$event'])
  realKeyboardEvent(event: KeyboardEvent) {
    if (this.gameService.isInputDisabled()) {
      return;
    }

    if (event.key === 'Backspace') {
      this.gameService.backspace();
    } else if (event.key === 'Enter') {
      this.gameService.enter();
    } else {
      if (event.key.length === 1) {
        this.gameService.typeLetter(event.key.toUpperCase());
      }
    }
  }

  showGameStatsPopup(): void {
    if (this.gameEndResults) {
      this.showGameResultsPopup(this.gameEndResults);
      return;
    }

    const dialogData = this.getDialogStatsData();

    this.dialog.open(DialogComponent, {
      data: {
        ...dialogData,
        title: 'Stats',
      },
    });
  }

  showGameResultsPopup(gameEndResults: GameEndResults | undefined): void {
    if (!gameEndResults) {
      return;
    }

    const data = {
      ...this.getDialogStatsData(),
      nextDay: gameEndResults.nextDay,
      copyText: gameEndResults.copyText,
    };

    if (gameEndResults.gameStatus === GameStatus.WON) {
      this.dialog.open(DialogComponent, {
        data: {
          ...data,
          title: '🎉 Pabien!  🎉',
          text: `Bo a rij e palabra den ${gameEndResults.totalGuesses} biaha!`,
        },
      });
    } else if (gameEndResults.gameStatus === GameStatus.LOST) {
      this.dialog.open(DialogComponent, {
        data: {
          ...data,
          title: '😥 Game Over 😥',
          text: `Lastima! Purba bo suerte otro biaha!`,
        },
      });
    }
  }

  openInstructionsDialog(): void {
    this.dialog.open(IntroDialogComponent);
  }

  getDialogStatsData(): DialogData {
    return {
      title: '',
      text: '',
      nextDay: undefined,
      totalGamesPlayed: this.gameStats.totalGamesPlayed,
      totalGamesWon: this.gameStats.totalGamesWon,
      totalGamesLost: this.gameStats.totalGamesLost,
      currentStreak: this.gameStats.currentStreak,
      maxStreak: this.gameStats.maxStreak,
      wonsInTries: this.gameStats.wonsInTries,
      copyText: undefined,
    };
  }
}
