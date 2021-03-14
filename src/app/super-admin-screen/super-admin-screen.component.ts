import {Component} from '@angular/core';
import {AngularFirestore, DocumentReference} from '@angular/fire/firestore';
import {take} from 'rxjs/operators';
import {UserService} from '../services/user.service';
import {ScreenDirective} from '../shared/screen.directive';
import {Base, BaseResponse, GameMetadataResponse, GameResponse, NameResponse, NoteResponse, TagResponse, Timestamp, User} from '../shared/types';


const staticTime: Timestamp = {
  seconds: 0,
  nanoseconds: 0
};

const staticBase: Base = {
  id: '',
  legacyID: 0,
  dateAdded: {...staticTime},
  dateModified: null,
  dateDeleted: null,
  description: '',
  isDeleted: false,
  mongoID: '',
};

const staticBaseResponse: BaseResponse = {
  ...staticBase,
  addedUser: null,
  modifiedUser: null,
  deletedUser: null
};

const staticUser: User = {
  ...staticBase,
  uid: '',
  address: '',
  birthday: {...staticTime},
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
};

const staticGameMetadata: GameMetadataResponse = {
  ...staticBaseResponse,
  max: 0,
  min: 0,
  name: '',
  type: 'playerCount'
};

const staticTag: TagResponse = {
  ...staticBaseResponse,
  name: ''
};

const staticGame: GameResponse = {
  ...staticBaseResponse,
  name: '',
  slug: '',
  duration: null,
  playerCount: null,
  tags: []
};

const staticName: NameResponse = {
  ...staticBaseResponse,
  name: '',
  weight: 0,
};

const staticNote: NoteResponse = {
  ...staticBaseResponse,
  public: false,
  parent: null
};

@Component({
  selector: 'app-super-admin-screen',
  templateUrl: './super-admin-screen.component.html',
  styleUrls: ['./super-admin-screen.component.scss']
})
export class SuperAdminScreenComponent extends ScreenDirective {
  output = '';

  constructor(
      private readonly firestore: AngularFirestore,
      private readonly userService: UserService,
  ) {
    super();

    // this.deleteNewStuff(COLLECTIONS.USERS);
    // this.deleteNewStuff(COLLECTIONS.METADATAS);
    // this.deleteNewStuff(COLLECTIONS.TAGS);
    // this.deleteNewStuff(COLLECTIONS.GAMES);
    // this.deleteNewStuff(COLLECTIONS.NOTES);

    // this.resetIds();
    this.userService.user$.subscribe(() => {});
  }

  private newIds = new Map<string, string>();
  private oldShauvonId = '2cNzDZHc6bt8sERR0CDS';
  private newShauvonId = '73dkDrAOsuXA0SB7ly7grnHoixn2';


  updateUserRefs(collection: string) {
    if (collection === 'names') {
      this.firestore
          .collectionGroup<NameResponse>(
              'names',
              ref => {
                return ref.orderBy('name');
              })
          .snapshotChanges()
          .pipe(take(1))
          .subscribe(names => {
            console.log(names);
            // const gamePaths = new Set<string>();
            let gameCount = 0;
            let deadGameCount = 0;
            for (const name of names) {
              const nameData = name.payload.doc.data();
              const addedUser: DocumentReference = (nameData as any).addedUser;
              const modifiedUser: DocumentReference =
                  (nameData as any).modifiedUser;
              const deletedUser: DocumentReference =
                  (nameData as any).deletedUser;

              // const gamePath = name.payload.doc.ref.parent.parent.path;
              // gamePaths.add(gamePath);

              // this.firestore.doc(gamePath)
              //     .valueChanges()
              //     .pipe(take(1))
              //     .subscribe(game => {
              //       // console.log(name.payload.doc.ref.path, 'has game?',
              //       // !!game);
              //       if (game) {
              //         gameCount++;
              //       } else {
              //         deadGameCount++;
              //         this.firestore.doc(name.payload.doc.ref.path).delete();
              //       }
              //       if (gameCount + deadGameCount === names.length) {
              //         console.log(
              //             gameCount, 'names with games', deadGameCount,
              //             'names without');
              //       }
              //       if (!game) {
              //       }
              //     });

              this.firestore.doc(name.payload.doc.ref.path).update({
                addedUser: addedUser ? addedUser.id : null,
                modifiedUser: modifiedUser ? modifiedUser.id : null,
                deletedUser: deletedUser ? deletedUser.id : null
              });
            }

            console.log('updated', names.length, 'names');

            // let gameCount = 0;
            // let deadGameCount = 0;
            // for (const gamePath of gamePaths) {
            //   this.firestore.doc(gamePath)
            //       .valueChanges()
            //       .pipe(take(1))
            //       .subscribe(game => {
            //         if (game) {
            //           gameCount++;
            //         } else {
            //           deadGameCount++;
            //           this.firestore.doc(gamePath).collection('names')
            //         }
            //         if (gameCount + deadGameCount === gamePaths.size) {
            //           console.log(
            //               gameCount, 'games', deadGameCount, 'dead games');
            //         }
            // });
            // }
          });
    } else {
      this.firestore.collection<BaseResponse>(collection)
          .valueChanges({idField: 'id'})
          .pipe(take(1))
          .subscribe(docs => {
            for (const doc of docs) {
              // const addedUser: DocumentReference = (doc as any).addedUser;
              // const modifiedUser: DocumentReference = (doc as
              // any).modifiedUser; const deletedUser: DocumentReference = (doc
              // as any).deletedUser;

              // this.firestore.doc(collection + '/' + doc.id).update({
              //   addedUser: addedUser ? addedUser.id : null,
              //   modifiedUser: modifiedUser ? modifiedUser.id : null,
              //   deletedUser: deletedUser ? deletedUser.id : null
              // });
            }
            console.log('updated', docs.length, collection);
          });
    }
  }

