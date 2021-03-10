import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {GameListItemComponent} from './game-list/game-list-item/game-list-item.component';
import {GameListScreenComponent} from './game-list/game-list-screen.component';
import {SuperAdminScreenComponent} from './super-admin-screen/super-admin-screen.component';
import {WelcomeScreenComponent} from './welcome/welcome-screen.component';

const routes: Routes = [
  {path: '', redirectTo: '/games', pathMatch: 'full'},
  {path: 'welcome', component: WelcomeScreenComponent},
  {path: 'games', component: GameListScreenComponent},
  {path: 'games/:slug', component: GameListItemComponent},
  {path: 'super', component: SuperAdminScreenComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {relativeLinkResolution: 'legacy'})],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
