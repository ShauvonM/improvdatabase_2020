import {Injectable} from '@angular/core';
import {AngularFirestore, DocumentChangeAction, DocumentReference} from '@angular/fire/firestore';
import {BehaviorSubject, combineLatest, Observable, of, Subject} from 'rxjs';
import {debounceTime, map, switchMap, tap} from 'rxjs/operators';
import {BaseClass, BaseResponse, Game, GameMetadata, GameMetadataResponse, GameResponse, Tag, TagResponse, User} from '../shared/types';


const COLLECTIONS = {
  GAMES: 'games',
  METADATAS: 'gamemetadatas',
  HISTORY: 'histories',
  INVITES: 'invites',
  NOTES: 'notes',
  TAGS: 'tags',
  TEAMS: 'teams',
  USERS: 'users',
};

const LS_FILTERS = 'gameListFilters'

const PAGE_SIZE = 20;

@Injectable({providedIn: 'root'})
export class GamesService {
  private metadatas$: Observable<Map<string, GameMetadata>>;

  /** A map of user ID to observable for that user data. */
  private usermap = new Map<string, Observable<User>>();

  private tagmap = new Map<string, Observable<Tag>>();
  private newTag$ = new BehaviorSubject<void>(null);

  private metadataFilters = new Set<GameMetadata>();
  private metadataFilter$: BehaviorSubject<GameMetadata[]>;

  private tagFilters = new Set<Tag>();
  private tagFilter$: BehaviorSubject<Tag[]>;

  private filterChangeSubject = new Subject<void>();

  private gamesAreDone = false;

  constructor(private readonly firestore: AngularFirestore) {
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
    return !this.gamesAreDone;
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
      metadataFilters: metadataFilters.map(m => ({id: m.id, name: m.name})),
      tagFilters: tagFilters.map(t => ({id: t.id, name: t.name}))
    }));
  }

  fetchGamePage(startAfter?: string): Observable<Game[]> {
    return combineLatest(
               this.metadataFilter$,
               this.tagFilter$,
               )
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

  private fetchGameData(
      metadataFilters: GameMetadata[], tagFilters: Tag[], startAfter?: string):
      Observable<
          [DocumentChangeAction<GameResponse>[], Map<string, GameMetadata>]> {
    return combineLatest(
        this.firestore
            .collection<GameResponse>(
                COLLECTIONS.GAMES,
                ref => {
                  // Set up the Firestore query...
                  let query = ref.orderBy('name')
                                  .orderBy('dateModified', 'desc')
                                  .where('isDeleted', '==', false);
                  if (metadataFilters && metadataFilters.length) {
                    const playerCounts =
                        metadataFilters.filter(f => f.type === 'playerCount');
                    const durations =
                        metadataFilters.filter(f => f.type === 'duration');
                    if (playerCounts.length) {
                      query = query.where(
                          'playerCount', 'in',
                          playerCounts.map(
                              m => this.firestore
                                       .collection(COLLECTIONS.METADATAS)
                                       .doc(m.id)
                                       .ref));
                    }
                    if (durations.length) {
                      query = query.where(
                          'duration', 'in',
                          durations.map(
                              m => this.firestore
                                       .collection(COLLECTIONS.METADATAS)
                                       .doc(m.id)
                                       .ref));
                    }
                  }
                  if (tagFilters && tagFilters.length) {
                    query = query.where(
                        'tags', 'array-contains-any',
                        tagFilters.map(
                            t => this.firestore.collection(COLLECTIONS.TAGS)
                                     .doc(t.id)
                                     .ref))
                  }
                  if (startAfter) {
                    query = query.startAfter(startAfter);
                  }
                  console.log('query', query);
                  return query.limit(PAGE_SIZE);
                })
            .snapshotChanges(),
        // Include all of the metadata items.
        this.getMetadatas())
  }

  private translateSnapshot<T>(s: DocumentChangeAction<T>): T {
    const data = s.payload.doc.data();
    const id = s.payload.doc.id;
    return {id, ...data};
  }

  private translateSnapshots<T>(snapshots: DocumentChangeAction<T>[]): T[] {
    return snapshots.map(s => this.translateSnapshot(s));
  }

  private getTag(ref: DocumentReference): Observable<Tag> {
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

  private getUser(ref: DocumentReference): Observable<User> {
    if (!ref) {
      return of(null);
    }
    const id = ref.id;
    if (!this.usermap.has(id)) {
      this.usermap.set(
          id,
          this.firestore.collection<User>(COLLECTIONS.USERS)
              .doc(id)
              .get()
              .pipe(map(user => {
                return {...user.data() as User, id: user.id};
              })));
    }
    return this.usermap.get(id);
  }

  private switchResponseToClass<Q extends BaseResponse, T extends BaseClass>(
      items: Q[]|GameResponse[],
      getOtherProps?: (item: Q|GameResponse) => Partial<T>): Observable<T[]> {
    const metaObservables: Observable<T>[] = [];
    for (const item of items) {
      const combine: Observable<Tag|User>[] = [
        this.getUser(item.addedUser),
        this.getUser(item.modifiedUser),
        this.getUser(item.deletedUser),
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

    return combineLatest(...metaObservables);
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

  getTags(): Observable<Tag[]> {
    return this.newTag$.pipe(
        switchMap(() => combineLatest([...this.tagmap.values()])));
  }
}
