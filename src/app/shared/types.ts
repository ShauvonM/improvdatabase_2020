import {DocumentReference} from '@angular/fire/firestore';
import firebase from 'firebase/app';


export interface Timestamp {
  seconds: number;
  nanoseconds?: number;
}

export interface Base {
  id: string;
  legacyID?: number;
  dateAdded: Date|Timestamp;
  dateModified: Date|Timestamp;
  dateDeleted?: Date|Timestamp;
  description?: string;
  isDeleted: boolean;
  mongoID?: string;
}

export interface BaseResponse extends Base {
  addedUser: string;
  modifiedUser: string;
  deletedUser?: string;
}

export interface User {
  firebaseUser: firebase.User;
  dateAdded: Date|Timestamp;
  dateModified: Date|Timestamp;
  dateDeleted?: Date|Timestamp;
  description?: string;
  isDeleted: boolean;
  uid: string;
  address: string;
  birthday: Date|Timestamp;
  city: string;
  company: string;
  country: string;
  email: string;
  name: string;
  locked: boolean;
  phone: string;
  state: string;
  superUser: boolean;
  title: string;
  url: string;
  zip: string;
}

export interface BaseClass extends Base {
  addedUser: User;
  modifiedUser: User;
  deletedUser?: User;
}

export interface TagBase {
  name: string;
}

export interface TagResponse extends BaseResponse, TagBase {}

export interface Tag extends BaseClass, TagBase {}

export interface NameVoteResponse extends BaseResponse {}

export interface NameVote extends BaseClass {
  addedUser: User;
  dateAdded: Timestamp;
}

export interface NameBase {
  name: string;
  weight: number;
}

export interface NameResponse extends NameBase, BaseResponse {}

export interface Name extends NameBase, BaseClass {
  votes: NameVote[];
}

export interface BaseGame {
  name: string;
  slug: string;
}

export interface GameResponse extends BaseResponse, BaseGame {
  duration: DocumentReference;
  playerCount: DocumentReference;
  tags: DocumentReference[];
}

export interface Game extends BaseClass, BaseGame {
  duration: GameMetadata;
  playerCount: GameMetadata;
  tags: Tag[];
}

export interface BaseGameMetadata {
  max: number;
  min: number;
  name: string;
  type: 'playerCount'|'duration';
}

export interface GameMetadataResponse extends BaseGameMetadata, BaseResponse {}

export interface GameMetadata extends BaseGameMetadata, BaseClass {}

export interface BaseNote extends Base {
  public: boolean;
}

export interface NoteResponse extends BaseNote, BaseResponse {
  parent: DocumentReference;
}

export type ParentType = Tag|GameMetadata|Game;

export interface Note extends BaseClass, BaseNote {
  parentCollection: string;
  parent: ParentType;
}
