import { ChangeDetectionStrategy, Component, effect, ElementRef, signal, viewChildren } from '@angular/core';
/* material */
import { MatAnchor, MatButton } from '@angular/material/button';
// ui
import { Header } from '@features/ui/header/header';

interface AscensoLetters {
  char: string;
  meaning: string;
  description: string;
}

interface Level {
  id: number;
  level: number;
  name: string;
  description: string;
  includes: string[];
  objective: string;
}

interface Principle {
  id: number;
  roman: string;
  title: string;
  text1: string;
  text2: string;
}

@Component({
  selector: 'app-home',
  imports: [Header, MatAnchor, MatButton],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  // view children
  readonly cards = viewChildren<ElementRef<HTMLElement>>('principleCard');
  readonly pyramidBlocks = viewChildren<ElementRef<HTMLElement>>('pyramidLevel');
  readonly revealElements = viewChildren<ElementRef<HTMLElement>>('revealItem');

  // signals
  activePrinciple = signal('I');
  
  // containers
  letters: AscensoLetters[] = [
    { char: 'A', meaning: 'Análisis', description: 'Comprender el punto de partida' },
    { char: 'S', meaning: 'Sistema', description: 'Establecer una estructura clara de acción.' },
    { char: 'C', meaning: 'Consistencia', description: 'Aplicar el sistema diariamente.' },
    { char: 'E', meaning: 'Evolución', description: 'Medir progreso y mejorar.' },
    { char: 'N', meaning: 'Nivelación', description: 'Aumentar la dificultad y las capacidades.' },
    { char: 'S', meaning: 'Sinergia', description: 'Transferir lo aprendido a otras áreas de la vida.' },
    { char: 'O', meaning: 'Optimización', description: 'Refinar el sistema para lograr sostenibilidad en el largo plazo.' }
  ];

  levels: Level[] = [
    { id: 1, level: 1, name: 'Fundamento', description: 'Salud básica.', includes: ['Sueño', 'Hidratación', 'Nutrición básica', 'Movimiento diario'], objective: 'Estabilidad biológica' },
    { id: 2, level: 2, name: 'Energía', description: 'Optimización metabólica.', includes: ['Nutrición estructurada', 'Digestión', 'Energía estable'], objective: 'Energía sostenida' },
    { id: 3, level: 3, name: 'Capacidad', description: 'Desarrollo físico.', includes: ['Fuerza', 'Resistencia', 'Movilidad'], objective: 'Cuerpo funcional' },
    { id: 4, level: 4, name: 'Control', description: 'Autodisciplina.', includes: ['Hábitos', 'Consistencia', 'Gestión del tiempo'], objective: 'Dominio personal' },
    { id: 5, level: 5, name: 'Claridad', description: 'Desarrollo mental.', includes: ['Enfoque', 'Aprendizaje', 'Pensamiento estratégico'], objective: 'Dirección' },
    { id: 6, level: 6, name: 'Expansión', description: 'Impacto en el mundo real.', includes: ['Proyectos', 'Trabajo', 'Finanzas'], objective: 'Creación de valor' },
    { id: 7, level: 7, name: 'Ascenso', description: 'Nivel superior del sistema.', includes: ['Autodominio', 'Propósito', 'Vida optimizada'], objective: 'Vida alineada' }
  ];

  principles: Principle[] = [
    { id: 1, roman: 'I', title: 'El cuerpo es la primera victoria.', text1: 'Antes de dominar el mundo exterior, debes aprender a dominar tu cuerpo.', text2: 'La disciplina física es el inicio del progreso.' },
    { id: 2, roman: 'II', title: 'La estrategia vence a la motivación.', text1: 'La motivación es temporal.', text2: 'La estrategia crea resultados sostenibles.' },
    { id: 3, roman: 'III', title: 'La consistencia transforma lo ordinario en extraordinario.', text1: 'No es una acción aislada la que cambia tu vida.', text2: 'Es la repetición disciplinada de las acciones correctas.' },
    { id: 4, roman: 'IV', title: 'El progreso debe ser medible.', text1: 'Lo que no se mide no se puede mejorar.', text2: 'El progreso visible genera confianza y dirección.' },
    { id: 5, roman: 'V', title: 'Cada nivel exige una versión superior de ti mismo.', text1: 'El crecimiento requiere abandonar viejas versiones de uno mismo.', text2: 'Ascender implica evolucionar.' },
    { id: 6, roman: 'VI', title: 'La disciplina física construye disciplina mental.', text1: 'El entrenamiento no solo cambia el cuerpo.', text2: 'Entrena tu mente para enfrentar resistencia.' },
    { id: 7, roman: 'VII', title: 'Ascender es optimizar tu vida.', text1: 'El objetivo final no es solo mejorar el físico.', text2: 'Es vivir con mayor energía, claridad y dirección.' }
  ];

  activeLevel = signal<Level>(this.levels[0]);

  constructor() {
    effect((onCleanup) => {
      const elements = this.cards();
      const pyramid = this.pyramidBlocks();
      const reveals = this.revealElements();
      
      if (elements.length === 0 && pyramid.length === 0 && reveals.length === 0) return;

      // --- OBSERVADOR A: Revelar elementos (.reveal) ---
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      // --- OBSERVADOR B: Nivel Activo (principleCard) ---
      const levelObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const principle = entry.target.getAttribute('data-principle') || 'I';
            this.activePrinciple.set(principle);
          }
        });
      }, { threshold: 0.6 });

      // --- OBSERVADOR C: Pirámide ---
      const pyramidObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const lvl = Number(entry.target.getAttribute('data-level'));
            const foundLevel = this.levels.find(level => level.level === lvl);
            if (foundLevel) {
              this.activeLevel.set(foundLevel);
            }
          }
        });
      }, { threshold: 0.7 });

      // Observar elementos reveal
      reveals.forEach(el => revealObserver.observe(el.nativeElement));

      elements.forEach(card => levelObserver.observe(card.nativeElement));
      pyramid.forEach(block => pyramidObserver.observe(block.nativeElement));

      onCleanup(() => {
        revealObserver.disconnect();
        levelObserver.disconnect();
        pyramidObserver.disconnect();
      });
    });
  }

  setActiveLevel(level: Level) {
    this.activeLevel.set(level);
  }
}

