import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Location} from '@angular/common';
import {Component, Input, OnInit} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {MatChipInputEvent} from '@angular/material/chips';
import firebase from 'firebase/app';
import {Observable} from 'rxjs';
import {GamesService} from 'src/app/services/games.service';
import {Game, GameMetadata, Name, Note, Tag} from 'src/app/shared/types';
import {MarkdownService} from '../../services/markdown.service';


@Component({
  selector: 'app-game-list-item',
  templateUrl: './game-list-item.component.html',
  styleUrls: ['./game-list-item.component.scss']
})
export class GameListItemComponent implements OnInit {
  @Input() game: Game;

  // game$: Observable<Game>;
  names$: Observable<Name[]>;
  notes$: Observable<Note[]>;
  user$: Observable<firebase.User>;

  nameAddOnBlur = true;

  get selected() {
    return this.game && this.game.slug === this.gameService.selectedGameSlug;
  }

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor(
      private readonly gameService: GamesService,
      private readonly markdownService: MarkdownService,
      private readonly location: Location,
      private readonly auth: AngularFireAuth,
  ) {
    // this.game$ = this.route.params.pipe(switchMap(params => {
    //   console.log('route', this.location.getState());
    //   const slug = params.slug;

    //   if (slug) {
    //     return this.gameService.fetchGame(slug).pipe(tap(game => {
    //       this.names$ = this.gameService.fetchNames(game);
    //       this.notes$ = this.gameService.fetchNotes(game).pipe(
    //           tap(notes => console.log(notes)));

    //       if (slug === RANDOM) {
    //         this.location.replaceState(`games/${game.slug}`, '', {});
    //       }
    //     }));
    //   }
    // }));
    this.user$ = this.auth.user;
  }

  ngOnInit(): void {
    if (this.selected) {
      this.names$ = this.gameService.fetchNames(this.game);
      this.notes$ = this.gameService.fetchNotes(this.game);
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
    this.gameService.addFilter(item);
    if (this.selected) {
      this.location.go('games');
    }
  }

  clickTag(item: Tag) {
    this.gameService.addTagFilter(item);
    if (this.selected) {
      this.location.go('games');
    }
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
}
