import {Component, OnInit} from '@angular/core';
import {ScreenDirective} from 'src/app/shared/screen.directive';

@Component({
  selector: 'app-news-screen',
  templateUrl: './news-screen.component.html',
  styleUrls: ['./news-screen.component.scss']
})
export class NewsScreenComponent extends ScreenDirective implements OnInit {
  constructor() {
    super();
  }

  ngOnInit(): void {}
}
