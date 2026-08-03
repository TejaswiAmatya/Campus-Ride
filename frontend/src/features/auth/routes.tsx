import { ConfirmSignupPage } from './components/ConfirmSignupPage'
import { DriverRegistrationPage } from './components/DriverRegistrationPage'
import { LoginPage } from './components/LoginPage'
import { RegisterPage } from './components/RegisterPage'
import type { AppRoute } from '@/routes/types'

export const authRoutes: AppRoute[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/confirm', element: <ConfirmSignupPage /> },
  { path: '/driver/register', element: <DriverRegistrationPage /> },
]
