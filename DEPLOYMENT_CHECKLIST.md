# 🚀 Vercel Deployment Checklist

Complete checklist to deploy your Budget App to Vercel with MongoDB Atlas.

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] Build completes successfully: `npm run build`
- [ ] No console errors in dev mode: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Code follows project conventions

### Features Testing
- [ ] Login/Signup works
- [ ] Add expense with predefined category
- [ ] Add expense with custom category
- [ ] INR formatting displays correctly
- [ ] Dark mode toggle works
- [ ] Dark mode persists on refresh
- [ ] Budget setting works
- [ ] Expense editing works
- [ ] Expense deletion works
- [ ] CSV export works
- [ ] JSON export works
- [ ] Recurring expenses work
- [ ] Category breakdown displays
- [ ] Recent expenses list displays

### Mobile Testing
- [ ] Responsive on iPhone (375px)
- [ ] Responsive on iPad (768px)
- [ ] Responsive on Desktop (1024px+)
- [ ] Touch interactions work
- [ ] Dark mode works on mobile
- [ ] Forms are usable on mobile

### Security Testing
- [ ] CSRF protection enabled
- [ ] Rate limiting works
- [ ] Account lockout works (5 failed attempts)
- [ ] Passwords are hashed
- [ ] Tokens expire correctly
- [ ] Refresh token rotation works
- [ ] Audit logs are created

### Database
- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] Connection string obtained
- [ ] IP whitelist configured (0.0.0.0/0 for now)
- [ ] Database seeded with test data
- [ ] Test user exists: test@example.com / password123

### Environment Variables
- [ ] DATABASE_URL set locally
- [ ] JWT_SECRET generated (32+ characters)
- [ ] NODE_ENV set to development locally
- [ ] .env.local is in .gitignore
- [ ] .env.example has all variables documented

### Git Repository
- [ ] Code committed to main branch
- [ ] No sensitive data in git history
- [ ] .gitignore includes .env.local
- [ ] Repository is public (for Vercel)
- [ ] GitHub account connected to Vercel

---

## 🔧 Vercel Deployment Steps

### Step 1: Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Add INR, dark mode, custom categories - production ready"
git push origin main
```

### Step 2: Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Authorize Vercel to access repositories

### Step 3: Import Project
- [ ] Go to https://vercel.com/dashboard
- [ ] Click "Add New..." → "Project"
- [ ] Click "Import Git Repository"
- [ ] Select your budget-app repository
- [ ] Click "Import"

### Step 4: Configure Environment Variables
In Vercel project settings, add:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/budget_app?retryWrites=true&w=majority` |
| `JWT_SECRET` | Generated secret (32+ chars) | `openssl rand -base64 32` |
| `NODE_ENV` | production | `production` |
| `NEXT_PUBLIC_API_URL` | Your Vercel domain | `https://budget-app.vercel.app` |

**To generate JWT_SECRET:**
```bash
openssl rand -base64 32
# Copy the output and paste into Vercel
```

### Step 5: Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Verify deployment succeeded
- [ ] Visit your Vercel URL

### Step 6: Post-Deployment Testing
- [ ] Visit your Vercel URL
- [ ] Login with test credentials
- [ ] Add an expense
- [ ] Verify INR formatting
- [ ] Toggle dark mode
- [ ] Test all features
- [ ] Check browser console for errors

---

## 🔐 MongoDB Atlas Setup

### Create Cluster
- [ ] Go to https://www.mongodb.com/cloud/atlas
- [ ] Sign up for free account
- [ ] Create new project
- [ ] Create M0 (free) cluster
- [ ] Select region closest to users
- [ ] Wait for cluster to be ready

### Create Database User
- [ ] Go to "Database Access"
- [ ] Click "Add New Database User"
- [ ] Create username and password
- [ ] Set permissions to "Atlas Admin"
- [ ] Click "Add User"
- [ ] Save credentials securely

### Get Connection String
- [ ] Go to "Databases"
- [ ] Click "Connect" on your cluster
- [ ] Choose "Drivers"
- [ ] Copy connection string
- [ ] Replace `<password>` with your password
- [ ] Replace `<database>` with `budget_app`
- [ ] Save as DATABASE_URL

### Configure Network Access
- [ ] Go to "Network Access"
- [ ] Click "Add IP Address"
- [ ] Select "Allow access from anywhere" (0.0.0.0/0)
- [ ] Click "Confirm"

**Note:** For production, restrict to Vercel's IP ranges. See [Vercel IP Whitelist](https://vercel.com/docs/concepts/edge-network/regions-and-edge-middleware#vercel-edge-network-regions)

---

## 📊 Vercel Configuration

### Build Settings
- **Framework:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

### Environment
- **Node.js Version:** 18.x
- **Region:** Auto (recommended)

### Domains
- [ ] Vercel domain assigned (e.g., budget-app.vercel.app)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate auto-generated

