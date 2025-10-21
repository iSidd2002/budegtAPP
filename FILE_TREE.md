# Budget App - Complete File Tree

## Project Structure

```
budget-app/
│
├── 📁 app/                                 # Next.js app directory
│   ├── 📁 api/                            # API routes
│   │   ├── 📁 auth/
│   │   │   ├── 📁 signup/
│   │   │   │   └── route.ts               # POST /api/auth/signup - User registration
│   │   │   ├── 📁 login/
│   │   │   │   └── route.ts               # POST /api/auth/login - User authentication
│   │   │   ├── 📁 logout/
│   │   │   │   └── route.ts               # POST /api/auth/logout - Session revocation
│   │   │   └── 📁 refresh/
│   │   │       └── route.ts               # POST /api/auth/refresh - Token rotation
│   │   ├── 📁 expenses/
│   │   │   ├── route.ts                   # POST /api/expenses - Create expense
│   │   │   │                              # GET /api/expenses - List expenses
│   │   │   └── 📁 [id]/
│   │   │       └── route.ts               # PUT /api/expenses/[id] - Update expense
│   │   │                                  # DELETE /api/expenses/[id] - Delete expense
│   │   ├── 📁 budget/
│   │   │   └── route.ts                   # POST /api/budget - Set budget
│   │   │                                  # GET /api/budget - Get budget summary
│   │   └── 📁 analytics/
│   │       └── 📁 export/
│   │           └── route.ts               # GET /api/analytics/export - Export data
│   │
│   ├── 📁 components/                     # React components
│   │   ├── LoginForm.tsx                  # Login/signup form component
│   │   ├── AddExpenseForm.tsx             # Add expense form component
│   │   └── BudgetDashboard.tsx            # Budget dashboard component
│   │
│   ├── 📁 dashboard/
│   │   └── page.tsx                       # Dashboard page (protected)
│   │
│   ├── page.tsx                           # Home page (login)
│   ├── layout.tsx                         # Root layout
│   └── globals.css                        # Global styles
│
├── 📁 lib/                                # Utility functions
│   ├── auth.ts                            # Authentication helpers
│   │                                      # - hashPassword()
│   │                                      # - verifyPassword()
│   │                                      # - generateAccessToken()
│   │                                      # - generateRefreshToken()
│   │                                      # - verifyAccessToken()
│   ├── validation.ts                      # Zod validation schemas
│   │                                      # - SignupSchema
│   │                                      # - LoginSchema
│   │                                      # - CreateExpenseSchema
│   │                                      # - SetBudgetSchema
│   │                                      # - GetExpensesSchema
│   └── middleware.ts                      # Security middleware
│                                          # - withAuth()
│                                          # - withRateLimit()
│                                          # - withCSRFProtection()
│                                          # - setSecureCookie()
│                                          # - logAuditEvent()
│                                          # - getSecureHeaders()
│
├── 📁 prisma/                             # Prisma ORM
│   ├── schema.prisma                      # Database schema
│   │                                      # - User model
│   │                                      # - Session model
│   │                                      # - Budget model
│   │                                      # - Expense model
│   │                                      # - AuditLog model
│   └── seed.ts                            # Database seeding script
│
├── 📁 __tests__/                          # Test files
│   ├── 📁 api/
│   │   └── auth.test.ts                   # Authentication tests
│   │                                      # - Signup tests
│   │                                      # - Login tests
│   │                                      # - Validation tests
│   └── 📁 security/
│       └── rate-limit.test.ts             # Rate limiting tests
│                                          # - Rate limit enforcement
│                                          # - Window expiry
│                                          # - Per-key tracking
│
├── 📄 .env.example                        # Environment variables template
├── 📄 .gitignore                          # Git ignore rules
├── 📄 package.json                        # Dependencies and scripts
├── 📄 tsconfig.json                       # TypeScript configuration
├── 📄 tailwind.config.ts                  # Tailwind CSS configuration
├── 📄 postcss.config.js                   # PostCSS configuration
├── 📄 next.config.js                      # Next.js configuration
├── 📄 jest.config.js                      # Jest configuration
├── 📄 jest.setup.js                       # Jest setup
│
├── 📄 README.md                           # Project documentation
├── 📄 SECURITY.md                         # Security documentation
├── 📄 DEPLOYMENT.md                       # Deployment guide
├── 📄 CURL_EXAMPLES.md                    # API examples
└── 📄 FILE_TREE.md                        # This file

```

## Key Files Description

### Authentication & Security
- **app/api/auth/signup/route.ts**: User registration with password hashing
- **app/api/auth/login/route.ts**: User authentication with rate limiting and account lockout
- **app/api/auth/logout/route.ts**: Session revocation
- **app/api/auth/refresh/route.ts**: Token rotation with refresh token rotation
- **lib/auth.ts**: Password hashing, JWT generation, token verification
- **lib/middleware.ts**: Rate limiting, CSRF protection, audit logging

