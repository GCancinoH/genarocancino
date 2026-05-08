import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatFlex } from './flex';

describe('MatFlex', () => {
  let component: MatFlex;
  let fixture: ComponentFixture<MatFlex>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatFlex]
    }).compileComponents();

    fixture = TestBed.createComponent(MatFlex);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply default styles', () => {
    const hostElement = fixture.nativeElement as HTMLElement;
    expect(hostElement.style.flexDirection).toBe('row');
    expect(hostElement.style.display).toBe('flex');
  });
});
