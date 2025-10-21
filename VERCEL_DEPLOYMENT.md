# 🚀 Vercel Deployment Guide

Complete step-by-step guide to deploy your Budget App to Vercel with MongoDB Atlas.

## Prerequisites

- GitHub account with your repository
- Vercel account (free tier available)
- MongoDB Atlas account with a cluster
- Git installed locally

## Step 1: Prepare Your Repository

### 1.1 Ensure all files are committed

```bash
git add .
git commit -m "Add INR currency, dark mode, and custom categories"
git push origin main
```

### 1.2 Verify .env.local is in .gitignore

```bash
cat .gitignore | grep ".env.local"
```

Should output: `.env.local`

## Step 2: Set Up MongoDB Atlas

### 2.1 Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new project

### 2.2 Create a Cluster

1. Click "Create a Deployment"
2. Choose "M0 Free" tier
3. Select your region (closest to your users)
4. Click "Create Deployment"

### 2.3 Create Database User

1. Go to "Database Access"
2. Click "Add New Database User"
3. Create username and password
4. Set permissions to "Atlas Admin"
5. Click "Add User"

### 2.4 Get Connection String

1. Go to "Databases"
2. Click "Connect" on your cluster
3. Choose "Drivers"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<database>` with `budget_app`

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/budget_app?retryWrites=true&w=majority
```

### 2.5 Whitelist IP Addresses

1. Go to "Network Access"
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (0.0.0.0/0)
4. Click "Confirm"

⚠️ **Note**: For production, restrict to Vercel's IP ranges. See [Vercel IP Whitelist](https://vercel.com/docs/concepts/edge-network/regions-and-edge-middleware#vercel-edge-network-regions)

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Select your GitHub repository
5. Click "Import"

### 3.2 Configure Environment Variables

1. In Vercel project settings, go to "Environment Variables"
2. Add the following variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Your MongoDB connection string | From Step 2.4 |
| `JWT_SECRET` | Generate with: `openssl rand -base64 32` | Keep secret! |
| `NODE_ENV` | `production` | For production deployment |
| `NEXT_PUBLIC_API_URL` | Your Vercel domain | e.g., `https://budget-app.vercel.app` |

### 3.3 Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Once complete, you'll get a deployment URL

## Step 4: Verify Deployment

### 4.1 Test the Application

1. Visit your Vercel URL
2. Create a new account or login with test credentials
3. Test all features:
   - Add expenses
   - Set budget
   - View dashboard
   - Toggle dark mode
   - Export data

### 4.2 Check Logs

1. In Vercel dashboard, go to "Deployments"
2. Click on your deployment
3. Go to "Logs" to check for errors

## Step 5: Custom Domain (Optional)

### 5.1 Add Custom Domain

1. In Vercel project settings, go to "Domains"
2. Click "Add"
3. Enter your domain name
4. Follow DNS configuration instructions
5. Wait for DNS propagation (up to 48 hours)

### 5.2 Update Environment Variables

Update `NEXT_PUBLIC_API_URL` to your custom domain:

```
https://yourdomain.com
```

## Step 6: Post-Deployment Checklist

- [ ] Test login/signup
- [ ] Test expense creation
- [ ] Test budget setting
- [ ] Test dark mode toggle
- [ ] Test custom categories
- [ ] Test CSV/JSON export
- [ ] Test on mobile devices
- [ ] Check browser console for errors
- [ ] Verify HTTPS is enforced
- [ ] Test with different currencies (INR formatting)

## Step 7: Monitoring & Maintenance

### 7.1 Enable Vercel Analytics

1. Go to project settings
2. Enable "Web Analytics"
3. Monitor performance metrics

### 7.2 Set Up Error Tracking

1. Go to project settings
2. Enable "Error Tracking"
3. Get alerts for errors

### 7.3 Regular Updates

```bash
# Update dependencies
npm update

# Check for vulnerabilities
npm audit

# Commit and push
git add package.json package-lock.json
git commit -m "Update dependencies"
git push origin main
```

## Troubleshooting

### Build Fails

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npm install
npm run prisma:generate
git add .
git commit -m "Regenerate Prisma client"
git push origin main
```

### Database Connection Fails

**Error**: `MongoNetworkError`

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check MongoDB Atlas IP whitelist
3. Ensure database user has correct permissions
4. Test connection locally first

### Dark Mode Not Working

**Error**: Dark mode toggle doesn't persist

**Solution**:
1. Clear browser cache
2. Check localStorage is enabled
3. Verify `ThemeProvider` is in layout
4. Check browser console for errors

### Custom Categories Not Saving

**Error**: Custom category reverts to "Other"

**Solution**:
1. Check validation in `lib/validation.ts`
2. Verify category string doesn't contain special characters
3. Check API response in browser DevTools
4. Review server logs in Vercel

## Performance Optimization

### 7.1 Enable Caching

Add to `next.config.js`:

```javascript
module.exports = {
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, must-revalidate',
        },
      ],
    },
  ],
};
```

### 7.2 Optimize Images

Use Next.js Image component for any images:

```tsx
import Image from 'next/image';

<Image src="/logo.png" alt="Logo" width={100} height={100} />
```

### 7.3 Monitor Bundle Size

```bash
npm run build
# Check .next/static for bundle size
```

## Security Checklist

- [ ] `JWT_SECRET` is strong (32+ characters)
- [ ] `DATABASE_URL` is not in git history
- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Input validation is in place
- [ ] SQL injection protection (Prisma parameterized queries)
- [ ] XSS protection (React escaping)
- [ ] CSRF protection enabled

## Rollback

If deployment has issues:

1. Go to Vercel Deployments
2. Find previous working deployment
3. Click "Promote to Production"
4. Verify application works

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **GitHub Issues**: Create an issue in your repository

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Set up custom domain
3. ✅ Enable monitoring
4. ✅ Set up backups
5. ✅ Plan scaling strategy

---

**Deployment Status**: Ready for production! 🎉

