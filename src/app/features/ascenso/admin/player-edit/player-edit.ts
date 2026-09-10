import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
// Material
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
// UI
import { MatFlex } from '@features/ui/flex/flex';
import { FullWidthDirective } from '@features/ui/full-width/full-width.directive';
import { Header } from '@features/ui/header/header';
// Backend
import { AdminRepository, PlayerRecord } from 'src/app/data/repositories/admin';
import { MealDay, Meal } from 'src/app/data/models/player/meal-plan';
import { WorkoutDay, Exercise } from 'src/app/data/models/player/workout-plan';

@Component({
  selector: 'app-player-edit',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    Header,
    MatFlex,
    FullWidthDirective,
  ],
  templateUrl: './player-edit.html',
  styleUrl: './player-edit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminRepository = inject(AdminRepository);
  private readonly location = inject(Location);
  private readonly snackBar = inject(MatSnackBar);

  // Route param
  uid = signal<string>('');
  // Loading state
  loading = signal(true);
  // Save state
  saving = signal(false);
  saveStatus = signal<'saving' | 'success' | 'error' | null>(null);
  saveMessage = signal('');
  // Selected tab
  selectedTab = signal(0);
  // ─── General Info ────────────────────────────────────────────────────
  playerData = signal<PlayerRecord & { age?: number } | null>(null);

  // Signal Form for general info
  playerForm = form(signal({
    displayName: '',
    email: '',
    age: 0 as number,
  }));

  editDisabled = signal(false);
  editPremium = signal(false);

  // ─── Meal Plan ────────────────────────────────────────────────────────
  mealDays = signal<MealDay[]>([]);

  // ─── Workout Plan ─────────────────────────────────────────────────────
  workoutDays = signal<WorkoutDay[]>([]);

  ngOnInit() {
    const uidParam = this.route.snapshot.paramMap.get('uid');
    if (!uidParam) {
      this.snackBar.open('ERROR: No se especificó un ID de jugador.', 'OK', { duration: 5000 });
      this.location.back();
      return;
    }

    this.uid.set(uidParam);
    this.loadPlayerData(uidParam);
  }

  private async loadPlayerData(uid: string) {
    this.loading.set(true);
    const result = await this.adminRepository.getPlayerById(uid);

    if (result.status === 'success' && result.data) {
      const player = result.data;
      this.playerData.set(player);
      this.playerForm.displayName().value.set(player.displayName || '');
      this.playerForm.email().value.set(player.email || '');
      this.playerForm.age().value.set(player.age ?? 0);
      this.editDisabled.set(player.disabled);
      this.editPremium.set(player.customClaims?.premiumAccount ?? false);

      // Load meal plan from player doc (stored as field)
      if ((player as any).mealPlan?.days) {
        this.mealDays.set((player as any).mealPlan.days);
      }

      // Load workout plan from player doc (stored as field)
      if ((player as any).workoutPlan?.days) {
        this.workoutDays.set((player as any).workoutPlan.days);
      }
    } else if (result.status === 'error') {
      this.snackBar.open(
        result.message || 'Error al cargar los datos del jugador.',
        'OK',
        { duration: 5000 }
      );
      this.location.back();
    }

    this.loading.set(false);
  }

  goBack() {
    this.location.back();
  }

  // ─── Toggle helpers ────────────────────────────────────────────────────
  /** Inverted signal for the "CUENTA ACTIVA" toggle — ON = active = !disabled */
  editActive = computed(() => !this.editDisabled());

  toggleActive() {
    this.editDisabled.set(!this.editDisabled());
  }

  // ─── Save All ──────────────────────────────────────────────────────────
  async saveAll() {
    const uid = this.uid();
    if (!uid) return;

    this.saving.set(true);
    this.saveStatus.set('saving');

    const formValues = this.playerForm().value() ?? {};
    const payload = {
      displayName: formValues.displayName || null,
      email: formValues.email || null,
      age: formValues.age ?? null,
      disabled: this.editDisabled(),
      premiumAccount: this.editPremium(),
      mealPlan: { days: this.mealDays() },
      workoutPlan: { days: this.workoutDays() },
    };

    const result = await this.adminRepository.updatePlayer(uid, payload);

    if (result.status === 'success') {
      this.saveStatus.set('success');
      this.saveMessage.set('');
      this.snackBar.open('Cambios guardados exitosamente.', 'OK', { duration: 3000 });
      setTimeout(() => this.saveStatus.set(null), 3000);
    } else if (result.status === 'error') {
      this.saveStatus.set('error');
      this.saveMessage.set(result.message || 'Error al guardar');
      this.snackBar.open('Error al guardar los cambios.', 'OK', { duration: 5000 });
    }

    this.saving.set(false);
  }

  // ─── Meal Plan Methods ────────────────────────────────────────────────
  addMealDay() {
    const days = this.mealDays();
    const nextDay = days.length > 0 ? Math.max(...days.map(d => d.dia)) + 1 : 1;
    this.mealDays.update(d => [...d, { dia: nextDay, comidas: [] }]);
  }

  removeMealDay(index: number) {
    this.mealDays.update(d => d.filter((_, i) => i !== index));
  }

  addMeal(dayIndex: number) {
    const day = this.mealDays()[dayIndex];
    if (!day) return;
    const mealNum = day.comidas.length + 1;
    const newMeal: Meal = {
      nombre: `Comida #${mealNum}`,
      hora: '',
      descripcion: '',
      alimentos: '',
    };
    this.mealDays.update(days => {
      const updated = [...days];
      updated[dayIndex] = { ...updated[dayIndex], comidas: [...updated[dayIndex].comidas, newMeal] };
      return updated;
    });
  }

  removeMeal(dayIndex: number, mealIndex: number) {
    this.mealDays.update(days => {
      const updated = [...days];
      updated[dayIndex] = {
        ...updated[dayIndex],
        comidas: updated[dayIndex].comidas.filter((_, i) => i !== mealIndex),
      };
      return updated;
    });
  }

  /**
   * Decodes a small BBCode-style subset saved as plain text in Firestore.
   * Keep this intentionally narrow so admins can use simple tags without a WYSIWYG editor.
   */
  decodeMarkup(value: string | null | undefined): string {
    if (!value) return '';

    let html = this.escapeHtml(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    html = this.decodeListTag(html, 'sub-list', 'sub-list');
    html = this.decodeListTag(html, 'list');
    html = html
      .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');

    return html;
  }

  private decodeListTag(html: string, tag: 'list' | 'sub-list', className = ''): string {
    const pattern = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'gi');
    return html.replace(pattern, (_, content: string) => {
      const items = content
        .split('\n')
        .map(item => item.trim().replace(/^[-*•]\s*/, ''))
        .filter(Boolean)
        .map(item => `<li>${item}</li>`)
        .join('');

      const classAttr = className ? ` class="${className}"` : '';
      return items ? `<ul${classAttr}>${items}</ul>` : '';
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Workout Plan Methods ─────────────────────────────────────────────
  addWorkoutDay() {
    const days = this.workoutDays();
    const nextDay = days.length > 0 ? Math.max(...days.map(d => d.dia)) + 1 : 1;
    this.workoutDays.update(d => [...d, { dia: nextDay, ejercicios: [] }]);
  }

  removeWorkoutDay(index: number) {
    this.workoutDays.update(d => d.filter((_, i) => i !== index));
  }

  addExercise(dayIndex: number) {
    const day = this.workoutDays()[dayIndex];
    if (!day) return;
    const exNum = day.ejercicios.length + 1;
    const newExercise: Exercise = {
      nombre: `Ejercicio #${exNum}`,
      series: 4,
      repeticiones: '',
      descanso: '',
      notas: '',
    };
    this.workoutDays.update(days => {
      const updated = [...days];
      updated[dayIndex] = {
        ...updated[dayIndex],
        ejercicios: [...updated[dayIndex].ejercicios, newExercise],
      };
      return updated;
    });
  }

  removeExercise(dayIndex: number, exerciseIndex: number) {
    this.workoutDays.update(days => {
      const updated = [...days];
      updated[dayIndex] = {
        ...updated[dayIndex],
        ejercicios: updated[dayIndex].ejercicios.filter((_, i) => i !== exerciseIndex),
      };
      return updated;
    });
  }
}
