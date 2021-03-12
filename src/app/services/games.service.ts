import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore, CollectionReference, DocumentChangeAction, DocumentData, DocumentReference} from '@angular/fire/firestore';
import firebase from 'firebase/app';
import {BehaviorSubject, combineLatest, Observable, of, Subject} from 'rxjs';
import {debounceTime, map, switchMap, tap} from 'rxjs/operators';
import {COLLECTIONS, RANDOM} from '../shared/constants';
import {BaseClass, BaseResponse, Game, GameMetadata, GameMetadataResponse, GameResponse, Name, NameResponse, Note, NoteResponse, ParentType, Tag, TagResponse, User} from '../shared/types';
import {UserService} from './user.service';

const LS_FILTERS = 'gameListFilters'

const PAGE_SIZE = 20;

@Injectable({providedIn: 'root'})
export class GamesService {
  private metadatas$: Observable<Map<string, GameMetadata>>;

  private tagmap = new Map<string, Observable<Tag>>();
  private newTag$ = new BehaviorSubject<void>(null);

  private metadataFilters = new Set<GameMetadata>();
  private metadataFilter$: BehaviorSubject<GameMetadata[]>;

  private tagFilters = new Set<Tag>();
  private tagFilter$: BehaviorSubject<Tag[]>;

  private filterChangeSubject = new Subject<void>();

  private gamesAreDone = false;

  private selectedGameSlug_?: string;

  constructor(
      private readonly firestore: AngularFirestore,
      private readonly auth: AngularFireAuth,
      private readonly userService: UserService,
  ) {
    const storageFilters = JSON.parse(localStorage.getItem(LS_FILTERS));
    if (storageFilters) {
      this.tagFilters = new Set(storageFilters.tagFilters as Tag[]);
      this.metadataFilters =
          new Set(storageFilters.metadataFilters as GameMetadata[]);
    }
    this.metadataFilter$ =
        new BehaviorSubject<GameMetadata[]>([...this.metadataFilters.values()]);
    this.tagFilter$ = new BehaviorSubject<Tag[]>([...this.tagFilters.values()]);
  }

  get filters(): (GameMetadata|Tag)[] {
    return [...this.metadataFilters.values(), ...this.tagFilters.values()];
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
  }

  removeFilter(selection: GameMetadata) {
    this.metadataFilters.delete(selection);
    this.metadataFilter$.next([...this.metadataFilters.values()]);
    this.filterChangeSubject.next();
  }

  addTagFilter(selection: Tag) {
    // Firestore can't combine these filters.
    this.metadataFilters.clear();
    this.tagFilters.add(selection);
    this.metadataFilter$.next([]);
    this.tagFilter$.next([...this.tagFilters.values()]);
    this.filterChangeSubject.next();
  }

  removeTagFilter(selection: Tag) {
    this.tagFilters.delete(selection);
    this.tagFilter$.next([...this.tagFilters.values()]);
    this.filterChangeSubject.next();
  }

  saveFilters(metadataFilters: GameMetadata[], tagFilters: Tag[]) {
    localStorage.setItem(LS_FILTERS, JSON.stringify({
      metadataFilters:
          metadataFilters.map(m => ({id: m.id, name: m.name, type: m.type})),
      tagFilters: tagFilters.map(t => ({id: t.id, name: t.name}))
    }));
  }

  fetchGamePage(startAfter?: string): Observable<Game[]> {
    this.selectedGameSlug_ = '';
    return combineLatest([
             this.metadataFilter$,
             this.tagFilter$,
           ])
        .pipe(
            debounceTime(5),
            tap(([metadataFilters, tagFilters]) => {
              this.gamesAreDone = false;
              this.saveFilters(metadataFilters, tagFilters);
              return [metadataFilters, tagFilters];
            }),
            switchMap(
                ([
                  metadataFilters,
                  tagFilters,
                ]) =>
                    this.fetchGameData(
                        metadataFilters, tagFilters, startAfter)),
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

    const metadataFilters = [...this.metadataFilters];
    const tagFilters = [...this.tagFilters.values()];

    return combineLatest([
             this.firestore
                 .collection<GameResponse>(
                     COLLECTIONS.GAMES,
                     ref => this.createGameQuery(
                         {ref, metadataFilters, tagFilters, slug, randomId}))
                 .valueChanges({idField: 'id'}),
             this.getMetadatas()
           ])
        .pipe(
            switchMap(([games, metamap]) => {
              if (!games.length && slug === RANDOM) {
                console.log('>= did not match');
                return this.firestore
                    .collection<GameResponse>(
                        COLLECTIONS.GAMES, ref => this.createGameQuery({
                          ref,
                          metadataFilters,
                          tagFilters,
                          slug,
                          randomId,
                          randomBackup: true
                        }))
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

  fetchNames(game: Game): Observable<Name[]> {
    return this.firestore
        .collection<NameResponse>(
            `${COLLECTIONS.GAMES}/${game.id}/${COLLECTIONS.NAMES}`)
        .valueChanges({idField: 'id'})
        .pipe(switchMap(
            nameResponses =>
                this.switchResponseToClass<NameResponse, Name>(nameResponses)));
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
                    obs = this.getTag(noteResponse.parent);
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

  private createGameQuery({
    ref,
    metadataFilters,
    tagFilters,
    startAfter,
    slug,
    randomId,
    randomBackup
  }: {
    ref: CollectionReference<DocumentData>,
    metadataFilters: GameMetadata[],
    tagFilters: Tag[],
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

  private fetchGameData(
      metadataFilters: GameMetadata[], tagFilters: Tag[], startAfter?: string):
      Observable<
          [DocumentChangeAction<GameResponse>[], Map<string, GameMetadata>]> {
    return combineLatest([
      this.firestore
          .collection<GameResponse>(
              COLLECTIONS.GAMES,
              ref => this.createGameQuery(
                  {ref, metadataFilters, tagFilters, startAfter}))
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

  getTag(ref: DocumentReference): Observable<Tag> {
    if (!ref) {
      return of(null);
    }
    const id = ref.id;
    if (!this.tagmap.has(id)) {
      this.tagmap.set(
          id,
          this.firestore.collection<TagResponse>(COLLECTIONS.TAGS)
              .doc(id)
              .get()
              .pipe(
                  map(tag => {
                    return {...tag.data() as TagResponse, id: tag.id} as
                        TagResponse;
                  }),
                  switchMap(
                      tag =>
                          this.switchResponseToClass<TagResponse, Tag>([tag])),
                  map(([tag]) => tag)));
      this.newTag$.next(null);
    }
    return this.tagmap.get(id);
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
          combine.push(this.getTag(tag));
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

  getTags(): Observable<Tag[]> {
    return this.newTag$.pipe(
        switchMap(() => combineLatest([...this.tagmap.values()])));
  }
}
