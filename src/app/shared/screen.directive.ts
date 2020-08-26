import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[appScreen]'
})
export class ScreenDirective {

  title = '';
  @HostBinding('className') className = 'screen';

}
