# Budget App - Mobile-First Budgeting Web Application

A secure, mobile-first budgeting application built with Next.js, TypeScript, Prisma, MongoDB, and Tailwind CSS. Features comprehensive expense tracking, budget management, analytics, and security-first defaults.

## Features

### Core Functionality
- ✅ **User Authentication**: Secure signup/login with bcryptjs hashing
- ✅ **Monthly Budget**: Set and track monthly budgets
- ✅ **Expense Management**: Add, edit, delete expenses with categories
- ✅ **Recurring Expenses**: Support for daily, weekly, monthly, yearly recurring expenses
- ✅ **Category Breakdown**: Visual breakdown of spending by category
- ✅ **Time-Series Analytics**: Track spending over time
- ✅ **CSV/JSON Export**: Export expense data in multiple formats
- ✅ **Responsive Design**: Mobile-first, works on all devices

### Security Features
- 🔒 **Secure Authentication**: JWT tokens with refresh token rotation
- 🔒 **Password Security**: Bcryptjs with 12 salt rounds
- 🔒 **Session Management**: HTTP-only, Secure, SameSite cookies
- 🔒 **Input Validation**: Zod schemas for all inputs
- 🔒 **Rate Limiting**: Per-user and per-IP rate limiting
- 🔒 **Account Lockout**: 5 failed attempts trigger 15-minute lockout
- 🔒 **Audit Logging**: All security events logged
- 🔒 **CSRF Protection**: Token-based CSRF protection
- 🔒 **Security Headers**: Comprehensive security headers (CSP, X-Frame-Options, etc.)
- 🔒 **Parameterized Queries**: Prisma prevents SQL injection

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: JWT, bcryptjs
- **Validation**: Zod
- **Testing**: Jest, Supertest, React Testing Library
- **Security**: Helmet, express-rate-limit, CSRF protection

## Project Structure

```
budget-app/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── refresh/route.ts
│   │   ├── expenses/
│   │   │   ├── route.ts (POST, GET)
│   │   │   └── [id]/route.ts (PUT, DELETE)
│   │   ├── budget/route.ts (POST, GET)
│   │   └── analytics/export/route.ts (GET)
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   ├── AddExpenseForm.tsx
│   │   └── BudgetDashboard.tsx
│   ├── dashboard/page.tsx
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── auth.ts (password hashing, JWT tokens)
│   ├── validation.ts (Zod schemas)
│   └── middleware.ts (auth, rate limiting, CSRF, logging)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── __tests__/
│   ├── api/auth.test.ts
│   └── security/rate-limit.test.ts
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── jest.config.js
├── next.config.js
├── SECURITY.md
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB Atlas account (free tier available)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd budget-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your MongoDB connection string and JWT secret:
```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/budget_app?retryWrites=true&w=majority
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=development
```

4. **Set up Prisma**
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Usage

### Authentication
1. Sign up with email and password (minimum 8 characters)
2. Login with your credentials
3. Tokens are automatically managed via secure cookies

### Budget Management
1. Set your monthly budget on the dashboard
2. View remaining budget and spending progress
3. See category breakdown of expenses

### Expense Tracking
1. Click "Add Expense" to create a new expense
2. Fill in amount, category, date, and optional note
3. Enable "Recurring" for recurring expenses
4. View all expenses in the dashboard

### Data Export
1. Click "Export CSV" or "Export JSON" in the header
2. Download your expense data for external analysis

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token

### Expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses` - List expenses (with filtering)
- `PUT /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

### Budget
- `POST /api/budget` - Set budget
- `GET /api/budget` - Get budget and summary

### Analytics
- `GET /api/analytics/export` - Export data (CSV/JSON)

## Example cURL Requests

### 1. Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }' \
  -c cookies.txt
```

### 3. Create Expense
```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "amount": 45.50,
    "category": "Food",
    "date": "2024-01-15T10:30:00Z",
    "note": "Grocery shopping"
  }'
```

### 4. Get Budget Summary
```bash
curl -X GET "http://localhost:3000/api/budget?month=1&year=2024" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Export Data as CSV
```bash
curl -X GET "http://localhost:3000/api/analytics/export?format=csv" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o expenses.csv
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Security Tests
- Rate limiting tests in `__tests__/security/rate-limit.test.ts`
- Authentication tests in `__tests__/api/auth.test.ts`

## Deployment

### Vercel Deployment

1. **Push to GitHub**
```bash
git push origin main
```

2. **Connect to Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Add environment variables:
  - `DATABASE_URL`: Your MongoDB Atlas connection string
  - `JWT_SECRET`: Generate with `openssl rand -base64 32`
  - `NODE_ENV`: Set to `production`

3. **Deploy**
- Vercel automatically deploys on push to main

### MongoDB Atlas Setup

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free M0 cluster
   - Choose a region close to your users

2. **Network Access**
   - Add your Vercel IP to IP Allowlist
   - Or allow all IPs (0.0.0.0/0) for development only

3. **Database User**
   - Create a database user with strong password
   - Grant minimal required permissions

4. **Connection String**
   - Copy connection string
   - Replace `<username>` and `<password>`
   - Add to Vercel environment variables

### Deployment Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Configure MongoDB Atlas network restrictions
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS allowlist
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run security tests
- [ ] Test all authentication flows
- [ ] Verify HTTPS is enforced
- [ ] Set up log aggregation

## Security

See [SECURITY.md](./SECURITY.md) for comprehensive security documentation including:
- Authentication and authorization
- Data validation and sanitization
- API security
- Audit logging
- Database security
- Secrets management
- Dependency security
- TLS/HTTPS
- Testing
- Incident response

## Performance Optimization

- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component
- **Database Indexing**: Indexes on userId, date, category
- **Caching**: Browser caching for static assets
- **Rate Limiting**: Prevents abuse and DDoS

## Troubleshooting

### Database Connection Issues
```bash
# Verify connection string
echo $DATABASE_URL

# Test connection
npm run prisma:migrate
```

### Authentication Errors
- Clear browser cookies and localStorage
- Verify JWT_SECRET is set
- Check token expiry (15 minutes for access token)

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Run `npm test` and `npm audit`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check [SECURITY.md](./SECURITY.md) for security-related questions
2. Review existing GitHub issues
3. Create a new issue with detailed information

## Roadmap

- [ ] Two-factor authentication (TOTP)
- [ ] Magic link authentication
- [ ] Advanced analytics and charts
- [ ] Budget alerts and notifications
- [ ] Expense categories customization
- [ ] Multi-currency support
- [ ] Mobile app (React Native)
- [ ] Dark mode
- [ ] Expense sharing and collaboration

# budegtAPP
