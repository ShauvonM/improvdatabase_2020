import {Location} from '@angular/common';
import {Component} from '@angular/core';
import {PageEvent} from '@angular/material/paginator';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, NavigationStart, Router} from '@angular/router';
import {combineLatest, Observable} from 'rxjs';
import {filter, map, switchMap, take, tap} from 'rxjs/operators';
import {COUNTERS, CounterService} from '../services/counter.service';
import {GameMetadataService} from '../services/game-metadata.service';
import {GamesService} from '../services/games.service';
import {TagsService} from '../services/tags.service';
import {UserService} from '../services/user.service';
import {DEFAULT_PAGE_SIZE, RANDOM} from '../shared/constants';
import {ScreenDirective} from '../shared/screen.directive';
import {Game, GameMetadata, Tag} from '../shared/types';


@Component({
  selector: 'app-game-list-screen',
  templateUrl: './game-list-screen.component.html',
  styleUrls: ['./game-list-screen.component.scss'],
})
export class GameListScreenComponent extends ScreenDirective {
  // These are displayed in the filters.
  durations$: Observable<GameMetadata[]>;
  playerCounts$: Observable<GameMetadata[]>;
  tags$: Observable<Tag[]>;

  gameCount$: Observable<number>;
  pageSize = DEFAULT_PAGE_SIZE;
  pageIndex = 0;

  games$: Observable<Game[]>;
  startAfter: string[] = [''];
  totalCount = 0;
  activeCount = 0;

  isRandom = false;
  canAddGames = false;

  get filters(): (GameMetadata|Partial<Tag>)[] {
    return this.gameService.filters;
  }

  get theresMore(): boolean {
    return this.gameService.theresMore;
  }

  get isPostSelected(): boolean {
    return !!this.gameService.selectedGameSlug;
  }

  get count(): number {
    return this.theresMore ? this.totalCount : this.activeCount;
  }

  // Querying:
  // https://github.com/angular/angularfire/blob/master/docs/firestore/querying-collections.md

  constructor(
      private readonly gameService: GamesService,
      private readonly tagService: TagsService,
      private readonly counterService: CounterService,
      private readonly metadataService: GameMetadataService,
      private readonly route: ActivatedRoute,
      private readonly router: Router,
      private readonly location: Location,
      private readonly snackBar: MatSnackBar,
      private readonly userService: UserService,
  ) {
    super();

    this.durations$ = this.metadataService.fetchMetadatas().pipe(map(data => {
      return [...data.values()]
          .filter(m => m.type === 'duration')
          .sort((a, b) => (a.min - b.min) + (a.max - b.max));
    }));

    this.playerCounts$ =
        this.metadataService.fetchMetadatas().pipe(map(data => {
          return [...data.values()]
              .filter(m => m.type === 'playerCount')
              .sort((a, b) => (a.min - b.min) + (a.max - b.max));
        }));

    this.tags$ = this.tagService.fetchTags().pipe(map(tags => {
      return tags.sort((a, b) => a.name.localeCompare(b.name));
    }));

    this.counterService.fetchCount(COUNTERS.GAMES).subscribe(count => {
      this.totalCount = count;
    });

    this.router.events.pipe(filter(e => e instanceof NavigationStart))
        .subscribe((e: NavigationStart) => {
          if (e.url === '/games/random' && this.isRandom) {
            // If random was clicked once, it won't work again, so we'll handle
            // it manually.
            this.loadPage();
          }
        });

    combineLatest([
      this.metadataService.metadataFilterChange$,
      this.tagService.tagFilterChange$
    ]).subscribe(() => {
      this.reset();
    });

    this.userService.user$.pipe(take(1)).subscribe(
        user => this.canAddGames = !!user);
  }

  pageChange(pageEvent: PageEvent) {
    this.pageIndex = pageEvent.pageIndex;
    this.pageSize = pageEvent.pageSize;
    this.loadPage();
  }

  reset() {
    this.pageIndex = 0;
    this.activeCount = 0;
    this.startAfter = [''];
    this.loadPage();
  }

  loadPage() {
    this.games$ = this.route.params.pipe(
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
            return this.gameService.fetchGamePage(
                this.pageSize, this.startAfter[this.pageIndex]);
          }
        }),
        tap(games => {
          if (!this.startAfter[this.pageIndex + 1]) {
            this.activeCount += games.length;
            this.startAfter[this.pageIndex + 1] = games[games.length - 1].name;
          }
          console.log(
              'page', this.pageIndex, games, games[0].name,
              games[games.length - 1].name);
          return games;
        }));
  }

  addFilter(selection: GameMetadata) {
    this.metadataService.addFilter(selection);
  }

  removeFilter(selection: GameMetadata|Tag) {
    if ((selection as GameMetadata).type) {
      this.metadataService.removeFilter(selection as GameMetadata);
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
