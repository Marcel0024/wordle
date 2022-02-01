import { Component, Input, OnInit } from '@angular/core';
import { Row } from '../interfaces/state';

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit {
  @Input() rows!: Row[];

  constructor() {}

  ngOnInit(): void {}
}
