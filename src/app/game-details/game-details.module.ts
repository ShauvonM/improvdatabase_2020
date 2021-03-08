import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatIconModule} from '@angular/material/icon';
import {GameDetailsScreenComponent} from './game-details-screen.component';



@NgModule({
  declarations: [
    GameDetailsScreenComponent,
  ],
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
  ]
})
export class GameDetailsModule {
}
