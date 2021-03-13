import {Component, OnInit} from '@angular/core';
import {ScreenDirective} from 'src/app/shared/screen.directive';

@Component({
  selector: 'app-home-screen',
  templateUrl: './home-screen.component.html',
  styleUrls: ['./home-screen.component.scss']
})
export class HomeScreenComponent extends ScreenDirective implements OnInit {
  constructor() {
    super();
  }

  ngOnInit(): void {}
}
