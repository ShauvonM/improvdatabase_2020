import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {GameListScreenComponent} from './game-list/game-list-screen.component';
import {SuperAdminScreenComponent} from './super-admin-screen/super-admin-screen.component';
import {WelcomeScreenComponent} from './welcome/welcome-screen.component';

const routes: Routes = [
  {path: '', redirectTo: '/games', pathMatch: 'full'},
  {path: 'welcome', component: WelcomeScreenComponent},
  {path: 'games', component: GameListScreenComponent},
  {path: 'games/:slug', component: GameListScreenComponent},
  {path: 'super', component: SuperAdminScreenComponent},
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {onSameUrlNavigation: 'reload'}),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
