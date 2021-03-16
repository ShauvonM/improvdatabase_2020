import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AboutScreenComponent} from './about/about-screen/about-screen.component';
import {AddGameScreenComponent} from './add-game-screen/add-game-screen.component';
import {GameListScreenComponent} from './game-list/game-list-screen.component';
import {HomeScreenComponent} from './home/home-screen/home-screen.component';
import {NewsScreenComponent} from './news/news-screen/news-screen.component';
import {SuperAdminScreenComponent} from './super-admin-screen/super-admin-screen.component';
import {WelcomeScreenComponent} from './welcome/welcome-screen.component';

const routes: Routes = [
  {path: '', redirectTo: '/games', pathMatch: 'full'},
  {path: 'home', component: HomeScreenComponent},
  {path: 'welcome', component: WelcomeScreenComponent},
  {path: 'news', component: NewsScreenComponent},
  {path: 'about', component: AboutScreenComponent},
  {path: 'games', component: GameListScreenComponent},
  {path: 'games/:slug', component: GameListScreenComponent},
  {path: 'addgame', component: AddGameScreenComponent},
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
