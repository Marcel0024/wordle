import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Evaluation } from 'src/app/interfaces/state';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';

@Component({
  selector: 'app-tile',
  templateUrl: './tile.component.html',
  styleUrls: ['./tile.component.scss'],
  animations: [
    trigger('cardFlip', [
      state(
        Evaluation.UNKNOWN,
        style({
          'background-color': 'transparent',
        })
      ),
      state(
        Evaluation.ABSENT,
        style({
          'background-color': '#3a3a3c',
        })
      ),
      state(
        Evaluation.PRESENT,
        style({
          'background-color': '#b59f3b',
        })
      ),
      state(
        Evaluation.CORRECT,
        style({
          'background-color': '#538d3e',
        })
      ),
      transition(`${Evaluation.UNKNOWN} => ${Evaluation.PRESENT}`, [
        animate(200, style({ transform: 'rotateY(90deg)' })),
        style({
          'background-color': '#b59f3b',
        }),
        animate(200, style({ transform: 'rotateY(0deg)' })),
      ]),
      transition(`${Evaluation.UNKNOWN} => ${Evaluation.ABSENT}`, [
        animate(200, style({ transform: 'rotateY(90deg)' })),
        style({
          'background-color': '#3a3a3c',
        }),
        animate(200, style({ transform: 'rotateY(0deg)' })),
      ]),
      transition(`${Evaluation.UNKNOWN} => ${Evaluation.CORRECT}`, [
        animate(200, style({ transform: 'rotateY(90deg)' })),
        style({
          'background-color': '#538d3e',
        }),
        animate(200, style({ transform: 'rotateY(0deg)' })),
      ]),
    ]),
  ],
})
export class TileComponent implements OnInit {
  colorGold = '#b59f3b';
  colorGreen = '#538d3e';
  colorGrey = '#3a3a3c';

  @Input() text!: string;
  @Input() evaluation: Evaluation | undefined;

  @Output() onClick = new EventEmitter<string>();

  constructor() {}

  ngOnInit(): void {}

  clicked(): void {
    this.onClick.emit(this.text);
  }

  getColor(): string {
    switch (this.evaluation) {
      case Evaluation.CORRECT:
        return this.colorGreen;
      case Evaluation.PRESENT:
        return this.colorGold;
      case Evaluation.ABSENT:
        return this.colorGrey;
      case Evaluation.UNKNOWN:
        return 'transparent';
      default:
        return 'rgb(109, 109, 109)';
    }
  }
}
