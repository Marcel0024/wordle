import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogComponent } from './components/dialog/dialog.component';
import { IntroDialogComponent } from './components/intro-dialog/intro-dialog.component';
import { GameStatus, Status } from './interfaces/state';
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

  constructor(
    public readonly gameService: GameService,
    public readonly stateService: StateService,
    public readonly dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (!this.stateService.getViewedInstructions()) {
      this.stateService.updateViewInstructions(true);
      this.openInstructionsDialog();
    }

    this.gameService.gameStatus$.subscribe((x) => this.processGameStatus(x));
    this.gameService.foundLetters$.subscribe((x) => (this.foundLetters = x));
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
    let data: any = {
      nextDay: this.gameResults.grid?.nextDay,
      copyText: this.gameService.toCopyText(),
      totalGamesPlayed: this.gameResults.user.totalGamesPlayed,
      totalGamesWon: this.gameResults.user.totalGamesWon,
      totalGamesLost: this.gameResults.user.totalGamesLost,
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
      const totalTries = this.gameResults.grid.rows.filter(
        (x) => x.status === Status.COMPLETED
      ).length;
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
          title: 'Game Over',
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

  copy(): void {
    navigator.clipboard.writeText(this.gameService.toCopyText());

    this.snackBar.open('Copied to clipboard!');
  }

  keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'Ñ', 'M'],
    ['ENTER', 'BACKSPACE'],
  ];
}
