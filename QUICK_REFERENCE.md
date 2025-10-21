# 📖 Quick Reference Guide

Fast lookup for common tasks and features.

---

## 🚀 Getting Started

### Start Development Server
```bash
npm run dev
# Visit http://localhost:3000
```

### Build for Production
```bash
npm run build
npm start
```

### Run Tests
```bash
npm test
npm run test:watch
```

---

## 💰 Currency (INR)

### Formatting Functions
```typescript
import { formatINR, parseINR, displayAmount, formatCompactINR } from '@/lib/currency';

formatINR(100000)           // "₹1,00,000.00"
formatCompactINR(1000000)   // "₹10L"
parseINR("₹1,00,000")       // 100000
displayAmount(50000)        // "₹50,000.00"
```

### Usage in Components
```tsx
import { formatINR } from '@/lib/currency';

<span>{formatINR(expense.amount)}</span>
// Output: ₹1,250.50
```

---

## 🌙 Dark Mode

### Toggle Dark Mode
- Click sun/moon icon in top-right corner
- Preference saved to localStorage
- Works on all pages

### Theme Functions
```typescript
import { setTheme, isDarkMode, getTheme } from '@/lib/theme';

setTheme('dark')      // Enable dark mode
setTheme('light')     // Enable light mode
setTheme('system')    // Use system preference
isDarkMode()          // Returns boolean
getTheme()            // Returns 'light' | 'dark' | 'system'
```

### Dark Mode Classes
```tsx
<div className="bg-white dark:bg-gray-800">
  <p className="text-gray-900 dark:text-white">Text</p>
</div>
```

---

## 📝 Custom Categories

### Add Custom Category
1. Click "Add Expense" form
2. Select "Other (Custom)" from category dropdown
3. Type custom category name (max 50 characters)
4. Allowed characters: letters, numbers, spaces, hyphens, ampersands, parentheses
5. Submit form

### Validation
```typescript
// Valid categories
"Groceries"
"Home & Garden"
"Car (Maintenance)"
"Medical-Supplies"

// Invalid categories
"Groceries!" // Special character
"Very Long Category Name That Exceeds Fifty Characters" // Too long
```

---

## 🔐 Authentication

### Login
```bash
Email: test@example.com
Password: password123
```

### Create Account
1. Click "Sign up" link
2. Enter email and password
3. Password must be at least 8 characters
4. Click "Sign up"

### Logout
- Click "Logout" button in dashboard header

---

## 💸 Expense Management

### Add Expense
1. Fill in amount (₹)
2. Select category or add custom
3. Select date
4. Add optional note
5. Check "Recurring expense" if needed
6. Click "Add Expense"

### Edit Expense
- Click expense in recent list
- Modify details
- Click "Update"

### Delete Expense
- Click expense in recent list
- Click "Delete"
- Confirm deletion

### Recurring Expenses
- Check "Recurring expense" checkbox
- Select frequency: Daily, Weekly, Monthly, Yearly
- Expense auto-created on schedule

---

## 💰 Budget Management

### Set Budget
1. Go to Dashboard
2. Enter monthly budget amount (₹)
3. Click "Set" button
4. Budget is now active

### Update Budget
1. Go to Dashboard
2. Enter new budget amount
3. Click "Update" button

### View Budget Status
- Budget Summary card shows:
  - Total spent vs budget
  - Progress bar
  - Remaining amount or over budget

---

## 📊 Analytics & Export

### View Category Breakdown
- Dashboard shows "By Category" section
- Categories sorted by spending (highest first)
- Shows amount for each category in ₹

### View Recent Expenses
- Dashboard shows "Recent Expenses" section
- Last 5 expenses displayed
- Shows category, date, and amount

### Export Data
```bash
# CSV Export
Click "Export CSV" button
# Downloads: expenses-YYYY-MM-DD.csv

# JSON Export
Click "Export JSON" button
# Downloads: expenses-YYYY-MM-DD.json
```

---

## 🔧 API Endpoints

