import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GameDetailsScreenComponent } from './game-details-screen.component';

describe('GameDetailsScreenComponent', () => {
  let component: GameDetailsScreenComponent;
  let fixture: ComponentFixture<GameDetailsScreenComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GameDetailsScreenComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GameDetailsScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
