# Personal Finance & Budgeting App

## Application description
A web application that helps users track their expenses, categorize transactions, set budgets, and gain insights into their financial health. Users can view dashboards, get automated reports, and optionally enable gamified challenges to encourage saving. Admins (optional) can manage system-wide settings, categories, and promotional features.

---

## Domain-Driven Design snapshot

### Core entities
- **User** (name, email, authentication details, preferences, currency setting)
- **Transaction** (amount, date, description, category, recurring info, status: Cleared/Pending)
- **Category** (name, type: Income/Expense, icon/color)
- **Budget** (period, target amount, linked categories, actual spending)
- **RecurringPayment** (amount, frequency, next due date, auto-flagged transactions)
- **Goal/Challenge** (optional gamification: e.g., “Save $200 this month”)

### Aggregates & invariants
- **Budget (aggregate root)**  
  Invariants:
  - Must be linked to at least one category.
  - Spent amount cannot exceed total tracked transactions.
- **Transaction (aggregate root)**  
  Invariants:
  - Amount > 0.
  - Linked to valid category.
  - Belongs to one user only.

### Domain services
- **ReportGenerator** (monthly/weekly summaries, category breakdowns, cashflow reports).
- **PredictionService** (projected expenses vs. budget, based on history & recurring).
- **GamificationService** (tracks user challenges, streaks, savings milestones).

### Domain events (examples)
- `TransactionAdded`
- `TransactionUpdated`
- `BudgetCreated`
- `BudgetExceeded`
- `RecurringPaymentDue`
- `ChallengeStarted`
- `ChallengeCompleted`
- `GoalAchieved`

---

## Actors and workflows

### User
**Workflows**
1. Register/login (email/password; advanced: social logins).
2. Fill out profile (name, currency, preferred categories).
3. Add a transaction (manual input or CSV import).
4. Edit/delete transactions.
5. Categorize transactions (drag-and-drop into categories).
6. Create/edit budgets (per category or overall).
7. Track budgets (visual progress bar, warnings when near/exceeded).
8. Set up recurring payments (e.g., rent, subscriptions).
9. View dashboard with graphs:
   - Spending by category
   - Monthly trends
   - Income vs. expenses
   - Cashflow summary
10. Join gamified challenges (save X%, spend less in certain categories).
11. View history (month-by-month, export as CSV/PDF).
12. Receive insights & recommendations (overspending alerts, saving tips).

### Administrator (optional actor)
**Workflows**
1. Separate login (no self-registration; seeded admin).
2. Manage global categories (edit names, icons, defaults).
3. Manage promotional gamified challenges.
4. Dashboard with aggregate system usage (optional, for SaaS scenario).
5. Manage user accounts (lock, reset, invite).

---

## UI & UX highlights
- **Dashboard with graphs** (pie charts, line charts, bar graphs).
- **Drag-and-drop categorization** of uncategorized transactions.
- **Budget progress bars** (color-coded: green/yellow/red).
- **Gamification UI** with badges, streak counters, challenge progress.
- **Mobile-first design** with responsive layouts.
- **Accessibility**: high contrast, keyboard-friendly.

---

## Technical requirements (pass criteria)
- Web/mobile app with **database**.
- User registration/login.
- CRUD for transactions and budgets.
- Categories persisted in database.
- Dashboard with at least one graph (expenses per category).
- Recurring payments stored and applied automatically.
- Budgets tracked against transactions.
- Runs in Docker/docker-compose with one command.
- GitHub Actions automated tests on each push.
- Database seeded with:
  - Sample users
  - Transactions (varied categories and dates)
  - Budgets
  - Recurring payments
- Exportable reports (CSV/PDF).
- Users can view spending history and insights.

### Suggested stack
- **Backend**: Node.js (NestJS/Express), Django, or FastAPI.
- **DB**: Postgres or MySQL.
- **Frontend**: React + TypeScript, Tailwind, Recharts/D3.js for graphs.
- **Auth**: JWT with roles.
- **Infra**: Docker, docker-compose, GitHub Actions CI/CD.
- **Optional**: Redis for caching reports/insights.

---

## Advanced requirements
1. **Password reset via email.**
2. **Social logins** (Google/Microsoft).
3. **Push/email notifications** (budget exceeded, payment reminders).
4. **External API integration** (Plaid/Yodlee sandbox for bank syncing).
5. **Gamification system** (streaks, badges, challenges).
6. **AI-powered insights** (ML model predicts upcoming overspending).
7. **Multi-currency support** with exchange rates.
8. **Recurring payment auto-categorization.**
9. **Offline-first PWA mode** (sync when online).
10. **Financial health score** dashboard (gamified KPI).

---

## Data model (starter sketch)

**User**  
`id, name, email, password_hash, currency, created_at`

**Transaction**  
`id, user_id, amount, date, description, category_id, recurring_id, status`

**Category**  
`id, name, type (Income/Expense), icon, color, created_at`

**Budget**  
`id, user_id, period (month/year), target_amount, spent_amount, categories[], created_at`

**RecurringPayment**  
`id, user_id, amount, frequency, next_due_date, description, category_id`

**Challenge**  
`id, title, description, goal_type (saving/spending), target_value, progress, reward_badge, start_date, end_date`

---

## API surface (illustrative)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/password-reset`
- `GET /transactions`
- `POST /transactions`
- `PUT /transactions/{id}`
- `DELETE /transactions/{id}`
- `GET /categories`
- `POST /budgets`
- `GET /budgets`
- `POST /recurring-payments`
- `GET /dashboard` (graphs, summaries)
- `POST /challenges/join`
- `GET /challenges`
- `GET /reports/export`
