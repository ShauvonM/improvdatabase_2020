import {Component, Inject} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import firebase from 'firebase/app';
import {Subscription} from 'rxjs';

import {createToggle} from '../shared/anim';



export interface LoginData {
  title: string;
}

@Component({
  selector: 'app-login-dialog',
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.scss'],
  animations: [
    createToggle(
        'error', {'height': '0', 'overflow': 'hidden'},
        {'height': '*', 'overflow': 'hidden'}, 300),
  ]
})
export class LoginDialogComponent {
  static open(matDialog: MatDialog, data: LoginData):
      MatDialogRef<LoginDialogComponent> {
    return matDialog.open(LoginDialogComponent, {width: '19rem', data});
  }

  title = 'Log in';

  authSubscription: Subscription;

  email = '';
  password = '';

  error = '';
  failureCount = 0;

  signupMode = false;

  constructor(
      private readonly dialogRef: MatDialogRef<LoginDialogComponent>,
      @Inject(MAT_DIALOG_DATA) private readonly data: LoginData,
      private readonly auth: AngularFireAuth,
      private readonly snackBar: MatSnackBar,
  ) {
    this.title = data.title;

    this.authSubscription = this.auth.user.subscribe(user => {
      if (user) {
        this.dialogRef.close();
      }
    });
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }

  signup(e: MouseEvent) {
    this.signupMode = true;
    this.title = 'Sign on up';
    e.stopPropagation();
  }

  doGoogle(e: MouseEvent) {
    e.stopPropagation();
    this.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  }

  private loginCatch(e) {
    console.log('login error', e);
    this.failureCount++;
    if (this.failureCount > 10 ||
        (e.code && e.code === 'auth/too-many-requests')) {
      this.error = 'Too many failures. Giving up forever.';
      // fly away!
      this.dialogRef.addPanelClass('runaway');

      setTimeout(() => {
        this.dialogRef.close();
      }, 6000);
      return;
    }
    if (e.message) {
      this.error = e.message;
    }
    this.dialogRef.addPanelClass('error');
  }

  doLogin(e: MouseEvent) {
    this.dialogRef.removePanelClass('error');
    if (this.signupMode) {
      this.doSignup(e);
      return;
    }

    this.auth.signInWithEmailAndPassword(this.email, this.password)
        .then(() => {
          this.snackBar.open(
              'Welcome back. Thanks for hanging out with us.', '',
              {duration: 3000});
        })
        .catch(e => this.loginCatch(e));
  }

  doSignup(e: MouseEvent) {
    this.auth.createUserWithEmailAndPassword(this.email, this.password)
        .then(() => {
          this.snackBar.open('Welcome to Jurassic Park.', '', {duration: 3000});
        })
        .catch(e => this.loginCatch(e));
  }

  doNot(e: MouseEvent) {
    this.dialogRef.close();
  }
}
