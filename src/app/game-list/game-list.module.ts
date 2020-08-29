import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatDividerModule} from '@angular/material/divider';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {SharedModule} from '../shared/shared.module';
import {GameListItemComponent} from './game-list-item/game-list-item.component';
import {GameListScreenComponent} from './game-list-screen.component';


@NgModule({
  declarations: [GameListScreenComponent, GameListItemComponent],
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    SharedModule,
    MatTooltipModule,
    MatDividerModule,
    MatCardModule,
  ]
})
export class GameListModule {
}
