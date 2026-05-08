import { Routes } from '@angular/router';
import { canActivate, redirectUnauthorizedTo, redirectLoggedInTo } from "@angular/fire/auth-guard"

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
        path: 'about',
        loadComponent: () => import('@features/about/about').then(c => c.About),
    },
    {
        path: 'demo',
        loadComponent: () => import('./features/demo/db-demo').then(c => c.DbDemoComponent),
    }
];