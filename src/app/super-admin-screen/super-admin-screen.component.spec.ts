import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperAdminScreenComponent } from './super-admin-screen.component';

describe('SuperAdminScreenComponent', () => {
  let component: SuperAdminScreenComponent;
  let fixture: ComponentFixture<SuperAdminScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SuperAdminScreenComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SuperAdminScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
