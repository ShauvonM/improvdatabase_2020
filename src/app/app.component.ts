import {Component} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {MatDialog} from '@angular/material/dialog';
import firebase from 'firebase/app';
import {fromEvent} from 'rxjs';
import {map} from 'rxjs/operators';
import {LoginDialogComponent} from './login-dialog/login-dialog.component';


const TOOBLAR_ACTIVE_POSITION = 16 * 4;

const LOGIN_STRINGS = [
  'about',          'below',   'excepting',   'toward',
  'above',          'beneath', 'for',         'on',
  'across',         'beside',  'from',        'onto',
  'after',          'between', 'in',          'until',
  'against',        'beyond',  'in front of', 'up',
  'along',          'but',     'inside',      'upon',
  'among',          'by',      'in spite of', 'past',
  'up to',          'around',  'concerning',  'instead of',
  'regarding',      'with',    'at ',         'into',
  'since',          'within',  'because of',  'like',
  'through',        'during',  'near',        'throughout',
  'with regard to', 'of',      'to',          'with respect to',
];

const LOGOUT_STRINGS = [
  'out',
  'off',
  'outside',
  'underneath',
  'under',
  'without',
  'over',
  'despite',
  'down',
  'except',
  'behind',
  'before',
];

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

  private user?: firebase.User;

  constructor(
      private readonly matDialog: MatDialog,
      private readonly auth: AngularFireAuth) {
    fromEvent(window, 'scroll')
        .pipe(map(() => {
          return window.scrollY;
        }))
        .subscribe(pos => {
          this.toolbarActive = pos > TOOBLAR_ACTIVE_POSITION;
        });

    this.loginString = 'Log ' +
        LOGIN_STRINGS[Math.floor(Math.random() * LOGIN_STRINGS.length)];

    this.logoutString = 'Log ' +
        LOGOUT_STRINGS[Math.floor(Math.random() * LOGOUT_STRINGS.length)];

    this.auth.user.subscribe(user => {
      this.user = user;
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
    this.auth.signOut();
  }
}
