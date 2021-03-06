import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {GameDetailsScreenComponent} from './game-details-screen.component';



@NgModule({
  declarations: [
    GameDetailsScreenComponent,
  ],
  imports: [
    CommonModule,
    MatCardModule,
  ]
})
export class GameDetailsModule {
}
