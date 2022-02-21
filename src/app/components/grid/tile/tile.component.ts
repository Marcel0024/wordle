import { Component, EventEmitter, Input, Output } from '@angular/core';
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
        animate(300, style({ transform: 'rotateY(90deg)' })),
        style({
          'background-color': '#b59f3b',
        }),
        animate(300, style({ transform: 'rotateY(0deg)' })),
      ]),
      transition(`${Evaluation.UNKNOWN} => ${Evaluation.ABSENT}`, [
        animate(300, style({ transform: 'rotateY(90deg)' })),
        style({
          'background-color': '#3a3a3c',
        }),
        animate(300, style({ transform: 'rotateY(0deg)' })),
      ]),
      transition(`${Evaluation.UNKNOWN} => ${Evaluation.CORRECT}`, [
        animate(300, style({ transform: 'rotateY(90deg)' })),
        style({
          'background-color': '#538d3e',
        }),
        animate(300, style({ transform: 'rotateY(0deg)' })),
      ]),
    ]),
  ],
})
export class TileComponent {
  @Input() text!: string;
  @Input() evaluation: Evaluation | undefined;

  @Output() onClick = new EventEmitter<string>();
}
