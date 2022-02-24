import { Component, Input } from '@angular/core';
import { Row } from 'src/app/interfaces/grid';

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
})
export class GridComponent {
  @Input() rows!: Row[];
  @Input() fade = false;
}
