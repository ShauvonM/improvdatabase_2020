import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore} from '@angular/fire/firestore';
import {combineLatest, Observable, of} from 'rxjs';
import {map, switchMap, take} from 'rxjs/operators';
import {COLLECTIONS} from '../shared/constants';
import {BaseClass, BaseResponse, User} from '../shared/types';

const staticUser: User = {
  uid: '',
  address: '',
  birthday: null,
  city: '',
  company: '',
  country: '',
  email: '',
  name: '',
  locked: false,
  phone: '',
  state: '',
  superUser: false,
  title: '',
  url: '',
  zip: '',
  firebaseUser: null,
  isDeleted: false,
  dateAdded: null,
  dateModified: null
};

@Injectable({providedIn: 'root'})
export class UserService {
  /** A map of user ID to observable for that user data. */
  private usermap = new Map<string, Observable<User>>();

  user$: Observable<User>;

  constructor(
      private readonly firestore: AngularFirestore,
      private readonly auth: AngularFireAuth,
  ) {
    this.user$ = this.auth.user.pipe(switchMap(fbUser => {
      if (fbUser) {
        return this.firestore.doc<User>(`${COLLECTIONS.USERS}/${fbUser.uid}`)
            .snapshotChanges()
            .pipe(map(user => {
              const userData = user.payload.data();
              if (!user.payload.exists) {
                this.firestore.collection<User>(COLLECTIONS.USERS)
                    .doc(fbUser.uid)
                    .set({
                      ...staticUser,
                      uid: fbUser.uid,
                      email: fbUser.email,
                      name: fbUser.displayName,
                      dateAdded: new Date()
                    });
              }
              return {...userData, firebaseUser: fbUser};
            }));
      } else {
        return of(null);
      }
    }));
  }

  logout() {
    this.auth.signOut();
  }

  getUser(uid: string): Observable<User> {
    if (!uid) {
      return of(null);
    }
    if (!this.usermap.has(uid)) {
      // Only logged in users can see users.
      this.usermap.set(
          uid,
          this.auth.user.pipe(
              take(1), switchMap(user => {
                if (user) {
                  return this.firestore.collection<User>(COLLECTIONS.USERS)
                      .doc(uid)
                      .get()
                      .pipe(map(user => {
                        return {...user.data() as User, id: user.id};
                      }));
                } else {
                  return of(null);
                }
              })));
    }
    return this.usermap.get(uid);
  }

  getBaseCreationData(): Observable<BaseResponse> {
    const baseCreationData: BaseResponse = {
      addedUser: null,
      dateAdded: new Date(),
      modifiedUser: null,
      dateModified: null,
      isDeleted: false,
    };
    return this.user$.pipe(take(1), map(user => {
                             baseCreationData.addedUser = user.uid;
                             return baseCreationData;
                           }));
  }

  getBaseDeletionData(): Observable<Partial<BaseResponse>> {
    const baseDeletionData: Partial<BaseResponse> = {
      dateDeleted: new Date(),
      deletedUser: null,
      isDeleted: true
    };
    return this.user$.pipe(take(1), map(user => {
                             baseDeletionData.deletedUser = user.uid;
                             return baseDeletionData;
                           }));
  }

  getBaseUpdateData(): Observable<Partial<BaseResponse>> {
    const baseData:
        Partial<BaseResponse> = {dateModified: new Date(), modifiedUser: null};
    return this.user$.pipe(take(1), map(user => {
                             baseData.modifiedUser = user.uid;
                             return baseData;
                           }));
  }

  addUsersToResponse<Q extends BaseResponse, T extends BaseClass>(items: Q[]):
      Observable<T[]> {
    if (!items || !items.length) {
      return of([]);
    }
    const allUsers: Observable<T>[] = [];
    for (const item of items) {
      const combine = [
        this.getUser(item.addedUser),
        this.getUser(item.modifiedUser),
        this.getUser(item.deletedUser),
      ];
      allUsers.push(combineLatest(combine).pipe(
          map(([addedUser, modifiedUser, deletedUser]) => {
            return {
              ...item,
              addedUser,
              modifiedUser,
              deletedUser,
            } as unknown as T;
          })))
    }
    return combineLatest(allUsers);
  }
}
