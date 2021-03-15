import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGameScreenComponent } from './add-game-screen.component';

describe('AddGameScreenComponent', () => {
  let component: AddGameScreenComponent;
  let fixture: ComponentFixture<AddGameScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddGameScreenComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddGameScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
