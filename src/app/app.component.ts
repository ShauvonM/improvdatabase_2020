import {Component} from '@angular/core';
import {FormControl} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {Router} from '@angular/router';
import algoliasearch, {SearchIndex} from 'algoliasearch/lite';
import {combineLatest, from, fromEvent} from 'rxjs';
import {debounceTime, map} from 'rxjs/operators';
import {environment} from 'src/environments/environment';
import {LoginDialogComponent} from './login-dialog/login-dialog.component';
import {TagsService} from './services/tags.service';
import {UserService} from './services/user.service';
import {loginString, logoutString} from './shared/constants';
import {User} from './shared/types';

const TOOBLAR_ACTIVE_POSITION = 16 * 4;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  sidenavOpen = false;
  toolbarActive = false;

  loginString = '';
  logoutString = '';

  searchFocused = false;

  searchControl = new FormControl('');
  gameSearchIndex: SearchIndex;
  tagSearchIndex: SearchIndex;

  gameSearchResults:
      {slug: string, name: string, label: string, icon: string}[] = [];
  tagSearchResults: {tagId: string, name: string, label: string}[] = [];

  private user?: User;

  constructor(
      private readonly matDialog: MatDialog,
      private readonly userService: UserService,
      private readonly tagService: TagsService,
      private readonly router: Router,
  ) {
    fromEvent(window, 'scroll')
        .pipe(map(() => {
          return window.scrollY;
        }))
        .subscribe(pos => {
          this.toolbarActive = pos > TOOBLAR_ACTIVE_POSITION;
        });

    this.loginString = loginString();

    this.logoutString = logoutString();

    this.userService.user$.subscribe(user => {
      console.log('user', user);
      this.user = user;
    });

    const searchClient =
        algoliasearch(environment.algolia.appId, environment.algolia.searchKey);
    this.gameSearchIndex = searchClient.initIndex('games');
    this.tagSearchIndex = searchClient.initIndex('tags');

    this.searchControl.valueChanges.pipe(debounceTime(1000)).subscribe(term => {
      this.searchInput(term);
    });
  }

  get isLoggedIn(): boolean {
    return !!this.user;
  }

  toggleSidenav() {
    this.sidenavOpen = !this.sidenavOpen;
  }

  openLogin() {
    LoginDialogComponent.open(this.matDialog, {title: this.loginString});
  }

  logout() {
    this.userService.logout();
  }

  searchInput(term: string) {
    console.log('search', term);
    if (!term) {
      this.gameSearchResults = [];
      this.tagSearchResults = [];
      return;
    }

    combineLatest([
      from(this.gameSearchIndex.search(term, {hitsPerPage: 10})),
      from(this.tagSearchIndex.search(term, {hitsPerPage: 10}))
    ]).subscribe(([games, tags]) => {
      console.log('search response!', games, tags);
      this.gameSearchResults = games.hits.map(hit => {
        let icon = '';
        switch (hit['keyTag']) {
          case 'Show':
            icon = 'local_activity';
            break;
          case 'Exercise':
            icon = 'emoji_objects';
            break;
          case 'Warmup':
            icon = 'local_fire_department';
            break;
          default:
            icon = 'sports_kabaddi';
            break;
        }
        return {
          slug: hit['gameSlug'],
          name: hit['name'],
          label: hit._highlightResult['name'].value,
          icon,
        };
      });
      this.tagSearchResults = tags.hits.map(hit => {
        return {
          tagId: hit['tagId'],
          name: hit['name'],
          label: hit._highlightResult['name'].value,
        };
      });
    });
  }

  selectTagSearchResult(tag: {tagId: string, name: string}) {
    console.log('go to', tag);

    this.tagService.addTagFilter({id: tag.tagId, name: tag.name});
    this.router.navigate(['games']);

    this.searchControl.reset();
  }
}