  /**
   * Deletes users with newer Firestore IDs.
   * @param old
   * @param staticObj
   */
  // deleteNewStuff(collection: string) {
  //   this.firestore.collection<BaseResponse>(collection)
  //       .valueChanges({idField: 'id'})
  //       .pipe(take(1))
  //       .subscribe(docs => {
  //         let namecount = 0;
  //         let namedonecount = 0;
  //         let deletedCount = 0;
  //         for (const doc of docs) {
  //           if (!doc.mongoID) {
  //             deletedCount++;
  //             this.firestore.doc(collection + '/' + doc.id).delete();
  //             if (collection === 'games') {
  //               this.firestore.doc(collection + '/' + doc.id)
  //                   .collection('names')
  //                   .valueChanges({idField: 'id'})
  //                   .subscribe(names => {
  //                     for (const name of names) {
  //                       this.firestore
  //                           .doc(
  //                               collection + '/' + doc.id + '/names/' +
  //                               name.id)
  //                           .delete();
  //                       namecount++;
  //                     }
  //                     namedonecount++;
  //                     if (namedonecount === deletedCount) {
  //                       console.log('deleted', namecount, 'names');
  //                     }
  //                   });
  //             }
  //           }
  //         }
  //         console.log('deleted', deletedCount, collection);
  //       });
  // }

  // copyDocumentWithNewId<T extends Base>(
  //     old: T, staticObj: T, collection: string): T {
  //   const oldId = old.id;
  //   const newId = this.firestore.createId();
  //   this.newIds.set(`${collection}/${oldId}`, `${collection}/${newId}`);

  //   const newDoc: T = {...staticObj};
  //   for (const field in newDoc) {
  //     if (field === 'tags') {
  //       const docArray = (old as any)[field] as DocumentReference[];
  //       const newArray = [];
  //       for (const tag of docArray) {
  //         const oldPath = tag.path;
  //         const newPath = this.newIds.get(oldPath);
  //         if (!newPath) {
  //           console.error('missing', oldPath);
  //         }
  //         newArray.push(this.firestore.doc(newPath).ref)
  //       };
  //       (newDoc as any)[field] = newArray;
  //     } else if (
  //         old[field] && ((old as any)[field] as DocumentReference).path) {
  //       const oldPath = ((old as any)[field] as DocumentReference).path;
  //       let newPath = this.newIds.get(oldPath);
  //       if (!newPath) {
  //         console.error('missing', oldPath);
  //         if (field.includes('User')) {
  //           newPath = 'users/' + this.shauvonId;
  //         }
  //       }

  //       if (newPath) {
  //         (newDoc as any)[field] = this.firestore.doc(newPath).ref;
  //       }
  //     } else if (field !== 'id' && field !== 'mongoID') {
  //       newDoc[field] = old[field] || newDoc[field];
  //     }
  //   }

  //   if ((newDoc as any).firstName === 'Shauvon') {
  //     this.shauvonId = newId;
  //   }

  //   newDoc.id = newId;
  //   newDoc.mongoID = oldId;

  //   return newDoc;
  // }

