import { Routes } from '@angular/router'
import { Landing as HomePage } from './views/landing/landing'
import { Login as LoginPage } from './views/auth/login/login'
import { Register as RegisterPage } from './views/auth/register/register'
import { Verify as VerifyPage } from './views/auth/verify/verify'
import { Dashboard } from './views/dashboard/dashboard'
import {Notfound} from './views/notfound/notfound'

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'verify', component: VerifyPage },
  { path: 'dashboard', component: Dashboard },
  { path: 'not-found', component: Notfound },
  { path: '**', redirectTo: '/not-found' }
]
