import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GameListScreenComponent } from './game-list-screen.component';

describe('GameListScreenComponent', () => {
  let component: GameListScreenComponent;
  let fixture: ComponentFixture<GameListScreenComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GameListScreenComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GameListScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
