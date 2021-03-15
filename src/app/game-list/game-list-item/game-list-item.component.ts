import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Location} from '@angular/common';
import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Observable, Subscription} from 'rxjs';
import {GamesService} from 'src/app/services/games.service';
import {TagsService} from 'src/app/services/tags.service';
import {UserService} from 'src/app/services/user.service';
import {SNACKBAR_DURATION_DEFAULT} from 'src/app/shared/constants';
import {Game, GameMetadata, Name, NameVoteResponse, Note, Tag, User} from 'src/app/shared/types';
import {MarkdownService} from '../../services/markdown.service';
import {NamesService, NameVoteEffect} from '../../services/names.service';


@Component({
  selector: 'app-game-list-item',
  templateUrl: './game-list-item.component.html',
  styleUrls: ['./game-list-item.component.scss']
})
export class GameListItemComponent implements OnInit, OnDestroy {
  game_: Game;
  @Input()
  get game(): Game {
    return this.game_;
  }
  set game(g: Game) {
    this.game_ = g;
    this.isEditDescriptionSaving = false;
  }

  // game$: Observable<Game>;
  names$: Observable<Name[]>;
  nameVote$: Observable<NameVoteResponse[]>;
  notes$: Observable<Note[]>;
  // user$: Observable<firebase.User>;

  user?: User;
  userSubscription: Subscription;

  newNameText = '';

  isEditDescriptionActive = false;
  isEditDescriptionSaving = false;
  editDescriptionText = '';

  get selected() {
    return this.game && this.game.slug === this.gameService.selectedGameSlug;
  }

  get canEdit() {
    return this.selected && this.user &&
        (this.user.superUser || this.game.addedUser.uid === this.user.uid);
  }

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  constructor(
      private readonly gameService: GamesService,
      private readonly nameService: NamesService,
      private readonly tagService: TagsService,
      private readonly markdownService: MarkdownService,
      private readonly location: Location,
      private readonly userService: UserService,
      private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    if (this.selected) {
      this.names$ = this.nameService.fetchNames(this.game);
      this.nameVote$ = this.nameService.fetchMyNameVotes(this.game);
      this.notes$ = this.gameService.fetchNotes(this.game);
      this.userSubscription =
          this.userService.user$.subscribe(user => this.user = user);
    }
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
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
    this.tagService.addTagFilter(item);
    if (this.selected) {
      this.location.go('games');
    }
  }

  addName(event: KeyboardEvent): void {
    // Add a name
    if ((this.newNameText || '').trim()) {
      const name = this.newNameText;
      console.log('add a name!', name);
      this.nameService.addNewName(this.game, name).subscribe(ref => {
        this.snackBar.open(
            'We have added that name to the database. Hey, thanks. Don\'t forget to vote for it if it\'s your preferred name.',
            '', {duration: SNACKBAR_DURATION_DEFAULT});
      });
    }
    this.newNameText = '';
  }

  removeName(name: Name) {
    this.nameService.removeName(this.game, name).subscribe(effect => {
      let msg = '';
      if (effect === NameVoteEffect.NAME_VOTE_REMOVED) {
        msg = 'That name is gone, now. It\'s like it never happened.';
      } else {
        msg =
            'Way to delete the name for this game. Now it\'s called something else.';
      }

      this.snackBar.open(msg, '', {duration: SNACKBAR_DURATION_DEFAULT});
    });
  }

  hasVotedForName(votes: NameVoteResponse[], name: Name): boolean {
    return !!votes.find(vote => vote.nameId === name.id);
  }

  nameVote(existingVotes: NameVoteResponse[], name: Name) {
    this.nameService.voteForName(this.game, name, existingVotes).subscribe(effect => {
      let msg = '';
      switch (effect) {
        case NameVoteEffect.NAME_VOTE_CHANGED:
          msg = 'Your vote was updated. Thank you for being open to change.';
          break;
        case NameVoteEffect.NAME_VOTE_MADE:
          msg = 'Your vote has been counted. Hooray democracy!';
          break;
        case NameVoteEffect.NAME_VOTE_REMOVED:
          msg = 'Your vote was removed. Please return your "I Voted" sticker.';
          break;
        case NameVoteEffect.NAME_VOTE_RENAME:
          msg =
              'Wow, you have changed the official name of this game. Democracy works!';
          break;
        default:
          msg =
              'Something weird happened to your vote. I . . . really don\'t know what to do.';
      }
      this.snackBar.open(msg, '', {duration: SNACKBAR_DURATION_DEFAULT});
    });
  }

  editDescription(e: MouseEvent) {
    e.stopPropagation();
    if (!this.canEdit) {
      return;
    }

    this.isEditDescriptionActive = true;
    this.editDescriptionText = this.game.description;
  }

  saveDescription() {
    this.isEditDescriptionActive = false;
    this.isEditDescriptionSaving = true;

    this.gameService.saveDescription(this.game, this.editDescriptionText)
        .subscribe(
            () => {
                // ...
            });
  }
}
