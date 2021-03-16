import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatBadgeModule} from '@angular/material/badge';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatDividerModule} from '@angular/material/divider';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {SharedModule} from '../shared/shared.module';
import {GameListItemComponent} from './game-list-item/game-list-item.component';
import {GameListScreenComponent} from './game-list-screen.component';


@NgModule({
  declarations: [GameListScreenComponent, GameListItemComponent],
  imports: [
    CommonModule,        MatProgressSpinnerModule,
    MatChipsModule,      MatIconModule,
    MatMenuModule,       MatButtonModule,
    SharedModule,        MatTooltipModule,
    MatDividerModule,    MatCardModule,
    MatExpansionModule,  MatBadgeModule,
    MatFormFieldModule,  MatInputModule,
    MatSnackBarModule,   FormsModule,
    MatPaginatorModule,  MatAutocompleteModule,
    ReactiveFormsModule,
  ]
})
export class GameListModule {
}
