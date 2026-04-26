import { Routes } from '@angular/router';
import { categoriesPath } from './category/category.routes';
import { expensesPath } from './expense/expense.routes';
import { authGuard } from './shared/guard/auth.guard';

export const defaultPath = categoriesPath;
export const loginPath = 'login';

const appRoutes: Routes = [
  {
    path: '',
    redirectTo: defaultPath,
    pathMatch: 'full'
  },
  {
    path: loginPath,
    loadComponent: () => import('./shared/component/login/login.component')
  },
  {
    path: categoriesPath,
    loadChildren: () => import('./category/category.routes'),
    canActivate: [authGuard]
  },
  {
    path: expensesPath,
    loadChildren: () => import('./expense/expense.routes'),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: defaultPath
  }
];

export default appRoutes;
