import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {GamesService} from '../services/games.service';
import {ScreenDirective} from '../shared/screen.directive';
import {Game} from '../shared/types';

@Component({
  selector: 'app-game-details-screen',
  templateUrl: './game-details-screen.component.html',
  styleUrls: ['./game-details-screen.component.scss']
})
export class GameDetailsScreenComponent extends ScreenDirective {
  game$: Observable<Game>;

  constructor(
      private readonly route: ActivatedRoute,
      private readonly gameService: GamesService,
  ) {
    super();

    this.route.params.subscribe(params => {
      const slug = params.slug;

      this.game$ = gameService.fetchGame(slug);
    });
  }
}
