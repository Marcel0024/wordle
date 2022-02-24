import { Component, Input, OnInit } from '@angular/core';
import { Tile } from 'src/app/interfaces/grid';

@Component({
  selector: 'app-row',
  templateUrl: './row.component.html',
  styleUrls: ['./row.component.scss'],
})
export class RowComponent implements OnInit {
  @Input() tiles!: Tile[];

  constructor() {}

  ngOnInit(): void {}
}
