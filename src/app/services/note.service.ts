import {Injectable} from '@angular/core';
import {AngularFirestore, CollectionReference, DocumentReference} from '@angular/fire/firestore';
import firebase from 'firebase/app';
import {combineLatest, Observable, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {COLLECTIONS} from '../shared/constants';
import {BaseNote, BaseResponse, Game, Note, NoteResponse, ParentType, Tag} from '../shared/types';
import {GameMetadataService} from './game-metadata.service';
import {TagsService} from './tags.service';
import {UserService} from './user.service';



export interface NoteResponseWithParent extends BaseNote, BaseResponse {
  parent: ParentType;
  parentCollection: string;
}

const QUERY_CHUNK_SIZE = 10;

@Injectable({providedIn: 'root'})
export class NoteService {
  constructor(
      private readonly firestore: AngularFirestore,
      private readonly userService: UserService,
      private readonly tagService: TagsService,
      private readonly gameMetadataService: GameMetadataService,
  ) {}

  fetchNotes(game: Game): Observable<Note[]> {
    // Firestore can only handle ten items at a time in an "IN" query, so we
    // have to break up the available options.
    const tagChunks: Tag[][] = [];
    for (let i = 0; i < game.tags.length; i += QUERY_CHUNK_SIZE) {
      tagChunks.push(game.tags.slice(i, i + QUERY_CHUNK_SIZE));
    }
    console.log('tag chunks', tagChunks);
    const noteQueries: Observable<Note[]>[] = [];
    for (const chunk of tagChunks) {
      noteQueries.push(this.fetchTagNotes(chunk));
    }
    noteQueries.push(this.fetchPrimaryNotes(game));
    // TODO: Add the user's private notes, too.
    return combineLatest(noteQueries).pipe(map(noteArrays => {
      return noteArrays.reduceRight((all, current) => all.concat(current));
    }));
  }

  private fetchPrimaryNotes(game: Game): Observable<Note[]> {
    return this.firestore
        .collection<NoteResponse>(
            COLLECTIONS.NOTES, ref => this.getQuery(ref, game))
        .valueChanges({idField: 'id'})
        .pipe(
            switchMap(
                noteResponses => this.handleNoteResponse(noteResponses, game)),
            switchMap(notesWithParents => {
              return this.userService
                  .addUsersToResponse<NoteResponseWithParent, Note>(
                      notesWithParents);
            }));
  }

  private fetchTagNotes(tags: Tag[]): Observable<Note[]> {
    return this.firestore
        .collection<NoteResponse>(
            COLLECTIONS.NOTES, ref => this.getQuery(ref, null, tags))
        .valueChanges({idField: 'id'})
        .pipe(
            switchMap(noteResponses => this.handleNoteResponse(noteResponses)),
            switchMap(notesWithParents => {
              return this.userService
                  .addUsersToResponse<NoteResponseWithParent, Note>(
                      notesWithParents);
            }));
  }

  private getQuery(ref: CollectionReference, game?: Game, tags?: Tag[]):
      firebase.firestore.Query {
    // TODO: Do another query for the current user's private notes.
    let query = ref.orderBy('dateModified', 'desc')
                    .where('isDeleted', '==', false)
                    .where('public', '==', true);
    const parents: DocumentReference[] = [];
    if (game) {
      parents.push(this.firestore.doc(`/${COLLECTIONS.GAMES}/${game.id}`).ref);
      parents.push(
          this.firestore.doc(`/${COLLECTIONS.METADATAS}/${game.duration.id}`)
              .ref);
      parents.push(
          this.firestore.doc(`/${COLLECTIONS.METADATAS}/${game.playerCount.id}`)
              .ref);
    }
    if (tags) {
      for (const tag of tags) {
        parents.push(this.firestore.doc(`/${COLLECTIONS.TAGS}/${tag.id}`).ref);
      }
    }
    query = query.where('parent', 'in', parents);
    return query;
  }

  private handleNoteResponse(noteResponses: NoteResponse[], game?: Game):
      Observable<NoteResponseWithParent[]> {
    const notesWithParents: Observable<NoteResponseWithParent>[] = [];
    for (const noteResponse of noteResponses) {
      const path = noteResponse.parent.path;
      const parentCollection = path.split('/')[0];
      let obs: Observable<ParentType>;
      switch (parentCollection) {
        case COLLECTIONS.TAGS:
          obs = this.tagService.fetchTag(noteResponse.parent);
          break;
        case COLLECTIONS.GAMES:
          obs = of(game);
          break;
        case COLLECTIONS.METADATAS:
          obs = this.gameMetadataService.getMetadata(noteResponse.parent);
          break;
        default:
          break;
      }
      if (obs) {
        notesWithParents.push(obs.pipe(map(parent => {
          return {...noteResponse, parent, parentCollection};
        })));
      }
    }
    return combineLatest(notesWithParents);
  }
}
