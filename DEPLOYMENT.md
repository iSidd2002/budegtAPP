# Deployment Checklist

## Pre-Deployment

### Security
- [ ] Generate strong JWT_SECRET: `openssl rand -base64 32`
- [ ] Review all environment variables in `.env.example`
- [ ] Run `npm audit` and fix all vulnerabilities
- [ ] Run security tests: `npm test -- __tests__/security`
- [ ] Review SECURITY.md for all requirements
- [ ] Enable HTTPS/TLS (automatic on Vercel)
- [ ] Configure CORS allowlist for your domain

### Code Quality
- [ ] Run full test suite: `npm test`
- [ ] Check TypeScript compilation: `npm run build`
- [ ] Review all API endpoints for security
- [ ] Verify all inputs are validated with Zod
- [ ] Ensure no secrets in code or logs

### Database
- [ ] Create MongoDB Atlas cluster
- [ ] Set strong database password (20+ characters)
- [ ] Enable encryption at rest
- [ ] Enable encryption in transit (TLS 1.2+)
- [ ] Configure network access restrictions
- [ ] Create database user with minimal permissions
- [ ] Test connection string locally
- [ ] Run migrations: `npm run prisma:migrate`
- [ ] Verify database indexes are created

### Testing
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test expense creation
- [ ] Test budget setting
- [ ] Test data export
- [ ] Test logout and session revocation
- [ ] Test rate limiting
- [ ] Test with invalid inputs
- [ ] Test on mobile devices

## Vercel Deployment

### 1. Prepare Repository
```bash
# Ensure all changes are committed
git status

# Push to main branch
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository and branch

### 3. Configure Environment Variables
In Vercel project settings, add:

```
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/budget_app?retryWrites=true&w=majority
JWT_SECRET=<generated-secret>
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-domain.com
```

### 4. Deploy
- Vercel automatically deploys on push to main
- Monitor deployment logs for errors
- Verify deployment is successful

## MongoDB Atlas Setup

### 1. Create Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new project
3. Create a cluster (M0 free tier is sufficient for testing)
4. Choose a region close to your users

### 2. Configure Network Access
1. Go to "Network Access"
2. Add IP Allowlist entries:
   - For Vercel: Add Vercel's IP ranges (or use 0.0.0.0/0 for development)
   - For local development: Add your IP

### 3. Create Database User
1. Go to "Database Access"
2. Create a new user with:
   - Username: `budget_app_user`
   - Password: Strong password (20+ characters, mixed case, numbers, symbols)
   - Role: `readWriteAnyDatabase`

### 4. Get Connection String
1. Go to "Clusters"
2. Click "Connect"
3. Choose "Connect your application"
4. Copy connection string
5. Replace `<username>` and `<password>`
6. Add to Vercel environment variables

### 5. Enable Backups
1. Go to "Backup"
2. Enable "Continuous Cloud Backups"
3. Set retention to 30 days

## Post-Deployment

### Verification
- [ ] Access application at your domain
- [ ] Test signup with new account
- [ ] Test login
- [ ] Create test expense
- [ ] Verify HTTPS is enforced
- [ ] Check security headers: `curl -I https://your-domain.com`
- [ ] Test on mobile devices
- [ ] Verify audit logs are being created

### Monitoring
- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Set up performance monitoring
- [ ] Set up log aggregation (Vercel Logs, DataDog)
- [ ] Configure alerts for errors and rate limit violations
- [ ] Monitor database performance

### Security
- [ ] Verify HTTPS certificate is valid
- [ ] Check that cookies are HTTP-only and Secure
- [ ] Verify CORS headers are correct
- [ ] Test rate limiting is working
- [ ] Review audit logs for suspicious activity
- [ ] Verify no secrets are exposed in logs

### Backup & Recovery
- [ ] Test database backup restoration
- [ ] Document recovery procedures
- [ ] Set up automated backups
- [ ] Test backup retention policy

## Ongoing Maintenance

### Weekly
- [ ] Review error logs
- [ ] Check for security alerts
- [ ] Monitor database performance

### Monthly
- [ ] Run `npm audit` and update dependencies
- [ ] Review audit logs for suspicious activity
- [ ] Test backup restoration
- [ ] Review and update security policies

### Quarterly
- [ ] Rotate JWT_SECRET
- [ ] Rotate database password
- [ ] Review and update SECURITY.md
- [ ] Conduct security audit
- [ ] Review and optimize database indexes

### Annually
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Update dependencies to latest major versions
- [ ] Review and update all documentation

## Rollback Procedure

If deployment has critical issues:

1. **Immediate**: Revert to previous Vercel deployment
   - Go to Vercel project
   - Click "Deployments"
   - Select previous successful deployment
   - Click "Promote to Production"

2. **Database**: Restore from backup if data corruption
   - Go to MongoDB Atlas
   - Click "Backup"
   - Select restore point
   - Restore to new cluster or existing cluster

3. **Code**: Revert git commit
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

## Troubleshooting

### Deployment Fails
1. Check Vercel build logs
2. Verify environment variables are set
3. Run `npm run build` locally to reproduce
4. Check for TypeScript errors: `npm run build`
5. Check for missing dependencies: `npm install`

### Database Connection Issues
1. Verify connection string in environment variables
2. Check MongoDB Atlas network access settings
3. Verify database user credentials
4. Test connection locally: `npm run prisma:migrate`

### Performance Issues
1. Check database query performance
2. Review Vercel analytics
3. Check for rate limiting issues
4. Optimize database indexes
5. Enable caching where appropriate

### Security Issues
1. Review audit logs
2. Check for suspicious activity
3. Rotate secrets if compromised
4. Review SECURITY.md for remediation steps
5. Notify users if necessary

## Support

For deployment issues:
1. Check Vercel documentation: https://vercel.com/docs
2. Check MongoDB Atlas documentation: https://docs.atlas.mongodb.com
3. Check Next.js documentation: https://nextjs.org/docs
4. Review SECURITY.md for security-related issues
5. Create GitHub issue with detailed information

