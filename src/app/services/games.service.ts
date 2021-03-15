import {Injectable} from '@angular/core';
import {AngularFirestore, CollectionReference, DocumentChangeAction, DocumentData, DocumentReference} from '@angular/fire/firestore';
import firebase from 'firebase/app';
import {BehaviorSubject, combineLatest, from, Observable, of, Subject, throwError} from 'rxjs';
import {debounceTime, map, switchMap, take, tap} from 'rxjs/operators';
import {COLLECTIONS, RANDOM} from '../shared/constants';
import {BaseClass, BaseResponse, Game, GameMetadata, GameMetadataResponse, GameResponse, NameResponse, Note, NoteResponse, ParentType, Tag, TagResponse, User} from '../shared/types';
import {TagsService} from './tags.service';
import {UserService} from './user.service';

const PAGE_SIZE = 20;
const LS_FILTER = 'metadata-filter';

@Injectable({providedIn: 'root'})
export class GamesService {
  private metadatas$: Observable<Map<string, GameMetadata>>;

  private metadataFilters = new Set<GameMetadata>();
  private metadataFilter$: BehaviorSubject<GameMetadata[]>;

  private filterChangeSubject = new Subject<void>();

  private gamesAreDone = false;

  private selectedGameSlug_?: string;

  constructor(
      private readonly firestore: AngularFirestore,
      private readonly userService: UserService,
      private readonly tagService: TagsService,
  ) {
    const storageFilters = JSON.parse(localStorage.getItem(LS_FILTER));
    if (storageFilters) {
      this.metadataFilters =
          new Set(storageFilters.metadataFilters as GameMetadata[]);
    }
    this.metadataFilter$ =
        new BehaviorSubject<GameMetadata[]>([...this.metadataFilters.values()]);

    this.tagService.tagFilterChange$.subscribe(filters => {
      if (filters.length) {
        // Firestore can't combine these filters right now.
        this.metadataFilters.clear();
        this.metadataFilter$.next([]);
        this.saveFilters();
      }
      this.filterChangeSubject.next();
    })
  }

  get filters(): (GameMetadata|Tag)[] {
    return [
      ...this.metadataFilters.values(), ...this.tagService.tagFilters.values()
    ];
  }

  get theresMore(): boolean {
    return !this.gamesAreDone && !this.selectedGameSlug_;
  }

  get selectedGameSlug() {
    return this.selectedGameSlug_;
  }

  get filterChange$(): Observable<any> {
    return this.filterChangeSubject.asObservable();
  }

  addFilter(selection: GameMetadata) {
    this.metadataFilters.add(selection);
    this.metadataFilter$.next([...this.metadataFilters.values()]);
    this.filterChangeSubject.next();
    this.saveFilters();
  }

  removeFilter(selection: GameMetadata) {
    this.metadataFilters.delete(selection);
    this.metadataFilter$.next([...this.metadataFilters.values()]);
    this.filterChangeSubject.next();
    this.saveFilters();
  }

  saveFilters() {
    localStorage.setItem(LS_FILTER, JSON.stringify({
      metadataFilters: ([...this.metadataFilters.values()])
                           .map(m => ({id: m.id, name: m.name, type: m.type})),
    }));
  }

