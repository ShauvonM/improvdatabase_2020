import {Injectable} from '@angular/core';
import {AngularFirestore, CollectionReference, DocumentData, DocumentReference} from '@angular/fire/firestore';
import firebase from 'firebase/app';
import {combineLatest, from, Observable, of, throwError} from 'rxjs';
import {debounceTime, map, switchMap, take} from 'rxjs/operators';
import {COLLECTIONS, DEFAULT_PAGE_SIZE, RANDOM} from '../shared/constants';
import {BaseGame, BaseResponse, Game, GameMetadata, GameResponse, NameResponse, Tag, TagResponse} from '../shared/types';
import {COUNTERS, CounterService} from './counter.service';
import {GameMetadataService} from './game-metadata.service';
import {TagsService} from './tags.service';
import {UserService} from './user.service';

interface GameResponseWithMetadata extends BaseResponse, BaseGame {
  duration: GameMetadata;
  playerCount: GameMetadata;
  tags: Tag[];
}

@Injectable({providedIn: 'root'})
export class GamesService {
  // private filterChangeSubject = new Subject<void>();

  private gamesAreDone = false;

  private selectedGameSlug_?: string;

  constructor(
      private readonly firestore: AngularFirestore,
      private readonly userService: UserService,
      private readonly tagService: TagsService,
      private readonly gameMetadataService: GameMetadataService,
      private readonly counterService: CounterService,
  ) {}

  get filters(): (GameMetadata|Partial<Tag>)[] {
    return [
      ...this.gameMetadataService.metadataFilters.values(),
      ...this.tagService.tagFilters.values()
    ];
  }

  get theresMore(): boolean {
    return !this.gamesAreDone && !this.selectedGameSlug_;
  }

  get selectedGameSlug() {
    return this.selectedGameSlug_;
  }

  getGameIcon(game: Game): {icon: string, description: string} {
    let icon = 'sports_kabaddi'
    let description =
        'This game is not categorized, either by choice or laziness.';
    if (game && game.tags && game.tags.length) {
      const tags = game.tags;
      const tagStrings = tags.map(tag => tag.name);
      if (tagStrings.includes('Show')) {
        icon = 'local_activity';
        description = 'A live performance style game.';
      }
      if (tagStrings.includes('Exercise')) {
        icon = 'emoji_objects';
        description = 'An excercise to hone your craft.';
      }
      if (tagStrings.includes('Warmup')) {
        icon = 'local_fire_department';
        description = 'A warmup style game.';
      }
    }
    return {icon, description};
  }

  private populateGameData({games, metamap, tags}: {
    games: GameResponse[]; metamap: Map<string, GameMetadata>; tags: Tag[]
  }): Observable<Game[]> {
    const gamesWithMetadata: GameResponseWithMetadata[] = [];
    for (const game of games) {
      gamesWithMetadata.push({
        ...game,
        playerCount: metamap.get(game.playerCount.id),
        duration: metamap.get(game.duration.id),
        tags: tags.filter(t => game.tags.findIndex(tr => tr.id === t.id) > -1)
      });
    }
    return this.userService.addUsersToResponse<GameResponseWithMetadata, Game>(
        gamesWithMetadata);
  }

  fetchGamePage(pageSize: number, startAfter?: string): Observable<Game[]> {
    this.selectedGameSlug_ = '';
    return combineLatest([
             this.gameMetadataService.metadataFilterChange$,
             this.tagService.tagFilterChange$,
           ])
        .pipe(
            debounceTime(5),
            switchMap(() => {
              this.gamesAreDone = false;
              return combineLatest([
                this.firestore
                    .collection<GameResponse>(
                        COLLECTIONS.GAMES,
                        ref =>
                            this.createGameQuery({ref, pageSize, startAfter}))
                    .valueChanges({idField: 'id'}),
                this.gameMetadataService.fetchMetadatas(),
                this.tagService.fetchTags(),
              ]);
            }),
            switchMap(([games, metamap, tags]) => {
              if (games.length < pageSize) {
                this.gamesAreDone = true;
              }
              return this.populateGameData({games, metamap, tags});
            }),
        );
  }

