import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  DialogComponent,
  dialogData as DialogData,
} from './components/dialog/dialog.component';
import { IntroDialogComponent } from './components/intro-dialog/intro-dialog.component';
import { FoundLetter, GameEndResults, GameStats } from './interfaces/game';
import { GameStatus, Row } from './interfaces/state';
import { GameService } from './services/game.service';
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
    this.startVideo();
  }

  subscribeToGameEvents(): void {
    this.gameService.gameStatsChange$.subscribe(
      (stats) => (this.gameStats = stats)
    );

    this.gameService.gameEnd$.subscribe((gameEndResults): void => {
      if (gameEndResults && gameEndResults.gameStatus != GameStatus.ONGOING) {
        this.disabledKeyboard = true;
      } else {
        this.disabledKeyboard = false;
      }
      this.gameEndResults = gameEndResults;
      this.showGameResultsPopup(gameEndResults);
    });

    this.gameService.foundLetters$.subscribe((x) => (this.foundLetters = x));
    this.gameService.grid$.subscribe((x) => (this.grid = x));
  }

  onKeyboardPress(letter: string): void {
    this.gameService.processInput(letter);
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

  startVideo() {
    try {
      // Create the root video element
      var video = document.createElement('video');
      video.setAttribute('loop', '');
      // Add some styles if needed
      video.setAttribute('style', 'position: fixed;');

      // A helper to add sources to video
      function addSourceToVideo(element: any, type: any, dataURI: any) {
        var source = document.createElement('source');
        source.src = dataURI;
        source.type = 'video/' + type;
        element.appendChild(source);
      }

      // A helper to concat base64
      var base64 = function (mimeType: any, base64: any) {
        return 'data:' + mimeType + ';base64,' + base64;
      };

      // Add Fake sourced
      addSourceToVideo(
        video,
        'webm',
        base64(
          'video/webm',
          'GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA='
        )
      );

      // Append the video to where ever you need
      document.body.appendChild(video);

      // Start playing video after any user interaction.
      // NOTE: Running video.play() handler without a user action may be blocked by browser.
      var playFn = function () {
        video.play();
        document.body.removeEventListener('touchend', playFn);
      };
      document.body.addEventListener('touchend', playFn);
    } catch {}
  }
}
