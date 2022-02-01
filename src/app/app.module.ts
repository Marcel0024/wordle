import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { KeyboardComponent } from './keyboard/keyboard.component';
import { RowComponent } from './grid/components/row/row.component';
import { GridComponent } from './grid/grid.component';
import { TileComponent } from './grid/components/tile/tile.component';

@NgModule({
  declarations: [
    AppComponent,
    KeyboardComponent,
    RowComponent,
    GridComponent,
    TileComponent,
  ],
  imports: [BrowserModule, FlexLayoutModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
