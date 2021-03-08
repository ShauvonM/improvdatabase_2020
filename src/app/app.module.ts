import {NgModule} from '@angular/core';
import {AngularFireModule} from '@angular/fire';
import {AngularFireAnalyticsModule} from '@angular/fire/analytics';
import {AngularFirestoreModule} from '@angular/fire/firestore';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {environment} from 'src/environments/environment';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {GameDetailsModule} from './game-details/game-details.module';
import {GameListModule} from './game-list/game-list.module';
import {LoginDialogComponent} from './login-dialog/login-dialog.component';
import {SharedModule} from './shared/shared.module';
import {WelcomeModule} from './welcome/welcome.module';


@NgModule({
  declarations: [
    AppComponent,
    LoginDialogComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAnalyticsModule,
    AngularFirestoreModule,
    BrowserAnimationsModule,
    WelcomeModule,
    GameListModule,
    GameDetailsModule,
    SharedModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [LoginDialogComponent]
})
export class AppModule {
}
