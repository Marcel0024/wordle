import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  DialogComponent,
  DialogData,
} from '../components/dialog/dialog.component';
import { IntroDialogComponent } from '../components/intro-dialog/intro-dialog.component';
import { GameStatus } from '../enums/gamestatus';
import { MessageType } from '../enums/messagetype';
import { GameEndResults, PlayerStats } from '../interfaces/game';
import { GameService } from './game.service';
import { StateService } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class MessagesService {
  gameStats!: PlayerStats;
  gameEndResults: GameEndResults | undefined;

  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly gameService: GameService,
    private readonly dialog: MatDialog,
    readonly stateService: StateService
  ) {
    this.gameService.eventType.subscribe((eventObj) =>
      this.processMessageEvent(eventObj)
    );

    this.gameService.gameStatsChange.subscribe(
      (stats) => (this.gameStats = stats)
    );
  }

  showInstructionsDialogIfNeeded(): void {
    if (!this.stateService.getViewedInstructions()) {
      this.stateService.setViewedInstructions();
      this.openInstructionsDialog();
    }
  }

  openInstructionsDialog(): void {
    this.dialog.open(IntroDialogComponent);
  }

  processMessageEvent(eventObj: { type: MessageType; data?: any }): void {
    switch (eventObj.type) {
      case MessageType.WORD_ALREADY_TRIED:
        this.snackBar.open(`'${eventObj.data}' a wordo purba caba.`);
        break;

      case MessageType.WORD_IS_NOT_VALID:
        this.snackBar.open(
          `'${eventObj.data}' no ta un palabra den Papiamento.`
        );
        break;

      case MessageType.LOST_STREAK:
        this.snackBar.open('Bo a perde bo streak. Jammer.');
        break;

      case MessageType.TIMES_UP:
        this.snackBar.open('Times up!');
        break;

      case MessageType.GAME_LOST_WORD_SOLUTION:
        this.snackBar.open(eventObj.data, undefined, { duration: 5000 });
        break;

      case MessageType.EASTER_EGG:
        this.snackBar.open('ayy 😂');
        break;

      case MessageType.NO_ENOUGH_LETTERS:
        this.snackBar.open('No tin suficiente letter.');
        break;
    }
  }

  showGameResultsPopup(gameEndResults: GameEndResults | undefined): void {
    this.gameEndResults = gameEndResults;

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
