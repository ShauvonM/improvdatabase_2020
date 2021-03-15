import {Location} from '@angular/common';
import {Component} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, NavigationStart, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {filter, map, switchMap, take, tap} from 'rxjs/operators';
import {GamesService} from '../services/games.service';
import {TagsService} from '../services/tags.service';
import {UserService} from '../services/user.service';
import {RANDOM} from '../shared/constants';
import {ScreenDirective} from '../shared/screen.directive';
import {Game, GameMetadata, Tag} from '../shared/types';


@Component({
  selector: 'app-game-list-screen',
  templateUrl: './game-list-screen.component.html',
  styleUrls: ['./game-list-screen.component.scss']
})
export class GameListScreenComponent extends ScreenDirective {
  // games$: Observable<Game[]>;

  // These are displayed in the filters.
  durations$: Observable<GameMetadata[]>;
  playerCounts$: Observable<GameMetadata[]>;
  tags$: Observable<Tag[]>;

  // A list of observables to display each "page" of results.
  gamePages: Observable<Game[]>[] = [];

  isRandom = false;
  canAddGames = false;

  get filters(): (GameMetadata|Tag)[] {
    return this.gameService.filters;
  }

  get theresMore(): boolean {
    return this.gameService.theresMore;
  }

  get isPostSelected(): boolean {
    return !!this.gameService.selectedGameSlug;
  }

  // Querying:
  // https://github.com/angular/angularfire/blob/master/docs/firestore/querying-collections.md

  constructor(
      private readonly gameService: GamesService,
      private readonly tagService: TagsService,
      private readonly route: ActivatedRoute,
      private readonly router: Router,
      private readonly location: Location,
      private readonly snackBar: MatSnackBar,
      private readonly userService: UserService,
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

    this.tags$ = this.tagService.fetchTags().pipe(map(tags => {
      return tags.sort((a, b) => a.name.localeCompare(b.name));
    }));

    this.loadPage();

    this.router.events.pipe(filter(e => e instanceof NavigationStart))
        .subscribe((e: NavigationStart) => {
          if (e.url === '/games/random' && this.isRandom) {
            // If random was clicked once, it won't work again, so we'll handle
            // it manually.
            this.gamePages = [];
            this.loadPage();
          }
        });

    this.gameService.filterChange$.subscribe(() => {
      this.reset();
    });

    this.userService.user$.pipe(take(1)).subscribe(
        user => this.canAddGames = !!user);
  }

  reset() {
    this.gamePages = [];
    this.loadPage();
  }

  loadPage(lastPage?: Game[]) {
    let startAfter = '';
    if (lastPage) {
      startAfter = lastPage[lastPage.length - 1].name;
    }
    this.gamePages.push(this.route.params.pipe(
        switchMap(params => {
          this.isRandom = false;
          if (params.slug) {
            if (params.slug === RANDOM) {
              const filterCount = this.gameService.filters.length;
              let msg = '';
              if (filterCount) {
                msg = `Finding a random game from ${filterCount} filter(s).`;
              } else {
                msg = 'Finding a random game.'
              }
              this.snackBar.open(msg, '', {duration: 3000});
            }
            return this.gameService.selectGameBySlug(params.slug)
                .pipe(map(game => {
                  if (params.slug === RANDOM) {
                    this.isRandom = true;

                    this.location.replaceState(
                        `games/${this.gameService.selectedGameSlug}`);
                  }
                  return [game];
                }));
          } else {
            return this.gameService.fetchGamePage(startAfter);
          }
        }),
        tap(games => {
          console.log(
              'page', games, games[0].name, games[games.length - 1].name);
          return games;
        })));
  }

  addFilter(selection: GameMetadata) {
    this.gameService.addFilter(selection);
  }

  removeFilter(selection: GameMetadata|Tag) {
    if ((selection as GameMetadata).type) {
      this.gameService.removeFilter(selection as GameMetadata);
    } else {
      this.tagService.removeTagFilter(selection as Tag);
    }
  }

  addTagFilter(tag: Tag) {
    this.tagService.addTagFilter(tag);
  }

  selectGame(event: MouseEvent, game: Game) {
    if (this.isPostSelected) {
      return;
    }
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

  addGame() {
    this.router.navigate(['addgame']);
  }
}
