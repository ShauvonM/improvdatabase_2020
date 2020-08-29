import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {GamesService} from '../services/games.service';
import {ScreenDirective} from '../shared/screen.directive';
import {Game, GameMetadata, Tag} from '../shared/types';


@Component({
  selector: 'app-game-list-screen',
  templateUrl: './game-list-screen.component.html',
  styleUrls: ['./game-list-screen.component.scss']
})
export class GameListScreenComponent extends ScreenDirective {
  games$: Observable<Game[]>;

  durations$: Observable<GameMetadata[]>;
  playerCounts$: Observable<GameMetadata[]>;
  tags$: Observable<Tag[]>;

  gamePages: Observable<Game[]>[] = [];

  loading = false;

  get filters(): (GameMetadata|Tag)[] {
    return this.gameService.filters;
  }

  get theresMore(): boolean {
    return this.gameService.theresMore;
  }

  // Querying:
  // https://github.com/angular/angularfire/blob/master/docs/firestore/querying-collections.md

  constructor(
      private readonly gameService: GamesService,
      private readonly router: Router,
  ) {
    super();

    this.durations$ = this.gameService.getMetadatas().pipe(map(data => {
      return [...data.values()]
          .filter(m => m.type === 'duration')
          .sort((a, b) => (a.min - b.min) + (a.max - b.max));
    }));

    this.playerCounts$ = this.gameService.getMetadatas().pipe(map(data => {
      return [...data.values()]
          .filter(m => m.type === 'playerCount')
          .sort((a, b) => (a.min - b.min) + (a.max - b.max));
    }));

    this.tags$ = this.gameService.getTags().pipe(map(tags => {
      return tags.sort((a, b) => a.name.localeCompare(b.name));
    }));

    this.loadPage();
  }

  reset() {
    this.gamePages = [this.gamePages[0]];
  }

  loadPage(lastPage?: Game[]) {
    let startAfter = '';
    if (lastPage) {
      startAfter = lastPage[lastPage.length - 1].name;
    }
    this.gamePages.push(
        this.gameService.fetchGamePage(startAfter).pipe(tap(games => {
          console.log(
              'page', games, games[0].name, games[games.length - 1].name);
          return games;
        })));
    this.gameService.filterChange$.subscribe(() => {
      console.log('filter change!');
      this.reset();
    });
  }

  addFilter(selection: GameMetadata) {
    this.gameService.addFilter(selection);
  }

  removeFilter(selection: GameMetadata|Tag) {
    if ((selection as GameMetadata).type) {
      this.gameService.removeFilter(selection as GameMetadata);
    } else {
      this.gameService.removeTagFilter(selection as Tag);
    }
  }

  addTagFilter(tag: Tag) {
    this.gameService.addTagFilter(tag);
  }

  selectGame(event: MouseEvent, game: Game) {
    // this.location.go(`${POST_PREFIX}/${post.slug}`);
    this.router.navigate(['games', game.slug]);
  }

  gameMouseDown(event: MouseEvent, game: Game) {
    // Prevent middle clicks on posts from doing the little scroll thingie.
    if (event.which === 2) {
      event.stopPropagation();
      return false;
    }
  }

  gameMouseUp(event: MouseEvent, game: Game) {
    // On middle click, open the post in a new tab.
    // if (event.which === 2 && post.id !== this.service.selectedPostId) {
    //   event.stopPropagation();
    //   window.open(`${POST_PREFIX}/${post.slug}`)
    //   return false;
    // }
  }

  gameTrackBy(index: number, game: Game): string {
    return game.id;
  }
}
