import {Component, OnInit} from '@angular/core';
import {ScreenDirective} from 'src/app/shared/screen.directive';

@Component({
  selector: 'app-about-screen',
  templateUrl: './about-screen.component.html',
  styleUrls: ['./about-screen.component.scss']
})
export class AboutScreenComponent extends ScreenDirective implements OnInit {
  constructor() {
    super();
  }

  ngOnInit(): void {}
}
