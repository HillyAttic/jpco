# Deployment Performance Checklist

## Pre-Deployment Validation

### 1. Build Verification
```bash
# Clean build
rm -rf .next node_modules
npm install
npm run build
```

**Expected Output**:
- ✅ Build completes without errors
- ✅ No TypeScript errors
- ✅ Bundle sizes are reasonable (<5MB total)
- ✅ No critical warnings

### 2. Performance Audit
```bash
# Run local performance audit
npm run perf:audit
```

**Expected Results**:
- ✅ All optimization files present
- ✅ No chunks >500KB
- ✅ Firebase chunk properly split
- ✅ Chart libraries lazy loaded

### 3. Lighthouse Test
```bash
# Start production server
npm start

# In another terminal, run Lighthouse
npm run perf:lighthouse
```

**Target Scores**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

**Key Metrics**:
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Total Blocking Time: <300ms
- Cumulative Layout Shift: <0.1
- Speed Index: <3.0s

### 4. Bundle Analysis
```bash
npm run analyze
```

**Review**:
- Check for duplicate dependencies
- Identify unexpectedly large chunks
- Verify code splitting is working
- Look for optimization opportunities

## Environment Configuration

### Vercel Environment Variables
Ensure these are set in Vercel dashboard:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# Other
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Vercel Build Settings
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

## Deployment Steps

### 1. Pre-Deployment
- [ ] All tests passing
- [ ] Performance audit passed
- [ ] Lighthouse score 90+
- [ ] No console errors
- [ ] Environment variables configured
- [ ] Database rules updated
- [ ] API routes tested

### 2. Deploy to Staging
```bash
# Deploy to preview branch
git checkout staging
git merge main
git push origin staging
```

- [ ] Verify staging deployment
- [ ] Run Lighthouse on staging URL
- [ ] Test critical user flows
- [ ] Check error monitoring
- [ ] Verify analytics tracking

### 3. Production Deployment
```bash
# Deploy to production
git checkout main
git push origin main
```

- [ ] Monitor deployment logs
- [ ] Verify production URL loads
- [ ] Run Lighthouse on production
- [ ] Test authentication flow
- [ ] Verify Firebase connection
- [ ] Check service worker registration

## Post-Deployment Monitoring

### Immediate Checks (First 5 minutes)
- [ ] Homepage loads successfully
- [ ] Dashboard accessible
- [ ] Authentication works
- [ ] No 500 errors in logs
- [ ] Service worker registers
- [ ] Firebase connects properly

### Performance Monitoring (First Hour)
- [ ] Check Vercel Analytics
- [ ] Monitor Core Web Vitals
- [ ] Review error rates
- [ ] Check API response times
- [ ] Verify caching is working

### Tools to Monitor
1. **Vercel Analytics**: Real-time performance metrics
2. **Firebase Console**: Database operations and auth
3. **Browser DevTools**: Network and performance
4. **Lighthouse CI**: Automated performance testing

## Performance Regression Prevention

### Set Up Lighthouse CI
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://your-preview-url.vercel.app
          uploadArtifacts: true
```

### Performance Budgets
Set in `lighthouserc.json`:
```json
{
  "ci": {
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "speed-index": ["error", { "maxNumericValue": 3000 }]
      }
    }
  }
}
```

## Rollback Plan

### If Performance Degrades
1. Check Vercel deployment logs
2. Review recent commits
3. Rollback to previous deployment:
   ```bash
   # In Vercel dashboard
   Deployments > [Previous Version] > Promote to Production
   ```

### If Critical Issues
1. Immediately rollback deployment
2. Investigate root cause
3. Fix in development
4. Re-test thoroughly
5. Re-deploy

## Optimization Maintenance

### Weekly Tasks
- [ ] Review Vercel Analytics
- [ ] Check Core Web Vitals trends
- [ ] Monitor bundle sizes
- [ ] Review error logs
- [ ] Update dependencies (security)

### Monthly Tasks
- [ ] Run full performance audit
- [ ] Review and update caching strategies
- [ ] Optimize images and assets
- [ ] Update performance documentation
- [ ] Review and optimize database queries

### Quarterly Tasks
- [ ] Major dependency updates
- [ ] Comprehensive performance review
- [ ] User experience testing
- [ ] Accessibility audit
- [ ] Security audit

## Success Criteria

### Performance Metrics
- ✅ Lighthouse Performance: 90+
- ✅ First Contentful Paint: <1.5s
- ✅ Largest Contentful Paint: <2.5s
- ✅ Total Blocking Time: <300ms
- ✅ Cumulative Layout Shift: <0.1

### User Experience
- ✅ Page loads feel instant
- ✅ No visible layout shifts
- ✅ Smooth scrolling and interactions
- ✅ Fast navigation between pages
- ✅ Responsive on all devices

### Technical Health
- ✅ No console errors
- ✅ All API calls succeed
- ✅ Firebase connection stable
- ✅ Service worker functioning
- ✅ Caching working properly

## Emergency Contacts

- **Vercel Support**: support@vercel.com
- **Firebase Support**: firebase-support@google.com
- **Team Lead**: [Your contact]
- **DevOps**: [Your contact]

## Additional Resources

- [Vercel Performance Documentation](https://vercel.com/docs/concepts/analytics)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
