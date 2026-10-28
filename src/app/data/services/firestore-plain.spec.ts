import { Timestamp } from '@angular/fire/firestore';
import { timestampToMillis, toPlain, toFirestore } from './firestore-plain';

describe('firestore-plain', () => {
  describe('toPlain', () => {
    /**
     * Regresión del bug: `setDoc()` lanza
     * "Function setDoc() called with invalid data.
     *  Unsupported field value: undefined"
     * cuando una clave existe con valor undefined, aunque el campo sea
     * opcional en el tipo TypeScript.
     */
    it('omite las claves con valor undefined', () => {
      const result = toPlain({
        displayName: 'Ana López',
        phone: undefined,
        objective: {
          goal: 'perdida-peso',
          patientExpectation: undefined,
          targetWeightKg: 60,
        },
      }) as any;

      expect('phone' in result).toBe(false);
      expect(result.displayName).toBe('Ana López');
      expect('patientExpectation' in result.objective).toBe(false);
      expect(result.objective.targetWeightKg).toBe(60);
    });

    it('conserva los falsy válidos (false, 0, cadena vacía)', () => {
      const result = toPlain({
        archived: false,
        exerciseDays: 0,
        allergies: '',
        foodRecord24h: { enabled: false, timeOfDay: '' },
      }) as any;

      expect(result.archived).toBe(false);
      expect(result.exerciseDays).toBe(0);
      expect(result.allergies).toBe('');
      expect(result.foodRecord24h.enabled).toBe(false);
      expect(result.foodRecord24h.timeOfDay).toBe('');
    });

    it('convierte los undefined dentro de arrays a null para no alterar índices', () => {
      const result = toPlain({ tags: ['diabetes', undefined, 'embarazo'] }) as any;
      expect(result.tags).toEqual(['diabetes', null, 'embarazo']);
    });

    it('pasa Timestamp a epoch millis', () => {
      const millis = 1_700_000_000_000;
      const result = toPlain({ createdAt: Timestamp.fromMillis(millis) }) as any;
      expect(result.createdAt).toBe(millis);
    });

    it('devuelve null tal cual', () => {
      expect(toPlain(null)).toBeNull();
      expect(toPlain(undefined)).toBeUndefined();
    });
  });

  describe('toFirestore', () => {
    /**
     * Regresión del bug de guardado: las reglas declaran `createdAt`,
     * `updatedAt`, `archivedAt` y `lastContactAt` como `timestamp`, y un
     * número en un campo de ese tipo se rechaza con 403 PERMISSION_DENIED.
     * Los modelos guardan las fechas en epoch millis porque así sobrevive el
     * espejo IndexedDB, así que al escribir a Firestore hay que devolverlas
     * como `Timestamp`.
     */
    it('convierte las fechas epoch millis a Timestamp', () => {
      const millis = 1_700_000_000_000;
      const result = toFirestore({
        createdAt: millis,
        updatedAt: millis,
        archivedAt: millis,
        lastContactAt: millis,
      }) as any;

      for (const field of ['createdAt', 'updatedAt', 'archivedAt', 'lastContactAt']) {
        expect(result[field]).toBeInstanceOf(Timestamp);
        expect(result[field].toMillis()).toBe(millis);
      }
    });

    it('no toca los números que no son fechas', () => {
      const result = toFirestore({
        initialWeight: 70.5,
        exerciseDays: 3,
        updatedAt: 1_700_000_000_000,
      }) as any;

      expect(result.initialWeight).toBe(70.5);
      expect(result.exerciseDays).toBe(3);
      expect(result.updatedAt).toBeInstanceOf(Timestamp);
    });

    it('conserva un Timestamp y normaliza un Date', () => {
      const millis = 1_700_000_000_000;
      const ts = Timestamp.fromMillis(millis);
      const result = toFirestore({ createdAt: ts, updatedAt: new Date(millis) }) as any;

      expect(result.createdAt).toBe(ts); // misma instancia, sin reconvertir
      // Un Date también sirve, pero se deja como Timestamp para no depender
      // de que el SDK lo convierta en el envío.
      expect(result.updatedAt).toBeInstanceOf(Timestamp);
      expect(result.updatedAt.toMillis()).toBe(millis);
    });

    it('sigue omitiendo las claves undefined que rechaza setDoc', () => {
      const result = toFirestore({
        displayName: 'Ana López',
        phone: undefined,
        baselineId: undefined,
        createdAt: 1_700_000_000_000,
      }) as any;

      expect('phone' in result).toBe(false);
      expect('baselineId' in result).toBe(false);
      expect(result.displayName).toBe('Ana López');
      expect(result.createdAt).toBeInstanceOf(Timestamp);
    });

    it('recursa en los objetos anidados', () => {
      const result = toFirestore({
        objective: { goal: 'perdida-peso', patientExpectation: undefined, targetWeightKg: 60 },
      }) as any;

      expect(result.objective.targetWeightKg).toBe(60);
      expect('patientExpectation' in result.objective).toBe(false);
    });
  });

  describe('timestampToMillis', () => {
    it('acepta Timestamp, número, string ISO y plano', () => {
      const millis = 1_700_000_000_000;
      expect(timestampToMillis(Timestamp.fromMillis(millis))).toBe(millis);
      expect(timestampToMillis(millis)).toBe(millis);
      expect(timestampToMillis('2023-11-14T22:13:20.000Z')).toBe(millis);
      // Plano, sin prototipo (viene del espejo de IndexedDB)
      expect(timestampToMillis({ seconds: 1_700_000_000, nanoseconds: 0 })).toBe(millis);
    });

    it('devuelve undefined ante basura', () => {
      expect(timestampToMillis(undefined)).toBeUndefined();
      expect(timestampToMillis(null)).toBeUndefined();
      expect(timestampToMillis('no es fecha')).toBeUndefined();
      expect(timestampToMillis({})).toBeUndefined();
    });
  });
});
