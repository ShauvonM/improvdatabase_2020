import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WelcomeScreenComponent } from './welcome-screen.component';

describe('WelcomeScreenComponent', () => {
  let component: WelcomeScreenComponent;
  let fixture: ComponentFixture<WelcomeScreenComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ WelcomeScreenComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
