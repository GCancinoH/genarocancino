import { Routes } from '@angular/router';
import { canActivate, redirectUnauthorizedTo, redirectLoggedInTo } from "@angular/fire/auth-guard"
import { adminGuard } from '@data/guards/admin-guard';

const redirectToSignIn = () => redirectUnauthorizedTo(['ascenso/sign-in']);
const redirectToDashboard = () => redirectLoggedInTo(['ascenso/dashboard']);

export const routes: Routes = [
    { path: '', redirectTo: 'ascenso', pathMatch: 'full' },
    {
        path: 'ascenso',
        loadComponent: () => import('@features/ascenso/home').then(c => c.Home),
        title: "Protocolo Ascenso | Genaro Cancino"
    },
    {
        path: 'ascenso/sign-in',
        ...canActivate(redirectToDashboard),
        loadComponent: () => import('@features/ascenso/sign-in/sign-in').then(c => c.SignIn),
        title: "Entrar | Protocolo Ascenso"
    },
    {
        path: 'ascenso/dashboard',
        ...canActivate(redirectToSignIn),
        loadComponent: () => import('@features/ascenso/dashboard/dashboard').then(c => c.Dashboard),
        title: "Dashboard | Protocolo Ascenso"
    },
    {
        path: 'ascenso/profile/:uid',
        ...canActivate(redirectToSignIn),
        loadComponent: () => import('@features/ascenso/profile/profile').then(c => c.Profile),
        title: "Perfil | Protocolo Ascenso"
    },
    {
        // Panel del nutriólogo: shell con sidebar + secciones lazy.
        // El claim `role === 'admin'` lo validan adminGuard (UI), Flask
        // (require_role) y firestore.rules (datos). Una sola fuente de verdad.
        path: 'ascenso/admin',
        canActivate: [redirectToSignIn, adminGuard],
        loadComponent: () => import('@features/ascenso/admin/admin').then(c => c.AdminComponent),
        title: "Panel del Nutriólogo | Protocolo Ascenso",
        children: [
            {
                // Fase 3: aquí housed el dashboard con KPIs.
                path: '',
                pathMatch: 'full',
                redirectTo: 'pacientes'
            },
            {
                path: 'pacientes',
                loadComponent: () => import('@features/ascenso/admin/pacientes/pacientes').then(c => c.PacientesComponent),
                title: "Pacientes | Protocolo Ascenso"
            },
            {
                // Debe ir ANTES de 'pacientes/:uid', o 'nuevo' se capturaría
                // como si fuera un UID.
                path: 'pacientes/nuevo',
                loadComponent: () => import('@features/ascenso/admin/pacientes/new-patient/new-patient').then(c => c.NewPatient),
                title: "Alta de paciente | Protocolo Ascenso"
            },
            {
                path: 'pacientes/:uid',
                loadComponent: () => import('@features/ascenso/admin/player-edit/player-edit').then(c => c.PlayerEditComponent),
                title: "Expediente | Protocolo Ascenso"
            },
            {
                path: 'agenda',
                loadComponent: () => import('@features/ascenso/admin/agenda/agenda').then(c => c.AgendaComponent),
                title: "Agenda | Protocolo Ascenso"
            },
            {
                // Compatibilidad con enlaces previos a la Fase 1.
                path: 'player-edit/:uid',
                redirectTo: 'pacientes/:uid'
            }
        ]
    },
    {
        path: 'about',
        loadComponent: () => import('@features/about/about').then(c => c.About),
    },
    {
        path: 'demo',
        loadComponent: () => import('./features/demo/db-demo').then(c => c.DbDemoComponent),
    }
];