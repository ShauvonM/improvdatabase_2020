import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {ScrollTrackerDirective} from './scroll-tracker.directive';
import { StripTagsPipe } from './strip-tags.pipe';

@NgModule({
  declarations: [
    ScrollTrackerDirective,
    StripTagsPipe,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    ScrollTrackerDirective,
  ]
})
export class SharedModule {
}
