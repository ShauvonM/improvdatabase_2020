import {Injectable} from '@angular/core';
import {AngularFirestore, CollectionReference, DocumentReference} from '@angular/fire/firestore';
import firebase from 'firebase/app';
import {combineLatest, from, Observable, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {COLLECTIONS} from '../shared/constants';
import {BaseNote, BaseResponse, Game, Note, NoteResponse, ParentType, Tag, Timestamp, User} from '../shared/types';
import {GameMetadataService} from './game-metadata.service';
import {TagsService} from './tags.service';
import {UserService} from './user.service';



export interface NoteResponseWithParent extends BaseNote, BaseResponse {
  parent: ParentType;
  parentCollection: string;
}

const QUERY_CHUNK_SIZE = 10;

const NOTE_SORT_ORDER = ['games', 'metadata', 'tags'];

@Injectable({providedIn: 'root'})
export class NoteService {
  constructor(
      private readonly firestore: AngularFirestore,
      private readonly userService: UserService,
      private readonly tagService: TagsService,
      private readonly gameMetadataService: GameMetadataService,
  ) {}

  addNote(noteData: {
    description: string,
    public: boolean,
    parentCollection: string,
    parent: ParentType,
  }): Observable<DocumentReference<NoteResponse>> {
    return this.userService.getBaseCreationData().pipe(switchMap(base => {
      const newNote: NoteResponse = {
        ...base,
        ...noteData,
        parent: this.firestore
                    .doc(`${noteData.parentCollection}/${noteData.parent.id}`)
                    .ref
      };

      return from(this.firestore.collection<NoteResponse>(COLLECTIONS.NOTES)
                      .add(newNote))
    }));
  }

  deleteNote(note: Note): Observable<void> {
    return this.userService.getBaseDeletionData().pipe(switchMap(base => {
      return from(
          this.firestore.doc<NoteResponse>(`${COLLECTIONS.NOTES}/${note.id}`)
              .update(base));
    }));
  }

  updateNote(note: Note): Observable<void> {
    return this.userService.getBaseUpdateData().pipe(switchMap(base => {
      return from(
          this.firestore.doc<NoteResponse>(`${COLLECTIONS.NOTES}/${note.id}`)
              .update({
                ...base,
                description: note.description,
                public: note.public,
                parent: this.firestore
                            .doc(`${note.parentCollection}/${note.parent.id}`)
                            .ref
              }));
    }));
  }

  fetchNotes(game: Game): Observable<Note[]> {
    // Firestore can only handle ten items at a time in an "IN" query, so we
    // have to break up the available options.
    const tagChunks: Tag[][] = [];
    for (let i = 0; i < game.tags.length; i += QUERY_CHUNK_SIZE) {
      tagChunks.push(game.tags.slice(i, i + QUERY_CHUNK_SIZE));
    }
    const noteQueries: Observable<Note[]>[] = [];
    // Once for public notes.
    for (const chunk of tagChunks) {
      noteQueries.push(this.fetchTagNotes(chunk));
    }
    noteQueries.push(this.fetchPrimaryNotes(game));

    // Once for the uer's private notes.
    for (const chunk of tagChunks) {
      noteQueries.push(this.fetchTagNotes(chunk, false));
    }
    noteQueries.push(this.fetchPrimaryNotes(game, false));

    return combineLatest(noteQueries).pipe(map(noteArrays => {
      return noteArrays.reduceRight((all, current) => all.concat(current))
          .sort((a, b) => {
            if (a.parentCollection === b.parentCollection) {
              return (a.dateAdded as Timestamp).seconds -
                  (b.dateAdded as Timestamp).seconds;
            } else {
              return NOTE_SORT_ORDER[a.parentCollection] -
                  NOTE_SORT_ORDER[b.parentCollection];
            }
          });
    }));
  }

  private fetchPrimaryNotes(game: Game, publicOnly = true): Observable<Note[]> {
    return this.userService.user$.pipe(
        switchMap(user => {
          return this.firestore
              .collection<NoteResponse>(
                  COLLECTIONS.NOTES,
                  ref => this.getQuery(
                      {ref, game, user: publicOnly ? null : user}))
              .valueChanges({idField: 'id'})
        }),
        switchMap(
            noteResponses => this.handleNoteResponse(noteResponses, game)),
        switchMap(notesWithParents => {
          return this.userService
              .addUsersToResponse<NoteResponseWithParent, Note>(
                  notesWithParents);
        }));
  }

  private fetchTagNotes(tags: Tag[], publicOnly = true): Observable<Note[]> {
    return this.userService.user$.pipe(
        switchMap(user => {
          return this.firestore
              .collection<NoteResponse>(
                  COLLECTIONS.NOTES,
                  ref => this.getQuery(
                      {ref, tags, user: publicOnly ? null : user}))
              .valueChanges({idField: 'id'});
        }),
        switchMap(noteResponses => this.handleNoteResponse(noteResponses)),
        switchMap(notesWithParents => {
          return this.userService
              .addUsersToResponse<NoteResponseWithParent, Note>(
                  notesWithParents);
        }));
  }

  private getQuery(
      {ref, game, tags, user}:
          {ref: CollectionReference, game?: Game, tags?: Tag[], user?: User}):
      firebase.firestore.Query {
    // TODO: Do another query for the current user's private notes.
    let query = ref.orderBy('dateModified', 'desc')
                    .where('isDeleted', '==', false)
                    .where('public', '==', !user);
    if (user) {
      query = query.where('addedUser', '==', user.uid);
    }
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
    if (!noteResponses || !noteResponses.length) {
      return of([]);
    }
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
