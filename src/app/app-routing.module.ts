import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {GameDetailsScreenComponent} from './game-details/game-details-screen.component';
import {GameListScreenComponent} from './game-list/game-list-screen.component';
import {WelcomeScreenComponent} from './welcome/welcome-screen.component';

const routes: Routes = [
  {path: '', redirectTo: '/games', pathMatch: 'full'},
  {path: 'welcome', component: WelcomeScreenComponent},
  {path: 'games', component: GameListScreenComponent},
  {path: 'games/:slug', component: GameDetailsScreenComponent}
];

@NgModule({imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })], exports: [RouterModule]})
export class AppRoutingModule {
}
