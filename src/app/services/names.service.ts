import {Injectable} from '@angular/core';
import {AngularFirestore, DocumentReference} from '@angular/fire/firestore';
import firebase from 'firebase/app';
import {combineLatest, Observable, of} from 'rxjs';
import {debounceTime, map, switchMap, take, tap} from 'rxjs/operators';
import {COLLECTIONS} from '../shared/constants';
import {BaseClass, BaseResponse, Game, GameResponse, Name, NameResponse, NameVoteResponse, User} from '../shared/types';
import {UserService} from './user.service';

export enum NameVoteEffect {
  NAME_VOTE_UNKNOWN = 0,
  NAME_VOTE_ERROR = 1,
  NAME_VOTE_MADE = 2,
  NAME_VOTE_CHANGED = 3,
  NAME_VOTE_REMOVED = 4,
  NAME_VOTE_RENAME = 5,
}

@Injectable({providedIn: 'root'})
export class NamesService {
  constructor(
      private readonly firestore: AngularFirestore,
      private readonly userService: UserService,
  ) {}

  fetchNames(game: Game): Observable<Name[]> {
    return this.firestore
        .collection<NameResponse>(
            `${COLLECTIONS.GAMES}/${game.id}/${COLLECTIONS.NAMES}`,
            ref => ref.where('isDeleted', '==', false)
                       .orderBy('weight', 'desc')
                       .orderBy('dateAdded', 'desc'))
        .valueChanges({idField: 'id'})
        .pipe(switchMap(
            names => this.switchResponseToClass<NameResponse, Name>(names)));
  }

  fetchMyNameVotes(game: Game): Observable<NameVoteResponse[]> {
    return this.userService.user$
        .pipe(take(1), switchMap(user => {
                if (!user) {
                  return of([]);
                }
                return this.firestore
                    .collection<NameVoteResponse>(
                        `${COLLECTIONS.GAMES}/${game.id}/${
                            COLLECTIONS.NAME_VOTES}`,
                        ref => {
                          return ref.where('addedUser', '==', user.uid)
                              .where('isDeleted', '==', false);
                        })
                    .valueChanges({idField: 'id'});
              }))
        .pipe(debounceTime(500), tap(votes => console.log('my votes', votes)));
  }

  addNewName(game: Game, name: string):
      Observable<DocumentReference<NameResponse>> {
    return this.userService.user$.pipe(
        take(1), switchMap(user => {
          return this.firestore
              .collection<NameResponse>(
                  `${COLLECTIONS.GAMES}/${game.id}/${COLLECTIONS.NAMES}`)
              .add({
                name,
                weight: 0,
                addedUser: user.uid,
                dateAdded: new Date(),
                isDeleted: false,
                modifiedUser: null,
                dateModified: null
              });
        }));
  }

  removeName(game: Game, name: Name): Observable<NameVoteEffect> {
    let uid = '';
    return this.userService.user$.pipe(
        take(1), switchMap(user => {
          uid = user.uid;
          return this.firestore
              .doc(`${COLLECTIONS.GAMES}/${game.id}/${COLLECTIONS.NAMES}/${
                  name.id}`)
              .update(
                  {isDeleted: true, deletedUser: uid, dateDeleted: new Date()});
        }),
        map(() => {
          if (name.name === game.name) {
            // You just deleted the name for this game, dingus.
            this.fetchNames(game).pipe(take(1)).subscribe(names => {
              this.updateGameName(game, names, uid);
            });
            return NameVoteEffect.NAME_VOTE_RENAME;
          }
          return NameVoteEffect.NAME_VOTE_REMOVED;
        }));
  }

  voteForName(game: Game, name: Name, existingVotes: NameVoteResponse[]):
      Observable<NameVoteEffect> {
    let uid = '';
    let effect = NameVoteEffect.NAME_VOTE_UNKNOWN;
    return this.userService.user$.pipe(
        take(1),
        switchMap(user => {
          uid = user.uid;
          // If the name that was clicked was different than the existing
          // vote(s), we'll be adding a new vote.
          const addingNew =
              !existingVotes.find(vote => vote.nameId === name.id);
          const voteActions = [];

          // Remove existing votes!
          for (const vote of existingVotes) {
            effect = NameVoteEffect.NAME_VOTE_REMOVED;
            voteActions.push(
                this.firestore
                    .doc<NameVoteResponse>(`${COLLECTIONS.GAMES}/${game.id}/${
                        COLLECTIONS.NAME_VOTES}/${vote.id}`)
                    .update({
                      deletedUser: uid,
                      isDeleted: true,
                      dateModified:
                          null,  // These are never modified, only deleted.
                      dateDeleted: new Date(),
                    }));
            // Decrease the name's weight.
            voteActions.push(
                this.firestore
                    .doc<NameResponse>(`${COLLECTIONS.GAMES}/${game.id}/${
                        COLLECTIONS.NAMES}/${vote.nameId}`)
                    .update({
                      weight: firebase.firestore.FieldValue.increment(-1),
                      modifiedUser: uid,
                      dateModified: new Date()
                    }));
          }
          if (addingNew) {
            effect = effect === NameVoteEffect.NAME_VOTE_REMOVED ?
                NameVoteEffect.NAME_VOTE_CHANGED :
                NameVoteEffect.NAME_VOTE_MADE;
            voteActions.push(
                this.firestore
                    .collection<NameVoteResponse>(`${COLLECTIONS.GAMES}/${
                        game.id}/${COLLECTIONS.NAME_VOTES}`)
                    .add({
                      addedUser: uid,
                      dateAdded: new Date(),
                      nameId: name.id,
                      isDeleted: false,
                      legacyID: null,
                      dateModified: null,
                      modifiedUser: null,
                    }));
            // Increase the name's weight.
            voteActions.push(
                this.firestore
                    .doc<NameResponse>(`${COLLECTIONS.GAMES}/${game.id}/${
                        COLLECTIONS.NAMES}/${name.id}`)
                    .update({
                      weight: firebase.firestore.FieldValue.increment(1),
                      modifiedUser: uid,
                      dateModified: new Date()
                    }));
          }

          return combineLatest(voteActions);
        }),
        switchMap(() => this.fetchNames(game).pipe(take(1))),
        map(allNames => {
          // Determine if the game needs to be updated, now.
          console.log('names now', allNames);
          // The first name is the biggest weight. In the case of ties, the
          // newer name will win.
          const topName = allNames[0].name;
          if (topName !== game.name) {
            effect = NameVoteEffect.NAME_VOTE_RENAME;
            this.updateGameName(game, allNames, uid);
          }

          return effect;
        }),
    );
  }

  private updateGameName(game: Game, names: Name[], uid: string) {
    this.firestore.doc<GameResponse>(`${COLLECTIONS.GAMES}/${game.id}`)
        .update(
            {name: names[0].name, dateModified: new Date(), modifiedUser: uid});
  }

  /** Converts a response (user ID strings) to a populated class (user data). */
  private switchResponseToClass<Q extends BaseResponse, T extends BaseClass>(
      items: Q[]): Observable<T[]> {
    const itemObservables: Observable<T>[] = [];
    for (const item of items) {
      const combine: Observable<User>[] = [
        this.userService.getUser(item.addedUser),
        this.userService.getUser(item.modifiedUser),
        this.userService.getUser(item.deletedUser),
      ];
      itemObservables.push(combineLatest(combine).pipe(
          map(([addedUser, modifiedUser, deletedUser]) => {
            return {
              ...item as any,
              addedUser,
              modifiedUser,
              deletedUser,
            } as T
          })));
    }
    return combineLatest(itemObservables);
  }
}
