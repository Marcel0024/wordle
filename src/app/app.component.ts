import { Component, OnInit } from '@angular/core';
import { GameStatus } from './enums/gamestatus';
import { FoundLetter } from './interfaces/game';
import { Row } from './interfaces/grid';
import { GameService } from './services/game.service';
import { MessagesService } from './services/messages.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  grid: Row[] | undefined;

  foundLetters: FoundLetter[] = [];
  disabledKeyboard: boolean = false;

  constructor(
    private readonly gameService: GameService,
    private readonly messageService: MessagesService
  ) {}

  ngOnInit(): void {
    this.subscribeToGameEvents();
    this.gameService.init();
    this.messageService.showInstructionsDialogIfNeeded();
  }

  subscribeToGameEvents(): void {
    this.gameService.gameEnd.subscribe((gameEndResults): void => {
      this.disabledKeyboard =
        (gameEndResults && gameEndResults?.gameStatus != GameStatus.ONGOING) ??
        false;

      this.messageService.showGameResultsPopup(gameEndResults);
    });

    this.gameService.foundLettersChange.subscribe(
      (x) => (this.foundLetters = x)
    );
    this.gameService.gridChange.subscribe((x) => (this.grid = x));
  }

  onKeyboardPress(letter: string): void {
    this.gameService.processInput(letter);
  }

  showGameStatsPopup(): void {
    this.messageService.showGameStatsPopup();
  }

  openInstructionsDialog(): void {
    this.messageService.openInstructionsDialog();
  }
}
