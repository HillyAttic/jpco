# PWA Deployment Guide

## 🚀 Quick Deploy to Vercel

### Prerequisites
- Vercel account
- GitHub repository connected
- Environment variables configured

### Deploy Command
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy to production
vercel --prod
```

## 📋 Pre-Deployment Checklist

### 1. Build Verification
```bash
# Clean build
rm -rf .next
npm run build

# Test production build locally
npm run start

# Open http://localhost:3000
# Verify everything works
```

### 2. Environment Variables
Ensure these are set in Vercel:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_VAPID_KEY`

### 3. Optimize Assets
```bash
# Optimize images
npm run optimize:images

# Verify optimizations
npm run build
```

### 4. Test PWA Locally
- [ ] Run production build
- [ ] Test installation
- [ ] Verify offline mode
- [ ] Check service worker
- [ ] Test notifications

## 🔧 Vercel Configuration

### vercel.json (Optional)
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/firebase-messaging-sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        },
        {
          "key": "Content-Type",
          "value": "application/javascript"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    }
  ]
}
```

## 📱 Post-Deployment Testing

### 1. Verify HTTPS
```bash
# Check SSL certificate
curl -I https://your-domain.vercel.app

# Should return 200 OK with HTTPS
```

### 2. Test PWA Installation

#### Desktop
1. Open https://your-domain.vercel.app in Chrome
2. Look for install icon in address bar
3. Click and install
4. Verify standalone mode

#### Mobile
1. Open in Chrome on Android
2. Tap "Add to Home screen"
3. Verify installation
4. Test offline mode

### 3. Lighthouse Audit
```bash
# Run Lighthouse
npx lighthouse https://your-domain.vercel.app --view

# Target scores:
# Performance: 90+
# PWA: 100
# Accessibility: 90+
```

### 4. Service Worker Check
```javascript
// Open DevTools Console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

### 5. Manifest Validation
```bash
# Check manifest
curl https://your-domain.vercel.app/manifest.json

# Verify all fields present
```

## 🔍 Monitoring & Analytics

### Vercel Analytics
1. Go to Vercel Dashboard
2. Select your project
3. Click "Analytics" tab
4. Enable Web Analytics
5. Monitor Core Web Vitals

### Firebase Analytics
Already configured in the app:
- Page views tracked
- User engagement tracked
- Custom events tracked

### Error Monitoring
Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for user behavior

## 🐛 Troubleshooting

### Issue: Install prompt not showing
**Solution:**
1. Check HTTPS is enabled
2. Verify manifest.json accessible
3. Check service worker registered
4. Clear browser cache and retry

### Issue: Service worker not updating
**Solution:**
```javascript
// Force update
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.update();
  });
});
```

### Issue: Images not optimized
**Solution:**
```bash
# Run optimization script
npm run optimize:images

# Rebuild
npm run build

# Redeploy
vercel --prod
```

### Issue: Slow performance
**Solution:**
1. Run Lighthouse audit
2. Check bundle size: `npm run build`
3. Verify lazy loading working
4. Check Network tab for large assets
5. Enable Vercel Analytics for real metrics

### Issue: Offline mode not working
**Solution:**
1. Check service worker registered
2. Verify cache strategy in SW
3. Test with DevTools offline mode
4. Check Network tab for failed requests

## 📊 Performance Optimization

### CDN Configuration
Vercel automatically provides:
- Global CDN
- Edge caching
- Automatic compression (Brotli/Gzip)
- HTTP/2 support

### Caching Strategy
```javascript
// Already configured in next.config.mjs
headers: [
  {
    source: '/images/:path*',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ],
  },
]
```

### Image Optimization
Vercel automatically:
- Converts to WebP/AVIF
- Resizes for device
- Lazy loads images
- Serves from CDN

## 🔐 Security

### Headers
Already configured:
- HTTPS enforced
- Service Worker scope limited
- Content-Type headers set
- CORS configured

### Environment Variables
- Never commit to Git
- Set in Vercel Dashboard
- Use different values for preview/production

### Firebase Security
- Firestore rules configured
- Authentication required
- API keys restricted

## 🎯 Success Metrics

### Target Metrics
- Lighthouse Performance: 90+
- Lighthouse PWA: 100
- First Contentful Paint: < 1.8s
- Time to Interactive: < 3.8s
- Installation rate: > 10%
- Return visitor rate: > 50%

### Monitoring
```bash
# Check real user metrics
# Vercel Dashboard → Analytics → Core Web Vitals

# Monitor:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)
```

## 🔄 Continuous Deployment

### GitHub Integration
1. Push to main branch
2. Vercel auto-deploys
3. Preview deployments for PRs
4. Production deployment on merge

### Deployment Workflow
```bash
# 1. Make changes
git add .
git commit -m "feat: add new feature"

# 2. Push to feature branch
git push origin feature/new-feature

# 3. Create PR
# Vercel creates preview deployment

# 4. Merge to main
# Vercel deploys to production
```

## 📝 Deployment Checklist

### Before Deploy
- [ ] Run tests: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Optimize images: `npm run optimize:images`
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Test locally: `npm run start`

### Deploy
- [ ] Push to GitHub
- [ ] Verify Vercel build succeeds
- [ ] Check deployment logs
- [ ] Verify environment variables

### After Deploy
- [ ] Test production URL
- [ ] Run Lighthouse audit
- [ ] Test PWA installation
- [ ] Verify offline mode
- [ ] Test push notifications
- [ ] Check analytics working
- [ ] Monitor error logs

## 🎉 Launch Checklist

### Technical
- [ ] HTTPS enabled
- [ ] Service worker registered
- [ ] Manifest valid
- [ ] Icons present (192x192, 512x512)
- [ ] Offline mode working
- [ ] Performance optimized
- [ ] Analytics configured

### User Experience
- [ ] Installation prompt works
- [ ] Splash screen displays
- [ ] Theme color applied
- [ ] Navigation smooth
- [ ] All features functional
- [ ] Mobile responsive
- [ ] Accessible (WCAG AA)

### Marketing
- [ ] App store listing (if applicable)
- [ ] Social media preview images
- [ ] Documentation updated
- [ ] User guide created
- [ ] Support channels ready

## 🚀 Go Live!

```bash
# Final deployment
vercel --prod

# Verify
curl -I https://your-domain.vercel.app

# Celebrate! 🎉
```

## 📞 Support

### Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

### Community
- Vercel Discord
- Next.js GitHub Discussions
- Stack Overflow

## 🔄 Updates

### Updating the PWA
1. Make changes
2. Update version in manifest.json
3. Deploy to Vercel
4. Service worker auto-updates
5. Users get update prompt

### Force Update
```javascript
// In service worker
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  clients.claim();
});
```

## ✨ Summary

Your PWA is now:
- ✅ Deployed to Vercel
- ✅ Served over HTTPS
- ✅ Installable on all platforms
- ✅ Works offline
- ✅ Optimized for performance
- ✅ Monitored with analytics
- ✅ Ready for users!

Congratulations! 🎉
