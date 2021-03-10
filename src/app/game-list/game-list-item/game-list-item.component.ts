import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Component, Input, OnInit} from '@angular/core';
import {MatChipInputEvent} from '@angular/material/chips';
import {ActivatedRoute} from '@angular/router';
import {Observable, of} from 'rxjs';
import {tap} from 'rxjs/operators';
import {GamesService} from 'src/app/services/games.service';
import {ScreenDirective} from 'src/app/shared/screen.directive';
import {Game, GameMetadata, Name, Note, Tag} from 'src/app/shared/types';
import {MarkdownService} from '../../services/markdown.service';

@Component({
  selector: 'app-game-list-item',
  templateUrl: './game-list-item.component.html',
  styleUrls: ['./game-list-item.component.scss']
})
export class GameListItemComponent extends ScreenDirective implements OnInit {
  @Input() game: Game;
  listMode = false;

  game$: Observable<Game>;
  names$: Observable<Name[]>;
  notes$: Observable<Note[]>;

  nameAddOnBlur = true;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor(
      private readonly gameService: GamesService,
      private readonly markdownService: MarkdownService,
      private readonly route: ActivatedRoute,
  ) {
    super();

    this.route.params.subscribe(params => {
      const slug = params.slug;

      if (slug) {
        this.game$ = this.gameService.fetchGame(slug).pipe(tap(game => {
          this.names$ = this.gameService.fetchNames(game);
          this.notes$ = this.gameService.fetchNotes(game).pipe(
              tap(notes => console.log(notes)));
        }));
      }
    });
  }

  ngOnInit(): void {
    // If we have an input, this will be in list mode.
    // Otherwise we're on the details screen, which is set up in the
    // constructor.
    if (this.game) {
      this.className = 'list-item';
      this.listMode = true;
      this.game$ = of(this.game);
    }
  }

  renderMarkdown(str: string): string {
    return this.markdownService.convert(str);
  }

  getIcon(tags: Tag[]): string {
    if (!tags || !tags.length) {
      return '';
    }
    const tagStrings = tags.map(tag => tag.name);
    if (tagStrings.includes('Show')) {
      return 'local_activity';
    }
    if (tagStrings.includes('Exercise')) {
      return 'emoji_objects';
    }
    if (tagStrings.includes('Warmup')) {
      return 'local_fire_department';
    }
    return 'sports_kabaddi';
  }

  getIconDescription(tags: Tag[]): string {
    switch (this.getIcon(tags)) {
      case 'local_activity':
        return 'A live performance style game.';
      case 'local_fire_department':
        return 'A warmup style game.';
      case 'emoji_objects':
        return 'An excercise to hone your craft.';
      case 'sports_kabaddi':
        return 'This game is not categorized, either by choice or laziness.';
      default:
        return 'We don\'t know what this means.';
    }
  }

  /** Returns a string without any HTML tags in. */
  stripTags(htmlString: string): string {
    let div = document.createElement('div');
    div.innerHTML = htmlString;
    return div.textContent || div.innerText || htmlString;
  }

  clickMeta(item: GameMetadata) {
    if (!this.listMode) {
      return;
    }
    this.gameService.addFilter(item);
  }

  clickTag(item: Tag) {
    if (!this.listMode) {
      return;
    }
    this.gameService.addTagFilter(item);
  }

  addName(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add a name
    if ((value || '').trim()) {
      console.log('add a name!', value);
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  // getNoteLabel$(note: NoteResponse, game: Game): Observable<string> {
  //   const path = note.parent.path;
  //   const user = note.addedUser;
  //   const collection = path.split('/')[0];
  //   console.log('note', game);
  //   let obs: Observable<string>;
  //   switch (collection) {
  //     case COLLECTIONS.TAGS:
  //       obs = this.gameService.getTag(note.parent).pipe(map(tag =>
  //       tag.name)); break;
  //     case COLLECTIONS.GAMES:
  //       // obs = of(game.name);
  //       obs = of('');
  //       break;
  //     case COLLECTIONS.METADATAS:
  //       obs = this.gameService.getMetadata(note.parent)
  //                 .pipe(map(meta => meta.name));
  //       break;
  //     default:
  //       obs = of('');
  //       break;
  //   }
  //   return combineLatest([obs, this.gameService.getUser(user)])
  //       .pipe(map(([text, userData]) => {
  //         return `re: '${text}' - ${userData.firstName}
  //         ${userData.lastName}`;
  //       }));
  // }
}
