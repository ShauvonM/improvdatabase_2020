import {Component, OnInit} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {LoginDialogComponent} from '../login-dialog/login-dialog.component';
import {loginString, logoutString} from '../shared/constants';
import {ScreenDirective} from '../shared/screen.directive';

@Component({
  selector: 'app-welcome-screen',
  templateUrl: './welcome-screen.component.html',
  styleUrls: ['./welcome-screen.component.scss']
})
export class WelcomeScreenComponent extends ScreenDirective implements OnInit {
  constructor(
      private readonly matDialog: MatDialog,
  ) {
    super();
  }

  ngOnInit(): void {}

  get loginString() {
    return loginString();
  }
  get logoutString() {
    return logoutString();
  }

  openLogin() {
    LoginDialogComponent.open(this.matDialog, {title: this.loginString});
  }
}
