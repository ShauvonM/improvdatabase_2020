import {Component, Input, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {Observable} from 'rxjs';
import {GamesService} from 'src/app/services/games.service';
import {MarkdownService} from 'src/app/services/markdown.service';
import {NoteService} from 'src/app/services/note.service';
import {UserService} from 'src/app/services/user.service';
import {COLLECTIONS, timestampToDate} from 'src/app/shared/constants';
import {Game, Note, ParentType, Timestamp, User} from 'src/app/shared/types';

@Component({
  selector: 'app-note-list',
  templateUrl: './note-list.component.html',
  styleUrls: ['./note-list.component.scss']
})
export class NoteListComponent implements OnInit {
  @Input() game: Game;
  notes$: Observable<Note[]>;
  user: User;

  noteForm = new FormGroup({
    'parent': new FormControl('', Validators.required),
    'description': new FormControl('', Validators.required),
    'isPublic': new FormControl(true, Validators.required),
    'note': new FormControl(null)
  });

  savingNote = false;

  get tagIds() {
    return this.game.tags.map(t => t.id);
  }

  get gameIcon() {
    return this.gameService.getGameIcon(this.game);
  }

  constructor(
      private readonly noteService: NoteService,
      private readonly userService: UserService,
      private readonly markdownService: MarkdownService,
      private readonly gameService: GamesService,
  ) {
    this.userService.user$.subscribe(user => this.user = user);
  }

  renderMarkdown(str: string): string {
    return this.markdownService.convert(str);
  }

  convertDate(date: Timestamp): Date {
    return timestampToDate(date);
  }

  ngOnInit(): void {
    this.notes$ = this.noteService.fetchNotes(this.game);
    this.selectGame();
  }

  canEditNote(note: Note): boolean {
    return note && this.user &&
        (note.addedUser.uid === this.user.uid || this.user.superUser);
  }

  selectGame() {
    this.noteForm.controls['parent'].setValue(this.game);
  }

  cancelNote() {
    this.noteForm.reset();
    this.noteForm.controls['isPublic'].setValue(true);
    this.selectGame();
  }

  saveNote() {
    const description = String(this.noteForm.controls['description'].value);
    const isPublic = !!this.noteForm.controls['isPublic'].value;
    const parent = this.noteForm.controls['parent'].value as ParentType;
    const editNote = this.noteForm.controls['note'].value as Note;
    let parentCollection = '';
    if (parent.id === this.game.duration.id ||
        parent.id === this.game.playerCount.id) {
      parentCollection = COLLECTIONS.METADATAS;
    } else if (this.tagIds.includes(parent.id)) {
      parentCollection = COLLECTIONS.TAGS;
    } else {
      parentCollection = COLLECTIONS.GAMES;
    }
    this.savingNote = true;
    this.cancelNote();
    if (editNote) {
      this.noteService
          .updateNote({...editNote, description, public: isPublic, parent})
          .subscribe();
    } else {
      this.noteService
          .addNote({description, public: isPublic, parent, parentCollection})
          .subscribe(() => {
            console.log('done!');
          });
    }
  }

  deleteNote(note: Note) {
    this.noteService.deleteNote(note).subscribe();
  }

  editNote(note: Note) {
    this.noteForm.setValue({
      description: note.description,
      parent: note.parent,
      isPublic: note.public,
      note
    });
  }
}
