import {Injectable} from '@angular/core';
import {AngularFirestore, DocumentReference} from '@angular/fire/firestore';
import {BehaviorSubject, combineLatest, from, Observable, of} from 'rxjs';
import {map, switchMap, throttleTime} from 'rxjs/operators';
import {COLLECTIONS} from '../shared/constants';
import {Tag, TagResponse} from '../shared/types';
import {UserService} from './user.service';

const LS_FILTER = 'tag-filter';

@Injectable({providedIn: 'root'})
export class TagsService {
  private tagmap = new Map<string, Observable<Tag>>();
  private tagLoaded$ = new BehaviorSubject<void>(null);

  private tagFilters_ = new Set<Partial<Tag>>();
  private tagFilter$: BehaviorSubject<Partial<Tag>[]>;

  private tags$: Observable<Tag[]>;

  constructor(
      private readonly firestore: AngularFirestore,
      private readonly userService: UserService,
  ) {
    const storageFilters = JSON.parse(localStorage.getItem(LS_FILTER));
    if (storageFilters) {
      this.tagFilters_ = new Set(storageFilters.tagFilters as Tag[]);
    }
    this.tagFilter$ =
        new BehaviorSubject<Partial<Tag>[]>([...this.tagFilters.values()]);
  }

  get tagFilters() {
    return this.tagFilters_;
  }

  get tagFilterChange$() {
    return this.tagFilter$.asObservable();
  }

  addTagFilter(selection: Partial<Tag>) {
    this.tagFilters.add(selection);
    this.tagFilter$.next([...this.tagFilters.values()]);
  }

  removeTagFilter(selection: Tag) {
    this.tagFilters.delete(selection);
    this.tagFilter$.next([...this.tagFilters.values()]);
  }

  fetchTags(): Observable<Tag[]> {
    if (!this.tags$) {
      this.tags$ =
          this.firestore
              .collection<TagResponse>(
                  COLLECTIONS.TAGS,
                  ref => {
                    return ref.orderBy('name').where('isDeleted', '==', false);
                  })
              .valueChanges({idField: 'id'})
              .pipe(throttleTime(500), switchMap(tags => {
                      return this.userService
                          .addUsersToResponse<TagResponse, Tag>(tags);
                    }));
    }
    return this.tags$;
  }

  getLoadedTags(): Observable<Tag[]> {
    return this.tagLoaded$.pipe(
        switchMap(() => combineLatest([...this.tagmap.values()])));
  }

  fetchTag(ref: DocumentReference): Observable<Tag> {
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
                          this.userService.addUsersToResponse<TagResponse, Tag>(
                              [tag])),
                  map(([tag]) => tag)));
      this.tagLoaded$.next(null);
    }
    return this.tagmap.get(id);
  }

  createTag(tagData: Partial<Tag>): Observable<DocumentReference<TagResponse>> {
    return this.userService.getBaseCreationData().pipe(
        switchMap(baseCreationData => {
          return from(
              this.firestore.collection<TagResponse>(COLLECTIONS.TAGS).add({
                ...baseCreationData,
                name: tagData.name,
                description: tagData.description
              }));
        }));
  }
}
