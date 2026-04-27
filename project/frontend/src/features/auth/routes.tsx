import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { ConfirmSignupPage } from './ConfirmSignupPage'
import { DriverRegistrationPage } from './DriverRegistrationPage'
import type { AppRoute } from '@/routes/types'

export const authRoutes: AppRoute[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/confirm', element: <ConfirmSignupPage /> },
  { path: '/driver/register', element: <DriverRegistrationPage /> },
]
