# Security Policy

## Overview

This Budget App implements security-first defaults across all layers: authentication, authorization, data validation, and infrastructure.

## Authentication & Authorization

### Password Security
- **Hashing**: Bcryptjs with 12 salt rounds (OWASP recommended)
- **Minimum Length**: 8 characters enforced at signup
- **No Plain Text**: Passwords never stored or logged

### Session Management
- **Access Tokens**: JWT with 15-minute expiry
- **Refresh Tokens**: UUID-based with 7-day expiry, hashed with bcryptjs
- **Token Rotation**: Refresh tokens are rotated on each use; old tokens are revoked
- **Secure Cookies**: HTTP-only, Secure (HTTPS only in production), SameSite=Strict
- **Session Revocation**: All sessions revoked on logout; individual sessions can be revoked

### Account Lockout
- **Failed Attempts**: 5 failed login attempts trigger 15-minute lockout
- **Per-IP Tracking**: Lockout is IP-based to prevent distributed attacks
- **Rate Limiting**: 10 login attempts per 15 minutes per IP

## Data Validation & Sanitization

### Input Validation
- **Zod Schemas**: All inputs validated with Zod before processing
- **Type Safety**: TypeScript strict mode enforced
- **Whitelist Approach**: Only expected fields accepted

### SQL Injection Prevention
- **Parameterized Queries**: Prisma ORM prevents SQL injection
- **No Raw SQL**: Raw SQL queries are prohibited
- **MongoDB**: Uses Prisma's parameterized query builder

## API Security

### CORS & Headers
- **CORS Allowlist**: Configure allowed origins in production
- **Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### Rate Limiting
- **Signup**: 5 attempts per hour per IP
- **Login**: 10 attempts per 15 minutes per IP
- **Expenses**: 100 requests per minute per user
- **Storage**: In-memory (use Redis in production)

### CSRF Protection
- **Token Validation**: X-CSRF-Token header required for state-changing operations
- **SameSite Cookies**: Strict mode prevents cross-site cookie sending

## Audit Logging

All security-relevant events are logged:
- **Authentication**: Signup, login, logout, token refresh, failed attempts
- **Data Operations**: Expense create/update/delete, budget changes
- **Exports**: Data exports with timestamp and user ID
- **Fields Logged**: User ID, action, resource type, IP address, user agent, timestamp

## Database Security

### MongoDB Atlas Configuration
- **Network Access**: Restrict to application IP only
- **Authentication**: Strong password (20+ characters, mixed case, numbers, symbols)
- **Encryption**: Enable encryption at rest and in transit (TLS 1.2+)
- **Backups**: Enable automated backups with point-in-time recovery
- **Least Privilege**: Create database user with minimal required permissions

### Prisma Configuration
- **Connection Pooling**: Use connection pooling for production
- **SSL/TLS**: Enforce TLS in connection string
- **Credentials**: Store in environment variables, never in code

## Secrets Management

### Environment Variables
- **Never Commit**: `.env.local` and `.env` are in `.gitignore`
- **Template**: Use `.env.example` for documentation
- **Rotation**: Rotate JWT_SECRET and database credentials regularly

### Production Deployment
- **Secret Store**: Use Vercel Secrets, AWS Secrets Manager, or HashiCorp Vault
- **Rotation Policy**: Rotate secrets every 90 days
- **Audit Trail**: Log all secret access

## Dependency Security

### Vulnerability Scanning
- **npm audit**: Run before deployment
- **Snyk**: Integrate for continuous monitoring
- **Dependabot**: Enable GitHub Dependabot for automated PRs

### Update Policy
- **Critical**: Apply within 24 hours
- **High**: Apply within 1 week
- **Medium/Low**: Apply within 1 month

## TLS/HTTPS

- **Production**: Enforce HTTPS only (HSTS header set)
- **Certificates**: Use Let's Encrypt or cloud provider certificates
- **Minimum Version**: TLS 1.2 or higher
- **Cipher Suites**: Use modern, secure cipher suites

## Testing

### Security Tests
- **Rate Limiting**: Verify limits are enforced
- **CSRF Protection**: Verify token validation
- **Authentication**: Test login/logout flows
- **Authorization**: Verify users can only access their own data
- **Input Validation**: Test with malicious inputs

### Running Tests
```bash
npm test
npm run test:coverage
```

## Deployment Checklist

### Before Deployment
- [ ] Set strong JWT_SECRET (use `openssl rand -base64 32`)
- [ ] Configure MongoDB Atlas with network restrictions
- [ ] Enable HTTPS/TLS
- [ ] Set NODE_ENV=production
- [ ] Configure CORS allowlist
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Review all environment variables
- [ ] Run security tests
- [ ] Run npm audit
- [ ] Enable rate limiting (use Redis in production)

### After Deployment
- [ ] Verify HTTPS is enforced
- [ ] Test authentication flows
- [ ] Monitor audit logs
- [ ] Set up log aggregation
- [ ] Configure alerts for suspicious activity
- [ ] Test backup and recovery procedures

## Incident Response

### Security Incident Procedure
1. **Identify**: Detect and confirm the incident
2. **Contain**: Isolate affected systems
3. **Investigate**: Determine scope and impact
4. **Remediate**: Fix the vulnerability
5. **Notify**: Inform affected users if necessary
6. **Review**: Post-incident analysis and improvements

### Reporting Security Issues
- **Do Not**: Create public GitHub issues for security vulnerabilities
- **Instead**: Email security@example.com with details
- **Response Time**: We aim to respond within 24 hours

## Compliance

### Data Protection
- **GDPR**: Implement data export and deletion features
- **CCPA**: Provide privacy policy and opt-out mechanisms
- **Data Retention**: Define and enforce retention policies

### Audit Trail
- Maintain audit logs for at least 90 days
- Ensure logs are tamper-proof
- Regularly review logs for suspicious activity

## Security Best Practices

### For Developers
1. **Never commit secrets**: Use environment variables
2. **Validate all inputs**: Use Zod schemas
3. **Use parameterized queries**: Never concatenate SQL
4. **Log security events**: Use audit logging
5. **Keep dependencies updated**: Run npm audit regularly
6. **Use HTTPS**: Always in production
7. **Test security**: Include security tests in CI/CD

### For Operators
1. **Monitor logs**: Set up alerts for suspicious activity
2. **Rotate secrets**: Every 90 days
3. **Update dependencies**: Apply security patches promptly
4. **Backup data**: Regular automated backups
5. **Test recovery**: Verify backup restoration works
6. **Review access**: Audit who has access to systems
7. **Enable MFA**: For all administrative accounts

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Zod Documentation](https://zod.dev/)
- [Prisma Security](https://www.prisma.io/docs/concepts/database-connectors/mongodb)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

## Version History

- **v1.0.0** (2024): Initial security policy