  fetchGamePage(startAfter?: string): Observable<Game[]> {
    this.selectedGameSlug_ = '';
    return combineLatest([
             this.metadataFilter$,
             this.tagService.tagFilterChange$,
           ])
        .pipe(
            debounceTime(5),
            tap(() => {
              this.gamesAreDone = false;
            }),
            switchMap(() => this.fetchGameData(startAfter)),
            map(([
                  games,
                  metamap,
                ]) => {
              if (games.length < PAGE_SIZE) {
                this.gamesAreDone = true;
              }
              return [
                this.translateSnapshots<GameResponse>(games), metamap
              ] as [GameResponse[], Map<string, GameMetadata>];
            }),
            switchMap(
                ([
                  games,
                  metamap,
                ]) =>
                    this.switchResponseToClass<GameResponse, Game>(
                        games,
                        game => {
                          return {
                            playerCount: game.playerCount ?
                                metamap.get(game.playerCount.id) :
                                null,
                            duration: game.duration ?
                                metamap.get(game.duration.id) :
                                null,
                            tags: [],
                          };
                        })),
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
                     ref => this.createGameQuery({ref, slug, randomId}))
                 .valueChanges({idField: 'id'}),
             this.getMetadatas()
           ])
        .pipe(
            switchMap(([games, metamap]) => {
              if (!games.length && slug === RANDOM) {
                console.log('>= did not match');
                return this.firestore
                    .collection<GameResponse>(
                        COLLECTIONS.GAMES,
                        ref => this.createGameQuery(
                            {ref, slug, randomId, randomBackup: true}))
                    .valueChanges({idField: 'id'})
                    .pipe(map(games => {
                      return {games, metamap};
                    }));
              }

              return of({games, metamap});
            }),
            switchMap(
                ({
                  games,
                  metamap,
                }) =>
                    this.switchResponseToClass<GameResponse, Game>(
                        games,
                        game => {
                          const playerCount = game.playerCount ?
                              metamap.get(game.playerCount.id) :
                              null;
                          const duration = game.duration ?
                              metamap.get(game.duration.id) :
                              null;
                          return {playerCount, duration};
                        })),
            map(games => {
              console.log('game data', games[0]);
              this.selectedGameSlug_ = games[0].slug;
              return games[0];
            }));
  }

  fetchNotes(game: Game): Observable<Note[]> {
    let noteResponsesTmp: NoteResponse[];
    return this.firestore
        .collection<NoteResponse>(
            COLLECTIONS.NOTES,
            ref => {
              // TODO: Do another query for the current user's private notes.
              let query = ref.orderBy('dateModified', 'desc')
                              .where('isDeleted', '==', false)
                              .where('public', '==', true);
              const parents: DocumentReference[] = [];
              parents.push(
                  this.firestore.doc(`/${COLLECTIONS.GAMES}/${game.id}`).ref);
              parents.push(
                  this.firestore
                      .doc(`/${COLLECTIONS.METADATAS}/${game.duration.id}`)
                      .ref);
              parents.push(
                  this.firestore
                      .doc(`/${COLLECTIONS.METADATAS}/${game.playerCount.id}`)
                      .ref);
              for (const tag of game.tags) {
                parents.push(
                    this.firestore.doc(`/${COLLECTIONS.TAGS}/${tag.id}`).ref);
              }
              query = query.where('parent', 'in', parents);
              return query;
            })
        .valueChanges({idField: 'id'})
        .pipe(
            switchMap(noteResponses => {
              noteResponsesTmp = noteResponses;
              const parents: Observable<ParentType>[] = [];
              for (const noteResponse of noteResponses) {
                const path = noteResponse.parent.path;
                const collection = path.split('/')[0];
                let obs: Observable<ParentType>;
                switch (collection) {
                  case COLLECTIONS.TAGS:
                    obs = this.tagService.fetchTag(noteResponse.parent);
                    break;
                  case COLLECTIONS.GAMES:
                    obs = of(game);
                    break;
                  case COLLECTIONS.METADATAS:
                    obs = this.getMetadata(noteResponse.parent);
                    break;
                  default:
                    break;
                }
                if (obs) {
                  parents.push(obs);
                }
              }
              return combineLatest(parents);
            }),
            switchMap((parents) => {
              return this.switchResponseToClass<NoteResponse, Note>(
                  noteResponsesTmp, (noteResponse: NoteResponse) => {
                    const parent =
                        parents.find(p => p.id === noteResponse.parent.id);
                    return {
                      parent,
                      parentCollection: noteResponse.parent.path.split('/')[0]
                    };
                  });
            }));
  }

  private createGameQuery({ref, startAfter, slug, randomId, randomBackup}: {
    ref: CollectionReference<DocumentData>,
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

    const metadataFilters = [...this.metadataFilters.values()];
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
    return query.limit(slug ? 1 : PAGE_SIZE);
  }

  private fetchGameData(startAfter?: string): Observable<
      [DocumentChangeAction<GameResponse>[], Map<string, GameMetadata>]> {
    return combineLatest([
      this.firestore
          .collection<GameResponse>(
              COLLECTIONS.GAMES, ref => this.createGameQuery({ref, startAfter}))
          .snapshotChanges(),
      // Include all of the metadata items.
      this.getMetadatas()
    ])
  }

  private translateSnapshot<T>(s: DocumentChangeAction<T>): T {
    const data = s.payload.doc.data();
    const id = s.payload.doc.id;
    return {id, ...data};
  }

  private translateSnapshots<T>(snapshots: DocumentChangeAction<T>[]): T[] {
    return snapshots.map(s => this.translateSnapshot(s));
  }

  private switchResponseToClass<Q extends BaseResponse, T extends BaseClass>(
      items: Q[]|GameResponse[],
      getOtherProps?: (item: Q|GameResponse) => Partial<T>): Observable<T[]> {
    const metaObservables: Observable<T>[] = [];
    for (const item of items) {
      const combine: Observable<Tag|User>[] = [
        this.userService.getUser(item.addedUser),
        this.userService.getUser(item.modifiedUser),
        this.userService.getUser(item.deletedUser),
      ];
      if ((item as GameResponse).tags) {
        for (const tag of (item as GameResponse).tags) {
          combine.push(this.tagService.fetchTag(tag));
        }
      }
      metaObservables.push(combineLatest(combine).pipe(
          map(([addedUser, modifiedUser, deletedUser, ...tags]) => {
            let otherProps: Partial<T> = {};
            if (getOtherProps) {
              otherProps = getOtherProps(item);
            }
            if (tags && tags.length) {
              (otherProps as Partial<Game>).tags = (tags as Tag[]);
            }
            return {
              ...item as any,
              addedUser,
              modifiedUser,
              deletedUser,
              ...otherProps,
            } as T
          })));
    }

    return combineLatest(metaObservables);
  }

  getMetadatas(): Observable<Map<string, GameMetadata>> {
    if (!this.metadatas$) {
      this.metadatas$ =
          this.firestore.collection<GameMetadataResponse>(COLLECTIONS.METADATAS)
              .snapshotChanges()
              .pipe(
                  map(metadatas =>
                          this.translateSnapshots<GameMetadataResponse>(
                              metadatas)),
                  switchMap(
                      metadatas =>
                          this.switchResponseToClass<
                              GameMetadataResponse, GameMetadata>(metadatas)),
                  map(metadatas => {
                    const map = new Map<string, GameMetadata>();
                    for (const metadata of metadatas) {
                      map.set(metadata.id, metadata);
                    }
                    return map;
                  }));
    }
    return this.metadatas$;
  }

  getMetadata(ref: DocumentReference): Observable<GameMetadata> {
    return this.getMetadatas().pipe(
        map(metadataMap => metadataMap.get(ref.id)));
  }

  saveDescription(game: Game, description: string): Observable<void> {
    return this.userService.user$.pipe(
        take(1), switchMap(user => {
          return from(this.firestore
                          .doc<GameResponse>(`${COLLECTIONS.GAMES}/${game.id}`)
                          .update({
                            description,
                            modifiedUser: user.uid,
                            dateModified: new Date()
                          }));
        }));
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
                    return this.createGameQuery({ref, slug});
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
          const tagCreation: Observable<DocumentReference<TagResponse>>[] = [];
          for (const tag of tags) {
            if (!tag.id) {
              tagCreation.push(this.tagService.createTag(tag));
            } else {
              tagCreation.push(
                  of(this.firestore
                         .doc<TagResponse>(`${COLLECTIONS.TAGS}/${tag.id}`)
                         .ref))
            }
          }
          return combineLatest(tagCreation);
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