### API Routes
- **app/api/expenses/route.ts**: Create and list expenses with validation
- **app/api/expenses/[id]/route.ts**: Update and delete expenses
- **app/api/budget/route.ts**: Set and retrieve budget with summary
- **app/api/analytics/export/route.ts**: Export data as CSV or JSON

### Frontend Components
- **app/components/LoginForm.tsx**: Mobile-first login/signup form
- **app/components/AddExpenseForm.tsx**: Expense creation form
- **app/components/BudgetDashboard.tsx**: Budget summary and analytics
- **app/dashboard/page.tsx**: Main dashboard page

### Database
- **prisma/schema.prisma**: Complete database schema with 5 models
- **prisma/seed.ts**: Seed script for test data

### Configuration
- **tsconfig.json**: Strict TypeScript configuration
- **tailwind.config.ts**: Tailwind CSS customization
- **next.config.js**: Next.js security headers
- **jest.config.js**: Jest testing configuration

### Documentation
- **README.md**: Complete project documentation
- **SECURITY.md**: Security policies and best practices
- **DEPLOYMENT.md**: Deployment checklist for Vercel + MongoDB Atlas
- **CURL_EXAMPLES.md**: 5 complete API examples with explanations

## Database Schema

### User
- id (ObjectId)
- email (unique)
- passwordHash
- createdAt, updatedAt
- Relations: budgets, expenses, sessions, auditLogs

### Session
- id (ObjectId)
- userId (foreign key)
- refreshToken (unique)
- refreshTokenHash
- expiresAt
- revokedAt (nullable)
- createdAt, updatedAt

### Budget
- id (ObjectId)
- userId (foreign key)
- amount
- month (1-12)
- year
- createdAt, updatedAt
- Unique constraint: userId + month + year

### Expense
- id (ObjectId)
- userId (foreign key)
- amount
- category
- date
- note (nullable)
- isRecurring
- recurringFrequency (nullable)
- recurringEndDate (nullable)
- createdAt, updatedAt
- Indexes: userId, date, category

### AuditLog
- id (ObjectId)
- userId (foreign key)
- action (LOGIN, LOGOUT, EXPENSE_CREATE, etc.)
- resourceType (expense, budget, auth)
- resourceId (nullable)
- details (JSON string)
- ipAddress
- userAgent
- createdAt
- Indexes: userId, action, createdAt

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token

### Expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses` - List expenses (with filtering)
- `PUT /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

### Budget
- `POST /api/budget` - Set monthly budget
- `GET /api/budget` - Get budget and summary

### Analytics
- `GET /api/analytics/export` - Export data (CSV/JSON)

## Environment Variables

```
DATABASE_URL              # MongoDB connection string
JWT_SECRET               # JWT signing secret
NODE_ENV                 # development or production
NEXT_PUBLIC_API_URL      # API base URL
```

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run lint             # Run ESLint
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:seed      # Seed database with test data
npm audit                # Check for vulnerabilities
```

## Security Features

✅ Bcryptjs password hashing (12 salt rounds)
✅ JWT access tokens (15-minute expiry)
✅ Refresh token rotation (7-day expiry)
✅ HTTP-only, Secure, SameSite cookies
✅ Rate limiting (signup, login, expenses)
✅ Account lockout (5 failed attempts)
✅ Zod input validation
✅ Parameterized Prisma queries
✅ CSRF protection
✅ Security headers (CSP, X-Frame-Options, etc.)
✅ Audit logging
✅ Session revocation
✅ IP-based rate limiting

## Testing

- **Unit Tests**: Auth helpers, validation schemas
- **Integration Tests**: API endpoints with authentication
- **Security Tests**: Rate limiting, CSRF protection
- **Coverage**: Aim for >80% coverage

## Deployment

- **Platform**: Vercel (automatic deployment on push)
- **Database**: MongoDB Atlas (free M0 tier available)
- **Environment**: Production-ready with security headers
- **Monitoring**: Vercel Analytics, error tracking
- **Backups**: MongoDB Atlas automated backups

## Performance

- **Code Splitting**: Automatic with Next.js
- **Database Indexing**: Indexes on userId, date, category
- **Rate Limiting**: Prevents abuse and DDoS
- **Caching**: Browser caching for static assets
- **Compression**: Gzip compression enabled

## Mobile-First Design

- Responsive layout (mobile, tablet, desktop)
- Touch-friendly buttons and inputs
- Optimized for small screens
- Fast load times
- Accessible color contrast

