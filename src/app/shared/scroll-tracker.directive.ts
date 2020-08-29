import {Directive, ElementRef, EventEmitter, Input, OnDestroy, Output} from '@angular/core';
import {fromEvent, Subscription} from 'rxjs';
import {filter, map, throttleTime} from 'rxjs/operators';

@Directive({selector: '[scrollTracker]'})
export class ScrollTrackerDirective implements OnDestroy {
  /** This is necessary for the [scrollTracker] syntax to work. */
  @Input() scrollTracker = '';

  scrollSubscription: Subscription;

  @Output() appear = new EventEmitter<boolean>();
  private appeared = false;

  constructor(
      private readonly elementRef: ElementRef,
  ) {
    const element: HTMLElement = this.elementRef.nativeElement;

    this.scrollSubscription =
        fromEvent(window, 'scroll')
            .pipe(filter(() => !this.appeared), throttleTime(100), map(e => {
                    return window.scrollY;
                  }))
            .subscribe(pos => {
              if (pos + (window.innerHeight * 1.5) > element.offsetTop) {
                this.appear.next(true);
                this.appeared = true;
              }
            });
  }

  ngOnDestroy() {
    this.scrollSubscription.unsubscribe();
  }
}
