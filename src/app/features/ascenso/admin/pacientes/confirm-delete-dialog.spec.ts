import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDeleteDialog, ConfirmDeleteDialogData } from './confirm-delete-dialog';

describe('ConfirmDeleteDialog', () => {
  let component: ConfirmDeleteDialog;
  let fixture: ComponentFixture<ConfirmDeleteDialog>;

  // Stubs hechos a mano en lugar de espías: así el spec no depende de que el
  // runner exponga `vi` o `jasmine` como global.
  const calls = {
    close: [] as unknown[],
  };

  const dialogRefStub = {
    close(result?: unknown) {
      calls.close.push(result);
    },
  };

  const paciente = {
    uid: 'abc123',
    displayName: 'Paciente Uno',
    email: 'paciente@example.com',
  };

  async function crear(data: Partial<ConfirmDeleteDialogData['patient']> = {}): Promise<void> {
    calls.close.length = 0;

    await TestBed.configureTestingModule({
      imports: [ConfirmDeleteDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { patient: { ...paciente, ...data } } },
        { provide: MatDialogRef, useValue: dialogRefStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDeleteDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    await crear();
    expect(component).toBeTruthy();
  });

  it('dirige el aviso al nombre del paciente', async () => {
    await crear();
    expect(component['nombre']()).toBe('Paciente Uno');
  });

  it('usa el correo si el paciente no tiene nombre', async () => {
    await crear({ displayName: '' });
    expect(component['nombre']()).toBe('paciente@example.com');
  });

  it('cae a un texto neutro si no hay ni nombre ni correo', async () => {
    await crear({ displayName: '', email: '' });
    expect(component['nombre']()).toBe('este paciente');
  });

  it('muestra el nombre en el DOM para que el nutriólogo vea a quién borra', async () => {
    await crear();
    expect(fixture.nativeElement.textContent).toContain('Paciente Uno');
  });

  it('cancelar cierra con false, sin borrar nada', async () => {
    await crear();
    component['cancel']();
    expect(calls.close).toEqual([false]);
  });

  it('confirmar cierra con true para que el llamador ejecute el borrado', async () => {
    await crear();
    component['confirm']();
    expect(calls.close).toEqual([true]);
  });
});
