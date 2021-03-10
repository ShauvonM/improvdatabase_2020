import {DocumentReference} from '@angular/fire/firestore';

export interface Time {
  seconds: number;
  nanoseconds: number;
}

export interface Base {
  id: string;
  legacyID?: number;
  dateAdded: Time;
  dateModified: Time;
  dateDeleted?: Time;
  description?: string;
  isDeleted: boolean;
  mongoID?: string;
}

export interface BaseResponse extends Base {
  addedUser: DocumentReference;
  modifiedUser: DocumentReference;
  deletedUser?: DocumentReference;
}

export interface User extends Base {
  address: string;
  birthday: Time;
  city: string;
  company: string;
  country: string;
  dateLoggedIn: Time;
  email: string;
  firstName: string;
  lastName: string;
  locked: boolean;
  phone: string;
  state: string;
  superAdmin: boolean;
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

export interface NameVoteResponse extends BaseResponse {
  addedUser: DocumentReference;
  dateAdded: Time;
}

export interface NameVote extends BaseClass {
  addedUser: User;
  dateAdded: Time;
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
