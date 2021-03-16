import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Component, ElementRef, ViewChild} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {MatChipInputEvent} from '@angular/material/chips';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {Observable} from 'rxjs';
import {map, startWith, switchMap, take} from 'rxjs/operators';
import {GameMetadataService} from '../services/game-metadata.service';
import {GamesService} from '../services/games.service';
import {TagsService} from '../services/tags.service';
import {UserService} from '../services/user.service';
import {SNACKBAR_DURATION_DEFAULT} from '../shared/constants';
import {ScreenDirective} from '../shared/screen.directive';
import {Game, GameMetadata, Tag} from '../shared/types';

@Component({
  selector: 'app-add-game-screen',
  templateUrl: './add-game-screen.component.html',
  styleUrls: ['./add-game-screen.component.scss'],
})
export class AddGameScreenComponent extends ScreenDirective {
  gameForm = new FormGroup({
    'name': new FormControl('', Validators.required),
    'description': new FormControl('', Validators.required),
    'duration': new FormControl('', Validators.required),
    'playerCount': new FormControl('', Validators.required),
    'tagSearch': new FormControl(''),
  });

  durations$: Observable<GameMetadata[]>;
  playerCounts$: Observable<GameMetadata[]>;

  selectedDuration: Partial<GameMetadata> = {name: 'Select a Duration'};
  selectedPlayerCount: Partial<GameMetadata> = {name: 'Select a Player Count'};

  separatorKeysCodes: number[] = [ENTER, COMMA];
  filteredTags$: Observable<Tag[]>;
  selectedTags: Partial<Tag>[] = [];
  allTags: Tag[] = [];

  saving = false;

  @ViewChild('tagInput') tagSearchInput: ElementRef<HTMLInputElement>;

  constructor(
      private readonly gameService: GamesService,
      private readonly tagService: TagsService,
      private readonly gameMetadataService: GameMetadataService,
      private readonly userService: UserService,
      private readonly snackBar: MatSnackBar,
      private readonly router: Router,
  ) {
    super();

    this.durations$ =
        this.gameMetadataService.fetchMetadatas().pipe(map(data => {
          return [...data.values()]
              .filter(m => m.type === 'duration')
              .sort((a, b) => (a.min - b.min) + (a.max - b.max));
        }));

    this.playerCounts$ =
        this.gameMetadataService.fetchMetadatas().pipe(map(data => {
          return [...data.values()]
              .filter(m => m.type === 'playerCount')
              .sort((a, b) => (a.min - b.min) + (a.max - b.max));
        }));

    this.filteredTags$ = this.gameForm.controls['tagSearch'].valueChanges.pipe(
        startWith(''), switchMap(term => {
          return this.tagService.fetchTags();
        }),
        map(tags => {
          const term = this.gameForm.controls['tagSearch'].value || '';
          return term ?
              tags.filter(
                  tag => tag.name.toLowerCase().includes(term.toLowerCase()) &&
                      !this.selectedTags.find(t => t.id === tag.id)) :
              tags.slice();
        }));
  }

  reset() {
    this.saving = false;
    this.gameForm.reset();
    this.selectedDuration = {name: 'Select a Duration'};
    this.selectedPlayerCount = {name: 'Select a Player Count'};
    this.selectedTags = [];
  }

  selectDuration(duration: GameMetadata) {
    this.selectedDuration = duration;
    this.gameForm.patchValue({duration: this.selectedDuration.id});
  }

  selectPlayerCount(playerCount: GameMetadata) {
    this.selectedPlayerCount = playerCount;
    this.gameForm.patchValue({playerCount: this.selectedPlayerCount.id});
  }

  removeTag(tag: Tag) {
    const index = this.selectedTags.findIndex(t => t.id === tag.id);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    }
  }

  addTag(event: MatChipInputEvent) {
    const value = event.value;
    if (value.trim()) {
      this.filteredTags$.pipe(take(1)).subscribe(tags => {
        const selectedTag =
            tags.find(t => t.name.toLowerCase() === value.toLowerCase());
        if (selectedTag) {
          this.selectedTags.push(selectedTag);
        } else {
          this.userService.user$.pipe(take(1)).subscribe(user => {
            this.selectedTags.push({
              name: value,
              description: '',
            });
          });
        }
        this.gameForm.controls['tagSearch'].setValue('');
        this.tagSearchInput.nativeElement.value = '';
      });
    }
  }

  tagSelected(event: MatAutocompleteSelectedEvent) {
    if (event.option.value) {
      const selectedTag: Tag = event.option.value;
      this.selectedTags.push(selectedTag);
      this.gameForm.controls['tagSearch'].setValue('');
    }
    this.tagSearchInput.nativeElement.value = '';
  }

  addGame() {
    const data: {name: string; description: string;} = this.gameForm.value;
    const gameData: Partial<Game> = {
      name: data.name,
      description: data.description,
      playerCount: this.selectedPlayerCount as GameMetadata,
      duration: this.selectedDuration as GameMetadata,
      tags: this.selectedTags as Tag[]
    };
    this.saving = true;

    this.gameService.addGame(gameData).subscribe(
        newSlug => {
          this.reset();
          this.snackBar
              .open(
                  'Hey look, your game was created! Check it out: ', 'here',
                  {duration: SNACKBAR_DURATION_DEFAULT * 2})
              .onAction()
              .subscribe(() => {
                this.router.navigate(['games', newSlug]);
              });
        },
        error => {
          console.log('error!', error);
          if (error.conflict &&
              (error.conflict === 'slug' || error.conflict === 'name')) {
            this.gameForm.controls['name'].setErrors({conflict: true});
          }
          this.saving = false;
        });
  }

  getNameErrorMessage() {
    if (this.gameForm.controls['name'].hasError('required')) {
      return 'You gotta enter a name.';
    }

    return this.gameForm.controls['name'].hasError('conflict') ?
        'This name seems to already exist up in here.' :
        '';
  }
}