  // resetIds() {
  //   this.firestore.collection<User>(COLLECTIONS.USERS)
  //       .valueChanges({idField: 'id'})
  //       .pipe(
  //           take(1), switchMap(users => {
  //             // console.log(users);

  //             for (const user of users) {
  //               const {id, ...newUser} = this.copyDocumentWithNewId<User>(
  //                   user, staticUser, COLLECTIONS.USERS);

  //               // console.log('will add user', newUser);
  //               this.firestore.collection(COLLECTIONS.USERS)
  //                   .doc(id)
  //                   .set(newUser);
  //             }

  //             console.log('added', users.length, 'users');

  //             return this.firestore
  //                 .collection<GameMetadataResponse>(COLLECTIONS.METADATAS)
  //                 .valueChanges({idField: 'id'})
  //                 .pipe(take(1));
  //           }),
  //           switchMap(metadatas => {
  //             // console.log(metadatas);

  //             for (const metadata of metadatas) {
  //               const {id, ...newMeta} =
  //                   this.copyDocumentWithNewId<GameMetadataResponse>(
  //                       metadata, staticGameMetadata, COLLECTIONS.METADATAS);

  //               // console.log('will add meta', newMeta);
  //               this.firestore.collection(COLLECTIONS.METADATAS)
  //                   .doc(id)
  //                   .set(newMeta);
  //             }
  //             console.log('added', metadatas.length, 'metadatas');

  //             return this.firestore.collection<TagResponse>(COLLECTIONS.TAGS)
  //                 .valueChanges({idField: 'id'})
  //                 .pipe(take(1));
  //           }),
  //           switchMap(tags => {
  //             for (const tag of tags) {
  //               const newTag = this.copyDocumentWithNewId<TagResponse>(
  //                   tag, staticTag, COLLECTIONS.TAGS);

  //               // console.log('will add tag', newTag);
  //               this.firestore.collection(COLLECTIONS.TAGS)
  //                   .doc(newTag.id)
  //                   .set(newTag);
  //             }
  //             console.log('added', tags.length, 'tags');

  //             return
  //             this.firestore.collection<GameResponse>(COLLECTIONS.GAMES)
  //                 .valueChanges({idField: 'id'})
  //                 .pipe(take(1));
  //           }),
  //           switchMap(games => {
  //             let nameCount = 0;
  //             let namesDoneCount = 0;
  //             for (const game of games) {
  //               const {id, ...newGame} =
  //                   this.copyDocumentWithNewId<GameResponse>(
  //                       game, staticGame, COLLECTIONS.GAMES);

  //               // console.log('will add game', newGame);
  //               this.firestore.collection(COLLECTIONS.GAMES)
  //                   .doc(id)
  //                   .set(newGame);

  //               const nameCollection =
  //                   this.firestore.doc(`${COLLECTIONS.GAMES}/${game.id}`)
  //                       .collection(COLLECTIONS.NAMES);

  //               const newNameCollection =
  //                   this.firestore.doc(`${COLLECTIONS.GAMES}/${id}`)
  //                       .collection(COLLECTIONS.NAMES);

  //               nameCollection.valueChanges({idField: 'id'})
  //                   .pipe(take(1))
  //                   .subscribe(names => {
  //                     for (const name of names) {
  //                       if (name.name && !name.mongoID) {
  //                         const {id, ...newName} =
  //                             this.copyDocumentWithNewId<NameResponse>(
  //                                 name as NameResponse, staticName,
  //                                 COLLECTIONS.NAMES);

  //                         // console.log('and name for ', game.name,
  //                         newName); newNameCollection.doc(id).set(newName);
  //                         nameCount++;
  //                       }
  //                     }
  //                     namesDoneCount++;
  //                     if (namesDoneCount === games.length) {
  //                       console.log('added', nameCount, 'names');
  //                     }
  //                   });
  //             }
  //             console.log('added', games.length, 'games');

  //             return
  //             this.firestore.collection<NoteResponse>(COLLECTIONS.NOTES)
  //                 .valueChanges({idField: 'id'})
  //                 .pipe(take(1));
  //           }),
  //           map(notes => {
  //             for (const note of notes) {
  //               const {id, ...newNote} =
  //                   this.copyDocumentWithNewId<NoteResponse>(
  //                       note, staticNote, COLLECTIONS.NOTES);

  //               // console.log('will add tag', newTag);
  //               this.firestore.collection(COLLECTIONS.NOTES)
  //                   .doc(id)
  //                   .set(newNote);
  //             }
  //             console.log('added', notes.length, 'notes');
  //           }))
  //       .subscribe();
  // }
}
