import { Component } from '@angular/core';
import { Evaluation } from 'src/app/interfaces/state';

@Component({
  selector: 'app-intro-dialog',
  templateUrl: './intro-dialog.component.html',
  styleUrls: ['./intro-dialog.component.scss'],
})
export class IntroDialogComponent {
  evaluation = Evaluation;
}