---

## ✅ Post-Deployment Checklist

### Functionality
- [ ] Login page loads
- [ ] Can create account
- [ ] Can login with credentials
- [ ] Dashboard loads
- [ ] Can add expense
- [ ] INR formatting works
- [ ] Dark mode works
- [ ] Can export data
- [ ] Can set budget
- [ ] Can add custom category

### Performance
- [ ] Page loads in <3 seconds
- [ ] API responses in <500ms
- [ ] No console errors
- [ ] No network errors
- [ ] Images load correctly

### Security
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] No sensitive data exposed
- [ ] Cookies are secure
- [ ] CSRF protection works

### Monitoring
- [ ] Enable Vercel Analytics
- [ ] Enable Error Tracking
- [ ] Set up alerts
- [ ] Monitor performance metrics

---

## 🔄 Continuous Deployment

### GitHub Integration
- [ ] Vercel connected to GitHub
- [ ] Auto-deploy on push to main
- [ ] Preview deployments for PRs
- [ ] Automatic rollback on failure

### Deployment Workflow
```bash
# 1. Make changes locally
git checkout -b feature/my-feature

# 2. Test locally
npm run dev
npm test

# 3. Commit and push
git add .
git commit -m "Add feature"
git push origin feature/my-feature

# 4. Create Pull Request
# - Vercel creates preview deployment
# - Test preview deployment
# - Review and merge

# 5. Auto-deploy to production
# - Vercel deploys to production
# - Monitor for errors
```

---

## 🆘 Troubleshooting

### Build Fails
**Error:** `Cannot find module '@prisma/client'`
```bash
# Solution: Regenerate Prisma client
npm run prisma:generate
git add .
git commit -m "Regenerate Prisma client"
git push origin main
```

### Database Connection Fails
**Error:** `MongoNetworkError`
- [ ] Verify DATABASE_URL is correct
- [ ] Check MongoDB Atlas IP whitelist
- [ ] Ensure database user has correct permissions
- [ ] Test connection locally first

### Dark Mode Not Working
**Error:** Dark mode toggle doesn't persist
- [ ] Clear browser cache
- [ ] Check localStorage is enabled
- [ ] Verify ThemeProvider is in layout
- [ ] Check browser console for errors

### Custom Categories Not Saving
**Error:** Custom category reverts to "Other"
- [ ] Check validation regex in lib/validation.ts
- [ ] Verify category doesn't contain special characters
- [ ] Check API response in browser DevTools
- [ ] Review Vercel logs

### INR Formatting Not Showing
**Error:** Amounts show as $100,000 instead of ₹1,00,000
- [ ] Verify currency.ts is imported
- [ ] Check formatINR() is called
- [ ] Verify database has numeric amounts
- [ ] Check browser console for errors

---

## 📈 Monitoring & Maintenance

### Daily
- [ ] Check Vercel dashboard for errors
- [ ] Monitor error tracking
- [ ] Check performance metrics

### Weekly
- [ ] Review analytics
- [ ] Check for security alerts
- [ ] Monitor database usage

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Review logs and errors
- [ ] Plan scaling if needed

---

## 🔐 Security Hardening (Post-Deployment)

### MongoDB Atlas
- [ ] Restrict IP whitelist to Vercel IPs only
- [ ] Enable encryption at rest
- [ ] Enable encryption in transit
- [ ] Set up automated backups
- [ ] Enable audit logging

### Vercel
- [ ] Enable 2FA on account
- [ ] Set up team members with appropriate roles
- [ ] Enable branch protection on main
- [ ] Set up deployment approvals
- [ ] Monitor for suspicious activity

### Application
- [ ] Rotate JWT_SECRET periodically
- [ ] Monitor for failed login attempts
- [ ] Review audit logs regularly
- [ ] Update dependencies regularly
- [ ] Run security audits

---

## 📞 Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **MongoDB Atlas:** https://docs.atlas.mongodb.com
- **Prisma Docs:** https://www.prisma.io/docs
- **GitHub Issues:** Create issue in your repository

---

## ✅ Final Verification

Before considering deployment complete:

- [ ] Application is live on Vercel
- [ ] All features work in production
- [ ] Dark mode works correctly
- [ ] INR formatting displays correctly
- [ ] Custom categories work
- [ ] Database is connected
- [ ] Monitoring is enabled
- [ ] Backups are configured
- [ ] Security is hardened
- [ ] Documentation is updated

---

## 🎉 Deployment Complete!

Your Budget App is now live on Vercel! 🚀

**Production URL:** https://your-app.vercel.app
**GitHub:** https://github.com/your-username/budget-app
**MongoDB Atlas:** https://cloud.mongodb.com

---

**Last Updated:** October 21, 2025
**Status:** Ready for Deployment
**Next Step:** Follow the deployment steps above!

