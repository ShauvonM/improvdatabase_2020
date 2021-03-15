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

  private tagFilters_ = new Set<Tag>();
  private tagFilter$: BehaviorSubject<Tag[]>;

  constructor(
      private readonly firestore: AngularFirestore,
      private readonly userService: UserService,
  ) {
    const storageFilters = JSON.parse(localStorage.getItem(LS_FILTER));
    if (storageFilters) {
      this.tagFilters_ = new Set(storageFilters.tagFilters as Tag[]);
    }
    this.tagFilter$ = new BehaviorSubject<Tag[]>([...this.tagFilters.values()]);
  }

  get tagFilters() {
    return this.tagFilters_;
  }

  get tagFilterChange$() {
    return this.tagFilter$.asObservable();
  }

  addTagFilter(selection: Tag) {
    this.tagFilters.add(selection);
    this.tagFilter$.next([...this.tagFilters.values()]);
  }

  removeTagFilter(selection: Tag) {
    this.tagFilters.delete(selection);
    this.tagFilter$.next([...this.tagFilters.values()]);
  }

  fetchTags(): Observable<Tag[]> {
    return this.firestore
        .collection<TagResponse>(
            COLLECTIONS.TAGS,
            ref => {
              return ref.orderBy('name').where('isDeleted', '==', false);
            })
        .valueChanges({idField: 'id'})
        .pipe(throttleTime(500), switchMap(tags => {
                return this.loadUsers(tags);
              }));
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
                  switchMap(tag => this.loadUsers([tag])),
                  map(([tag]) => tag)));
      this.tagLoaded$.next(null);
    }
    return this.tagmap.get(id);
  }

  private loadUsers(tags: TagResponse[]): Observable<Tag[]> {
    const allTagUsers: Observable<Tag>[] = [];
    for (const tag of tags) {
      const combine = [
        this.userService.getUser(tag.addedUser),
        this.userService.getUser(tag.modifiedUser),
        this.userService.getUser(tag.deletedUser),
      ];
      allTagUsers.push(combineLatest(combine).pipe(
          map(([addedUser, modifiedUser, deletedUser]) => {
            return {...tag, addedUser, modifiedUser, deletedUser} as Tag;
          })))
    }
    return combineLatest(allTagUsers);
  }

  createTag(tagData: Partial<Tag>): Observable<DocumentReference<TagResponse>> {
    return this.userService.getBaseCreationData().pipe(
        switchMap(baseCreationData => {
          return from(
              this.firestore.collection<TagResponse>(COLLECTIONS.TAGS).add({
                ...baseCreationData,
                name: tagData.name,
              }));
        }));
  }
}