  selectGameBySlug(slug: string): Observable<Game> {
    let randomId;
    if (slug === RANDOM) {
      randomId = this.firestore.createId();
    }
    this.selectedGameSlug_ = slug;

    return combineLatest([
             this.firestore
                 .collection<GameResponse>(
                     COLLECTIONS.GAMES,
                     ref => this.createGameQuery(
                         {ref, pageSize: 1, slug, randomId}))
                 .valueChanges({idField: 'id'}),
             this.gameMetadataService.fetchMetadatas(),
             this.tagService.fetchTags(),
           ])
        .pipe(
            switchMap(([games, metamap, tags]) => {
              if (!games.length && slug === RANDOM) {
                console.log('>= did not match');
                return this.firestore
                    .collection<GameResponse>(
                        COLLECTIONS.GAMES, ref => this.createGameQuery({
                          ref,
                          pageSize: 1,
                          slug,
                          randomId,
                          randomBackup: true
                        }))
                    .valueChanges({idField: 'id'})
                    .pipe(map(games => {
                      return {games, metamap, tags};
                    }));
              }
              return of({games, metamap, tags});
            }),
            switchMap(({games, metamap, tags}) => {
              const gamesWithMetadata: GameResponseWithMetadata[] = [];
              for (const game of games) {
                gamesWithMetadata.push({
                  ...game,
                  playerCount: metamap.get(game.playerCount.id),
                  duration: metamap.get(game.duration.id),
                  tags: tags.filter(
                      t => game.tags.findIndex(tr => tr.id === t.id) > -1)
                });
              }
              return this.userService
                  .addUsersToResponse<GameResponseWithMetadata, Game>(
                      gamesWithMetadata);
            }),
            map(games => {
              console.log('game data', games[0]);
              this.selectedGameSlug_ = games[0].slug;
              return games[0];
            }));
  }

  private createGameQuery(
      {ref, pageSize, startAfter, slug, randomId, randomBackup}: {
        ref: CollectionReference<DocumentData>,
        pageSize: number,
        startAfter?: string,
        slug?: string,
        randomId?: string,
        randomBackup?: boolean,
      }) {
    let query = ref.where('isDeleted', '==', false);

    if (slug) {
      if (slug === RANDOM) {
        query = query.where(
            firebase.firestore.FieldPath.documentId(),
            randomBackup ? '<' : '>=', randomId)
      } else {
        return query.where('slug', '==', slug).limit(1);
      }
    } else {
      query = query.orderBy('name').orderBy('dateModified', 'desc');
    }

    const metadataFilters =
        [...this.gameMetadataService.metadataFilters.values()];
    const tagFilters = [...this.tagService.tagFilters.values()];

    if (metadataFilters && metadataFilters.length) {
      const playerCounts =
          metadataFilters.filter(f => f.type === 'playerCount');
      const durations = metadataFilters.filter(f => f.type === 'duration');
      if (playerCounts.length) {
        query = query.where(
            'playerCount', 'in',
            playerCounts.map(
                m => this.firestore.collection(COLLECTIONS.METADATAS)
                         .doc(m.id)
                         .ref));
      }
      if (durations.length) {
        query = query.where(
            'duration', 'in',
            durations.map(
                m => this.firestore.collection(COLLECTIONS.METADATAS)
                         .doc(m.id)
                         .ref));
      }
    }
    if (tagFilters && tagFilters.length) {
      query = query.where(
          'tags', 'array-contains-any',
          tagFilters.map(
              t => this.firestore.collection(COLLECTIONS.TAGS).doc(t.id).ref))
    }
    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    return query.limit(slug ? 1 : pageSize);
  }

  updateGame(game: Game, updates: {
    description?: string;
    tags?: Partial<Tag>[] | DocumentReference[]
  }): Observable<void> {
    let usableUpdates: {
      description?: string;
      tags?: DocumentReference[]; modifiedUser: string; dateModified: Date;
    };
    return this.userService.user$.pipe(
        take(1), switchMap(u => {
          usableUpdates = {modifiedUser: u.uid, dateModified: new Date()};
          return this.setupTags(updates.tags as Tag[]);
        }),
        switchMap(tagRefs => {
          if (tagRefs && tagRefs.length) {
            usableUpdates.tags = tagRefs;
          }
          if (updates.description) {
            usableUpdates.description = updates.description;
          }
          return from(this.firestore
                          .doc<GameResponse>(`${COLLECTIONS.GAMES}/${game.id}`)
                          .update(usableUpdates));
        }));
  }

