import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

export const routes: Routes = [
  {
    path: 'redirect',
    loadComponent: () =>
      import('./redirect/redirect.component').then((m) => m.RedirectComponent),
  },
  {
    path: '',
    redirectTo: 'todos',
    pathMatch: 'full',
  },
  {
    path: 'todos',
    loadComponent: () =>
      import('./features/todos/todo-list/todo-list.component').then((m) => m.TodoListComponent),
    canActivate: [MsalGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/todos/todo-dashboard/todo-dashboard.component').then(
        (m) => m.TodoDashboardComponent
      ),
    canActivate: [MsalGuard],
  },
  {
    path: '**',
    redirectTo: 'todos',
  },
];
