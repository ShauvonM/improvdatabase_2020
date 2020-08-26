import { Component, OnInit } from '@angular/core';
import { ScreenDirective } from '../shared/screen.directive';

@Component({
  selector: 'app-welcome-screen',
  templateUrl: './welcome-screen.component.html',
  styleUrls: ['./welcome-screen.component.scss']
})
export class WelcomeScreenComponent extends ScreenDirective implements OnInit {

  constructor() { super(); }

  ngOnInit(): void {
  }

}
