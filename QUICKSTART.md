# Quick Start Guide

Get the Budget App running in 5 minutes!

## Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account (free tier)
- Git

## Step 1: Clone & Install (1 min)

```bash
# Clone repository
git clone <repository-url>
cd budget-app

# Install dependencies
npm install
```

## Step 2: Set Up MongoDB (2 min)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster
3. Create a database user (username: `budget_app_user`, strong password)
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/budget_app?retryWrites=true&w=majority`

## Step 3: Configure Environment (1 min)

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
# DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/budget_app?retryWrites=true&w=majority
# JWT_SECRET=<generate with: openssl rand -base64 32>
```

## Step 4: Initialize Database (1 min)

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed with test data
npm run prisma:seed
```

## Step 5: Start Development Server (1 min)

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser!

## Test Credentials

After seeding, use these credentials to login:
- **Email**: test@example.com
- **Password**: password123

## What's Included

✅ Complete authentication system (signup/login/logout)
✅ Expense tracking with categories
✅ Monthly budget management
✅ Category breakdown and analytics
✅ CSV/JSON export
✅ Mobile-first responsive design
✅ Security-first defaults (rate limiting, CSRF, audit logging)
✅ Comprehensive tests
✅ Full documentation

## Next Steps

### Development
```bash
npm run dev              # Start dev server
npm test                 # Run tests
npm run test:watch       # Watch mode
npm audit                # Check vulnerabilities
```

### Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel + MongoDB Atlas deployment

### API Testing
See [CURL_EXAMPLES.md](./CURL_EXAMPLES.md) for 5 complete API examples

### Security
See [SECURITY.md](./SECURITY.md) for security documentation

## Troubleshooting

### Database Connection Error
```bash
# Verify connection string
echo $DATABASE_URL

# Test connection
npm run prisma:migrate
```

### Port Already in Use
```bash
# Use different port
npm run dev -- -p 3001
```

### Clear Cache
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

## Project Structure

```
budget-app/
├── app/                 # Next.js app (pages, components, API routes)
├── lib/                 # Utilities (auth, validation, middleware)
├── prisma/              # Database schema and seed
├── __tests__/           # Tests
├── README.md            # Full documentation
├── SECURITY.md          # Security policies
├── DEPLOYMENT.md        # Deployment guide
└── CURL_EXAMPLES.md     # API examples
```

## Key Features

### Authentication
- Secure signup/login with bcryptjs
- JWT tokens with refresh rotation
- Session management with HTTP-only cookies
- Account lockout after 5 failed attempts
- Rate limiting on auth endpoints

### Expenses
- Add, edit, delete expenses
- Categorize expenses
- Support for recurring expenses
- Filter by date and category
- Audit logging for all changes

### Budget
- Set monthly budgets
- Track spending vs budget
- Category breakdown
- Visual progress indicators
- Remaining budget calculation

### Security
- Input validation with Zod
- Parameterized Prisma queries
- CSRF protection
- Security headers (CSP, X-Frame-Options, etc.)
- Audit logging
- Rate limiting

### Analytics
- Category breakdown
- Time-series tracking
- CSV export
- JSON export
- Monthly summaries

## API Endpoints

```
POST   /api/auth/signup           # Register
POST   /api/auth/login            # Login
POST   /api/auth/logout           # Logout
POST   /api/auth/refresh          # Refresh token

POST   /api/expenses              # Create expense
GET    /api/expenses              # List expenses
PUT    /api/expenses/[id]         # Update expense
DELETE /api/expenses/[id]         # Delete expense

POST   /api/budget                # Set budget
GET    /api/budget                # Get budget summary

GET    /api/analytics/export      # Export data
```

## Example Usage

### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }'
```

### Create Expense
```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 45.50,
    "category": "Food",
    "date": "2024-01-15T10:30:00Z",
    "note": "Grocery shopping"
  }'
```

See [CURL_EXAMPLES.md](./CURL_EXAMPLES.md) for more examples.

## Performance

- Mobile-first responsive design
- Optimized database queries with indexes
- Rate limiting to prevent abuse
- Automatic code splitting with Next.js
- Gzip compression enabled

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Support

- 📖 [README.md](./README.md) - Full documentation
- 🔒 [SECURITY.md](./SECURITY.md) - Security policies
- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- 📝 [CURL_EXAMPLES.md](./CURL_EXAMPLES.md) - API examples
- 📋 [FILE_TREE.md](./FILE_TREE.md) - Project structure

## License

MIT License - see LICENSE file for details

---

**Happy budgeting! 💰**

