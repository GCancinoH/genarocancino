import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConnectivityService } from '@data/services/connectivity';
import { PatientsRepository } from '@data/repositories/patients';
import { NewPatient } from './new-patient';

describe('NewPatient', () => {
  let component: NewPatient;
  let fixture: ComponentFixture<NewPatient>;
  /** Señal compartida con el componente: cambiarla simula caída de red. */
  let onlineSignal: WritableSignal<boolean>;

  // Stubs hechos a mano en lugar de espías: así el spec no depende de que el
  // runner exponga `vi` o `jasmine` como global.
  const calls = {
    navigate: [] as string[][],
    createPatient: 0,
    saveDraft: 0,
  };

  const routerStub = {
    navigate(commands: string[]) {
      calls.navigate.push(commands);
      return Promise.resolve(true);
    },
  };

  const patientsStub = {
    // Si llegara a ejecutarse en alguno de estos tests, el error lo delata.
    async createPatient(): Promise<never> {
      calls.createPatient += 1;
      throw new Error('createPatient no debe llamarse en este test');
    },
    async saveDraft(): Promise<void> {
      calls.saveDraft += 1;
    },
  };

  const snackBarStub = {
    open: () => ({ onAction: () => of() }),
  };

  beforeEach(async () => {
    calls.navigate.length = 0;
    calls.createPatient = 0;
    calls.saveDraft = 0;
    onlineSignal = signal(true);

    await TestBed.configureTestingModule({
      imports: [NewPatient],
      providers: [
        { provide: PatientsRepository, useValue: patientsStub },
        { provide: ConnectivityService, useValue: { online: onlineSignal } },
        { provide: MatSnackBar, useValue: snackBarStub },
        { provide: Router, useValue: routerStub },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(null) }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  /** Rellena los dos campos obligatorios: nombre y correo. */
  function fillRequiredFields(): void {
    component['form'].nombre().value.set('Ana López');
    component['form'].correo().value.set('ana@ejemplo.com');
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('vuelve al listado sin registrar nada al pulsar atrás', () => {
    component['goBack']();

    expect(calls.navigate).toEqual([['/ascenso/admin/pacientes']]);
    expect(calls.createPatient).toBe(0);
  });

  it('no llama al backend si el formulario es inválido', async () => {
    await component['submit']();

    expect(calls.createPatient).toBe(0);
    expect(calls.navigate.length).toBe(0);
  });

  it('guarda borrador y vuelve al listado cuando no hay conexión', async () => {
    onlineSignal.set(false);
    fillRequiredFields();

    await component['submit']();

    expect(calls.saveDraft).toBe(1);
    expect(calls.createPatient).toBe(0);
    expect(calls.navigate).toEqual([['/ascenso/admin/pacientes']]);
  });

  it('deriva la edad de la fecha de nacimiento y la pinta en el campo', () => {
    component['form'].fechaNacimiento().value.set('2000-01-01');
    fixture.detectChanges();

    const esperado = new Date().getFullYear() - 2000;
    expect(component['edadCalculada']()).toBe(esperado);

    // matInput sin formField puede pisar el valor del DOM, así que se
    // comprueba que el número llega al input de verdad.
    const input = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.value).toBe(String(esperado));
    expect(input.readOnly).toBe(true);
  });

  it('deja la edad vacía mientras no haya fecha de nacimiento', () => {
    fixture.detectChanges();

    expect(component['edadCalculada']()).toBeNull();

    const input = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.value).toBe('');
  });
});
