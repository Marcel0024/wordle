import { Component } from '@angular/core';
import { Grid } from './interfaces/state';
import { StateService } from './services/state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public readonly stateService: StateService) {
    stateService.init();
  }

  keyboardClick(letter: string): void {
    if (letter === 'BACKSPACE') {
      this.stateService.backspaceClicked();
    } else if (letter === 'ENTER') {
      this.stateService.enterClicked();
    } else {
      this.stateService.letterClicked(letter);
    }
  }

  startNewGame(): void {
    this.stateService.init();
  }
}
