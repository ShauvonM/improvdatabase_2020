import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { GameListItemComponent } from './game-list-item.component';

describe('GameListItemComponent', () => {
  let component: GameListItemComponent;
  let fixture: ComponentFixture<GameListItemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ GameListItemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GameListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