  private setupTags(tags?: Tag[]|DocumentReference[]):
      Observable<DocumentReference<TagResponse>[]> {
    if (!tags || !tags.length) {
      return of([]);
    }
    if ((tags[0] as DocumentReference).path) {
      return of(tags as DocumentReference<TagResponse>[]);
    }
    const tagCreation: Observable<DocumentReference<TagResponse>>[] = [];
    for (const tag of tags) {
      if (!tag.id) {
        tagCreation.push(this.tagService.createTag(tag));
      } else {
        tagCreation.push(
            of(this.firestore.doc<TagResponse>(`${COLLECTIONS.TAGS}/${tag.id}`)
                   .ref))
      }
    }
    return combineLatest(tagCreation);
  }


  /**
   * Creates a new game document in the database, including any new new tags and
   * the new name. Throws errors if the name already exists.
   * @param game The game data to add to the database.
   * @returns The slug for the new game.
   */
  addGame(game: Partial<Game>): Observable<string> {
    let baseCreationData: BaseResponse;
    const slug = game.name.replace(/\s/g, '-')
                     .toLowerCase()
                     .replace(/(&[a-z0-9]+;)|(#[a-z0-9]+;)|[^a-z0-9\-]/g, '');
    return this.userService.getBaseCreationData().pipe(
        switchMap(base => {
          baseCreationData = base;

          // Check for a game that has the same slug.
          return this.firestore
              .collection<GameResponse>(
                  COLLECTIONS.GAMES,
                  ref => {
                    return this.createGameQuery(
                        {ref, pageSize: DEFAULT_PAGE_SIZE, slug});
                  })
              .valueChanges({idField: 'id'})
              .pipe(take(1));
        }),
        switchMap(existingGame => {
          if (existingGame && existingGame.length) {
            return throwError(
                {conflict: 'slug', conflictGameId: existingGame[0].id});
          }
          // Check to see if the name already exists.
          return this.firestore
              .collectionGroup<NameResponse>(
                  COLLECTIONS.NAMES,
                  ref => {
                    return ref.where('name', '==', game.name)
                        .where('isDeleted', '==', false);
                  })
              .valueChanges({idField: 'id'})
              .pipe(take(1));
        }),
        switchMap(existingName => {
          if (existingName && existingName.length) {
            return throwError(
                {conflict: 'name', conflictGameId: existingName[0].id});
          }

          // Create any new tags, note their IDs.
          const tags = game.tags;
          return this.setupTags(tags);
        }),
        switchMap(tagReferences => {
          // Set up the tag list and metadata document references.
          // And set up the game object with addedUser, etc.
          const gameData: GameResponse = {
            ...baseCreationData,
            name: game.name,
            slug,
            description: game.description,
            tags: tagReferences,
            playerCount:
                this.firestore
                    .doc(`${COLLECTIONS.METADATAS}/${game.playerCount.id}`)
                    .ref,
            duration: this.firestore
                          .doc(`${COLLECTIONS.METADATAS}/${game.duration.id}`)
                          .ref
          };

          // Create the game doc.
          return from(this.firestore.collection<GameResponse>(COLLECTIONS.GAMES)
                          .add(gameData));
        }),
        switchMap(gameRef => {
          this.counterService.incrementCounter(COUNTERS.GAMES);
          // Create the name doc.
          const gamePath = gameRef.path;
          const nameData: NameResponse = {
            ...baseCreationData,
            name: game.name,
            weight: 0,
          };
          return from(
              this.firestore
                  .collection<NameResponse>(`${gamePath}/${COLLECTIONS.NAMES}`)
                  .add(nameData))
        }),
        map(() => {
          return slug;
        }));
  }
}
