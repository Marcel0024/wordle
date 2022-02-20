import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { KeyboardComponent } from './components/keyboard/keyboard.component';
import { GridComponent } from './components/grid/grid.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog';
import { DialogComponent } from './components/dialog/dialog.component';
import { IntroDialogComponent } from './components/intro-dialog/intro-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRippleModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { KeyboardTileComponent } from './components/keyboard/keyboard-tile/keyboard-tile.component';
import { CountdownComponent } from './components/countdown/countdown.component';
import { RowComponent } from './components/grid/row/row.component';
import { TileComponent } from './components/grid/tile/tile.component';
import { CopyButtonComponent } from './components/copy-button/copy-button.component';
import { GraphComponent } from './components/dialog/graph/graph.component';
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics';
import { environment } from './../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    KeyboardComponent,
    RowComponent,
    GridComponent,
    TileComponent,
    KeyboardTileComponent,
    DialogComponent,
    IntroDialogComponent,
    CountdownComponent,
    CopyButtonComponent,
    GraphComponent,
  ],
  imports: [
    BrowserModule,
    FlexLayoutModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatDividerModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    MatRippleModule,
    MatTableModule,
    NgxGoogleAnalyticsModule.forRoot(environment.ga),
  ],
  providers: [
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        duration: 2500,
        verticalPosition: 'top',
      },
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
