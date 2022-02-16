import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  DialogComponent,
  dialogData,
} from './components/dialog/dialog.component';
import { IntroDialogComponent } from './components/intro-dialog/intro-dialog.component';
import { GameStatus, Row } from './interfaces/state';
import { FoundLetter, GameService } from './services/game.service';
import { SettingsState, StateService } from './services/state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  gameStatusEnum = GameStatus;

  foundLetters: FoundLetter[] = [];
  gameResults: SettingsState | undefined;
  rows: Row[] | undefined;

  constructor(
    public readonly gameService: GameService,
    private readonly stateService: StateService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (!this.stateService.getViewedInstructions()) {
      this.stateService.updateViewInstructions(true);
      this.openInstructionsDialog();
    }

    this.gameService.gameStatusChange$.subscribe((x) =>
      this.processGameStatus(x)
    );
    this.gameService.foundLettersChange$.subscribe(
      (x) => (this.foundLetters = x)
    );
    this.gameService.rowsChange$.subscribe((x) => (this.rows = x));
    this.gameService.init();
  }

  processGameStatus(gameResults: SettingsState): void {
    this.gameResults = gameResults;
    this.showGameResultsPopup(false);
  }

  showGameResultsPopup(buttonPressed: boolean): void {
    if (!this.gameResults?.grid) {
      return;
    }

    let wonsInTries = this.gameResults.user.finishedGames.filter(
      (x) => x.tries > 0 && x.tries <= this.gameService.tries
    );

    for (let i = 1; i < this.gameService.tries + 1; i++) {
      if (!wonsInTries.find((x) => x.tries === i)) {
        wonsInTries.push({ tries: i, count: 0 });
      }
    }

    let data: dialogData = {
      nextDay: this.gameResults.grid?.nextDay,
      copyText: this.gameService.toCopyText(),
      totalGamesPlayed: this.gameResults.user.totalGamesPlayed,
      totalGamesWon: this.gameResults.user.totalGamesWon,
      totalGamesLost: this.gameResults.user.totalGamesLost,
      currentStreak: this.gameResults.user?.currentStreak ?? 0,
      maxStreak: this.gameResults.user?.maxStreak ?? 0,
      wonsInTries: wonsInTries,
      title: '',
      text: '',
    };

    if (
      this.gameResults.grid.gameStatus === GameStatus.ONGOING &&
      buttonPressed
    ) {
      this.dialog.open(DialogComponent, {
        data: {
          ...data,
          nextDay: undefined,
          title: 'Stats',
        },
      });
    }

    if (this.gameResults.grid?.gameStatus === GameStatus.WON) {
      const totalTries = this.gameService.getTotalGuesses();

      this.dialog.open(DialogComponent, {
        data: {
          ...data,
          title: '🎉 Pabien!  🎉',
          text: `Bo a rij e palabra den ${totalTries} biaha!`,
        },
      });
    } else if (this.gameResults.grid?.gameStatus === GameStatus.LOST) {
      this.dialog.open(DialogComponent, {
        data: {
          ...data,
          title: '😥 Game Over 😥',
          text: `Lastima! Purba bo suerte otro biaha!`,
        },
      });
    }
  }

  onDisplayKeyboardClick(letter: string): void {
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

  openInstructionsDialog(): void {
    this.dialog.open(IntroDialogComponent);
  }
}
