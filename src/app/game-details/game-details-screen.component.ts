import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ScreenDirective} from '../shared/screen.directive';

@Component({
  selector: 'app-game-details-screen',
  templateUrl: './game-details-screen.component.html',
  styleUrls: ['./game-details-screen.component.scss']
})
export class GameDetailsScreenComponent extends ScreenDirective implements
    OnInit {
  constructor(
      private readonly route: ActivatedRoute,
  ) {
    super();

    this.route.params.subscribe(params => {
      const slug = params.slug;
      console.log('slug!', slug);
    });
  }

  ngOnInit(): void {}
}
