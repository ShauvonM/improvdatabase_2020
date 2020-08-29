import {Component, Inject} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {auth} from 'firebase/app';
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
    return matDialog.open(LoginDialogComponent, {width: '18rem', data});
  }

  title = 'Log in';

  authSubscription: Subscription;

  email = '';
  password = '';

  error = '';

  constructor(
      private readonly dialogRef: MatDialogRef<LoginDialogComponent>,
      @Inject(MAT_DIALOG_DATA) private readonly data: LoginData,
      private readonly auth: AngularFireAuth,
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

  doGoogle(e: MouseEvent) {
    e.stopPropagation();
    this.auth.signInWithPopup(new auth.GoogleAuthProvider());
  }

  doLogin(e: MouseEvent) {
    this.dialogRef.removePanelClass('error');
    this.auth.signInWithEmailAndPassword(this.email, this.password).catch(e => {
      console.log('login error', e);
      if (e.code && e.code === 'auth/too-many-requests') {
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
    });
  }

  doNot(e: MouseEvent) {
    this.dialogRef.close();
  }
}