### Authentication
```bash
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

### Expenses
```bash
GET /api/expenses
POST /api/expenses
PUT /api/expenses/:id
DELETE /api/expenses/:id
```

### Budget
```bash
GET /api/budget
POST /api/budget
```

### Analytics
```bash
GET /api/analytics/summary
GET /api/analytics/export?format=csv|json
```

---

## 🗄️ Database

### Collections
- **users** - User accounts
- **budgets** - Monthly budgets
- **expenses** - Expense records
- **auditLogs** - Activity logs
- **refreshTokens** - Session tokens

### Connection
```bash
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/budget_app
```

### Seed Database
```bash
npm run prisma:seed
```

---

## 🚀 Deployment

### Deploy to Vercel
```bash
# 1. Push to GitHub
git push origin main

# 2. Connect to Vercel
# - Go to https://vercel.com/dashboard
# - Click "Add New..." → "Project"
# - Select repository

# 3. Add Environment Variables
# DATABASE_URL
# JWT_SECRET
# NODE_ENV=production
# NEXT_PUBLIC_API_URL

# 4. Deploy!
```

### Environment Variables
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Set in Vercel
DATABASE_URL=mongodb+srv://...
JWT_SECRET=<generated-secret>
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-domain.com
```

---

## 🐛 Debugging

### Check Logs
```bash
# Development
npm run dev
# Check terminal output

# Production (Vercel)
# Go to Vercel Dashboard → Deployments → Logs
```

### Browser DevTools
```bash
# Open DevTools: F12 or Cmd+Option+I
# Check Console for errors
# Check Network tab for API calls
# Check Application → LocalStorage for theme
```

### Database Debugging
```bash
# Connect to MongoDB Atlas
# Go to https://cloud.mongodb.com
# View collections and documents
# Check audit logs
```

---

## 📱 Mobile Optimization

### Responsive Breakpoints
```
Mobile: 375px - 640px
Tablet: 641px - 1024px
Desktop: 1025px+
```

### Touch Interactions
- All buttons are touch-friendly (min 44px)
- Forms are easy to fill on mobile
- Dark mode works on all devices

---

## 🔒 Security

### Password Requirements
- Minimum 8 characters
- Hashed with bcryptjs (12 rounds)
- Never stored in plain text

### Token Security
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry
- HTTP-only cookies
- Secure flag in production
- SameSite=Strict

### Rate Limiting
- Signup: 5 requests per hour
- Login: 10 requests per hour
- Expenses: 100 requests per hour

### Account Lockout
- 5 failed login attempts → 15-minute lockout
- Prevents brute force attacks

---

## 📚 File Locations

### Components
```
app/components/
├── LoginForm.tsx
├── AddExpenseForm.tsx
├── BudgetDashboard.tsx
├── ThemeProvider.tsx
└── ThemeToggle.tsx
```

### Utilities
```
lib/
├── currency.ts
├── theme.ts
├── auth.ts
├── validation.ts
└── middleware.ts
```

### API Routes
```
app/api/
├── auth/
├── expenses/
├── budget/
└── analytics/
```

---

## 🆘 Common Issues

### "Port 3000 is in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
npm run dev -- -p 3001
```

### "Cannot find module"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Database connection failed"
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Verify MongoDB Atlas
# - Check IP whitelist
# - Check database user permissions
# - Test connection string
```

### "Dark mode not working"
```bash
# Clear browser cache
# Check localStorage: localStorage.getItem('budget-app-theme')
# Verify ThemeProvider in layout
```

---

## 📞 Quick Links

- **GitHub:** https://github.com/your-username/budget-app
- **Vercel:** https://vercel.com/dashboard
- **MongoDB Atlas:** https://cloud.mongodb.com
- **Documentation:** See README.md
- **Issues:** Create GitHub issue

---

## ✅ Checklist

### Before Deployment
- [ ] All tests pass
- [ ] Build succeeds
- [ ] No console errors
- [ ] Features tested locally
- [ ] Environment variables set

### After Deployment
- [ ] Visit production URL
- [ ] Test login
- [ ] Test add expense
- [ ] Verify INR formatting
- [ ] Test dark mode
- [ ] Check for errors

---

**Last Updated:** October 21, 2025
**Version:** 1.0.0
**Status:** Production Ready

