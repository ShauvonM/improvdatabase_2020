import {Injectable} from '@angular/core';
import {AngularFirestore, DocumentReference} from '@angular/fire/firestore';
import {BehaviorSubject, Observable} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {COLLECTIONS} from '../shared/constants';
import {GameMetadata, GameMetadataResponse} from '../shared/types';
import {TagsService} from './tags.service';
import {UserService} from './user.service';

const LS_FILTER = 'metadata-filter';

@Injectable({providedIn: 'root'})
export class GameMetadataService {
  private metadatas$: Observable<Map<string, GameMetadata>>;

  private metadataFilters_ = new Set<GameMetadata>();
  private metadataFilter$: BehaviorSubject<GameMetadata[]>;

  constructor(
      private readonly firestore: AngularFirestore,
      private readonly userService: UserService,
      private readonly tagService: TagsService,
  ) {
    const storageFilters = JSON.parse(localStorage.getItem(LS_FILTER));
    if (storageFilters) {
      this.metadataFilters_ =
          new Set(storageFilters.metadataFilters as GameMetadata[]);
    }
    this.metadataFilter$ = new BehaviorSubject<GameMetadata[]>(
        [...this.metadataFilters_.values()]);

    this.tagService.tagFilterChange$.subscribe(filters => {
      if (filters.length) {
        // Firestore can't combine these filters right now.
        this.metadataFilters_.clear();
        this.metadataFilter$.next([]);
        this.saveFilters();
      }
    })
  }

  get metadataFilters() {
    return this.metadataFilters_;
  }

  get metadataFilterChange$() {
    return this.metadataFilter$.asObservable();
  }

  addFilter(selection: GameMetadata) {
    this.metadataFilters.add(selection);
    this.metadataFilter$.next([...this.metadataFilters.values()]);
    this.saveFilters();
  }

  removeFilter(selection: GameMetadata) {
    this.metadataFilters.delete(selection);
    this.metadataFilter$.next([...this.metadataFilters.values()]);
    this.saveFilters();
  }

  saveFilters() {
    localStorage.setItem(LS_FILTER, JSON.stringify({
      metadataFilters: ([...this.metadataFilters.values()])
                           .map(m => ({id: m.id, name: m.name, type: m.type})),
    }));
  }

  fetchMetadatas(): Observable<Map<string, GameMetadata>> {
    if (!this.metadatas$) {
      this.metadatas$ =
          this.firestore.collection<GameMetadataResponse>(COLLECTIONS.METADATAS)
              .valueChanges({idField: 'id'})
              .pipe(
                  switchMap(
                      metadatas =>
                          this.userService.addUsersToResponse<
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
    return this.fetchMetadatas().pipe(
        map(metadataMap => metadataMap.get(ref.id)));
  }
}
