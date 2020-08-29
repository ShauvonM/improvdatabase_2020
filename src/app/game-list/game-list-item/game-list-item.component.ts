import {Component, Input, OnInit} from '@angular/core';
import {GamesService} from 'src/app/services/games.service';
import {Game, GameMetadata, Tag} from 'src/app/shared/types';

@Component({
  selector: 'app-game-list-item',
  templateUrl: './game-list-item.component.html',
  styleUrls: ['./game-list-item.component.scss']
})
export class GameListItemComponent implements OnInit {
  @Input() game: Game;

  constructor(private readonly gameService: GamesService) {}

  ngOnInit(): void {}

  get icon(): string {
    if (!this.game) {
      return '';
    }
    const tagStrings = this.game.tags.map(tag => tag.name);
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

  get iconDescription(): string {
    switch (this.icon) {
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
  }

  clickTag(item: Tag) {
    this.gameService.addTagFilter(item);
  }
}
