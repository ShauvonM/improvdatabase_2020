import {NgModule} from '@angular/core';
import {AngularFireModule} from '@angular/fire';
import {AngularFireAnalyticsModule} from '@angular/fire/analytics';
import {AngularFirestoreModule} from '@angular/fire/firestore';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatChipsModule} from '@angular/material/chips';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatMenuModule} from '@angular/material/menu';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {environment} from 'src/environments/environment';
import {AddGameScreenComponent} from './add-game-screen/add-game-screen.component';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {GameListModule} from './game-list/game-list.module';
import {LoginDialogComponent} from './login-dialog/login-dialog.component';
import {SharedModule} from './shared/shared.module';
import {SuperAdminScreenComponent} from './super-admin-screen/super-admin-screen.component';
import {WelcomeModule} from './welcome/welcome.module';


@NgModule({
  declarations: [
    AppComponent,
    LoginDialogComponent,
    SuperAdminScreenComponent,
    AddGameScreenComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAnalyticsModule,
    AngularFirestoreModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    WelcomeModule,
    GameListModule,
    SharedModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    FormsModule,
    MatSnackBarModule,
    MatChipsModule,
    MatMenuModule,
    MatAutocompleteModule,
    MatTooltipModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [
    LoginDialogComponent,
  ],
})
export class AppModule {
}
