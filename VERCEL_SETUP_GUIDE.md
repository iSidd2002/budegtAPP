# 🚀 Vercel Deployment Setup Guide

## ⚠️ IMPORTANT: Environment Variables

Your app requires environment variables to work. These should **NEVER** be committed to git.

### Step 1: Get Your Credentials

You need to gather these values:

1. **DATABASE_URL** - Your MongoDB connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority&appName=ClusterName`
   - Get from: MongoDB Atlas dashboard

2. **JWT_SECRET** - A secure random string for JWT signing
   - Generate a new one: `openssl rand -base64 32`
   - Or use: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

3. **NEXT_PUBLIC_API_URL** - Your production domain
   - For Vercel: `https://your-project-name.vercel.app`
   - Or your custom domain

### Step 2: Set Environment Variables on Vercel

1. Go to https://vercel.com/dashboard
2. Select your project: `budegtapp`
3. Click **Settings** → **Environment Variables**
4. Add each variable:

```
DATABASE_URL = mongodb+srv://...
JWT_SECRET = your_secure_key_here
NEXT_PUBLIC_API_URL = https://your-domain.com
```

5. Make sure to select **Production** environment for each variable
6. Click **Save**

### Step 3: Trigger a New Deployment

1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**
4. Wait for build to complete (~2-3 minutes)

### Step 4: Verify Deployment

1. Visit your production URL
2. Test signup/login
3. Test adding expenses
4. Check browser console for errors
5. Check Vercel logs for any issues

---

## 🔒 Security Best Practices

✅ **DO:**
- Store credentials in Vercel dashboard only
- Use `.env.example` as reference for local development
- Regenerate JWT_SECRET periodically
- Use strong MongoDB passwords
- Enable MongoDB IP whitelist

❌ **DON'T:**
- Commit `.env.local` to git
- Share credentials in messages/emails
- Use weak passwords
- Expose API keys in code
- Use same credentials for dev and prod

---

## 📝 Local Development Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update with your local credentials:
   ```
   DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority&appName=ClusterName
   JWT_SECRET=your_local_jwt_secret
   NODE_ENV=development
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Visit http://localhost:3000

---

## 🐛 Troubleshooting

### Build Error: "PrismaClientInitializationError"
- **Cause:** Prisma Client not generated
- **Fix:** Already fixed in package.json (prisma generate runs before build)
- **Action:** Redeploy on Vercel

### Error: "Invalid DATABASE_URL"
- **Cause:** Environment variable not set on Vercel
- **Fix:** Add DATABASE_URL to Vercel Environment Variables
- **Action:** Redeploy after adding variable

### Error: "JWT_SECRET not found"
- **Cause:** JWT_SECRET not set on Vercel
- **Fix:** Add JWT_SECRET to Vercel Environment Variables
- **Action:** Redeploy after adding variable

### Error: "Cannot connect to database"
- **Cause:** MongoDB connection string invalid or IP not whitelisted
- **Fix:** 
  1. Verify connection string in MongoDB Atlas
  2. Add Vercel IP to MongoDB IP whitelist (0.0.0.0/0 for all)
  3. Test connection locally first
- **Action:** Update DATABASE_URL and redeploy

### Signup/Login not working
- **Cause:** Database not accessible or schema not initialized
- **Fix:**
  1. Verify DATABASE_URL is correct
  2. Check MongoDB connection
  3. Ensure Prisma migrations are run
- **Action:** Check Vercel logs and redeploy

---

## 📊 Vercel Dashboard Checklist

- [ ] Project created and connected to GitHub
- [ ] Environment variables set (DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_API_URL)
- [ ] Build script configured (prisma generate && next build)
- [ ] Deployment successful (no build errors)
- [ ] Production URL accessible
- [ ] Features tested (signup, login, expenses)
- [ ] Error logs checked
- [ ] Performance monitored

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Vercel Environment Variables:** https://vercel.com/docs/projects/environment-variables

---

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test locally first with `npm run dev`
5. Check MongoDB connection
6. Review error messages carefully

---

**Last Updated:** October 23, 2025
**Status:** Ready for deployment
**Repository:** https://github.com/iSidd2002/budegtAPP

