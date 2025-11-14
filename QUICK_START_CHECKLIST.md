# Quick Start Checklist ✅

## Morning Startup (5 minutes)

### 1. Read Documentation
- [ ] Read `MORNING_README.md` (5 min read)
- [ ] Skim `IMPLEMENTATION_SUMMARY.md` (reference document)

### 2. Start Development Server
```bash
cd /home/motoko/dev/bitinfrashop
npm run dev
```

### 3. Verify Everything Works
- [ ] Server starts without errors
- [ ] Visit http://localhost:3000
- [ ] Check console for logs (should see structured logging)

---

## Test New Features (15 minutes)

### 4. Test Shop Owner Dashboard
- [ ] Go to http://localhost:3000/dashboard/shops
- [ ] Create a test shop (if none exist)
- [ ] View shop details
- [ ] Check connection status display
- [ ] Verify payment history shows

### 5. Test Provider Dashboard
- [ ] Go to http://localhost:3000/dashboard/providers
- [ ] View analytics cards (connections, revenue)
- [ ] Check connected shops table
- [ ] View recent events
- [ ] Click "Settings" button

### 6. Test Feature Flags
- [ ] In `.env`: Set `FEATURE_BTCPAY_INTEGRATION=false`
- [ ] Restart server
- [ ] Try to create BTCPay connection
- [ ] Should see "BTCPay integration is currently disabled"
- [ ] Set back to `true` and restart

### 7. Test Dry-Run Mode
- [ ] Verify `.env` has `BTCPAY_DRY_RUN=true`
- [ ] Create shop with BTCPay provider connection
- [ ] Watch console for `[DRY RUN]` messages
- [ ] Verify no real API calls made
- [ ] Check mock data returned

### 8. Test Rate Limiting
```bash
# In terminal, run:
for i in {1..105}; do
  curl -s http://localhost:3000/api/shops | grep -o "Too many requests" && echo "Rate limited!" && break
done
```
- [ ] Should see rate limit after 100 requests

### 9. Test Input Validation
Try creating shop with:
- [ ] Invalid email: `test@` → Should reject
- [ ] Invalid URL: `not-a-url` → Should reject
- [ ] Too long name: (200+ chars) → Should reject
- [ ] Valid data → Should succeed

### 10. Review Logs
- [ ] Check console for structured logging
- [ ] Look for `[INFO]`, `[WARN]`, `[ERROR]` prefixes
- [ ] Verify timestamps present
- [ ] Check context objects (userId, shopId, etc.)

---

## Environment Setup (If Needed)

### 11. Database
- [ ] Verify PostgreSQL is running
- [ ] Check DATABASE_URL in `.env`
- [ ] Run migrations if needed: `npx prisma migrate dev`

### 12. Environment Variables
Required variables in `.env`:
- [ ] `DATABASE_URL` - PostgreSQL connection
- [ ] `ENCRYPTION_KEY` or `SESSION_SECRET` - For encryption
- [ ] `NEXTAUTH_SECRET` - For authentication
- [ ] All `FEATURE_*` flags - Set as desired
- [ ] `BTCPAY_DRY_RUN` - true for testing

### 13. Node Modules
If issues:
```bash
npm install
npx prisma generate
```

---

## BTCPay Testing (When Ready)

### 14. Real BTCPay Setup
- [ ] Have BTCPay Server instance URL
- [ ] Have API key with appropriate permissions
- [ ] Set `BTCPAY_DRY_RUN=false` in `.env`
- [ ] Restart server

### 15. Configure Provider
- [ ] Go to `/admin/provider-settings/{providerId}`
- [ ] Enter BTCPay Server URL
- [ ] Enter API key (will be encrypted)
- [ ] Save settings

### 16. Test Shop Creation
- [ ] Create new shop
- [ ] Select BTCPay provider
- [ ] Verify real store created
- [ ] Check BTCPay Server dashboard
- [ ] Verify credentials received

### 17. Test Webhooks
- [ ] Configure webhook in BTCPay pointing to your server
- [ ] Modify store in BTCPay
- [ ] Check logs for webhook receipt
- [ ] Verify signature validation

---

## Troubleshooting

### Server Won't Start
```bash
# Check for port conflicts
lsof -i :3000

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reset database
npx prisma migrate reset
```

### Database Errors
```bash
# Regenerate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate dev

# View database
npx prisma studio
```

### Feature Not Working
1. Check feature flag in `.env`
2. Restart server after `.env` changes
3. Clear browser cache
4. Check console for errors

### Rate Limit Stuck
- Restart server (clears in-memory limits)
- Or wait for time window to expire

---

## Next Steps (After Testing)

### Priority 1: NWC Integration
- [ ] Research @getalby/sdk
- [ ] Replace mock payment code
- [ ] Test with real wallets
- [ ] Implement payment confirmations

### Priority 2: Production Deployment
- [ ] Set up production environment
- [ ] Configure HTTPS
- [ ] Set strong encryption keys
- [ ] Configure Redis for rate limiting
- [ ] Set up monitoring/logging service
- [ ] Configure backup strategy

### Priority 3: Additional Features
- [ ] Payment management UI
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Advanced analytics
- [ ] API documentation

---

## Quick Commands Reference

```bash
# Start development
npm run dev

# Database operations
npx prisma studio              # View database
npx prisma migrate dev         # Apply migrations
npx prisma generate            # Regenerate client

# Build for production
npm run build
npm start

# View logs
# (Just watch the console - comprehensive logging enabled)

# Test endpoints
curl http://localhost:3000/api/shops
curl http://localhost:3000/api/dashboard/shops
curl http://localhost:3000/api/dashboard/providers
```

---

## Success Criteria

You know everything is working when:
- ✅ Server starts without errors
- ✅ Dashboards display correctly
- ✅ Logs show structured output with context
- ✅ Rate limiting activates after threshold
- ✅ Input validation rejects bad data
- ✅ Dry-run mode shows mock BTCPay operations
- ✅ Feature flags toggle features on/off
- ✅ Connection status displays properly
- ✅ Payment history shows in dashboards

---

## Files to Review

Priority order:
1. `MORNING_README.md` ← Start here
2. This checklist ← You are here
3. `IMPLEMENTATION_SUMMARY.md` ← Technical details
4. `.env` ← Configuration
5. New dashboard pages ← UI code
6. New lib files ← Business logic

---

## Support

If something isn't working:
1. Check console logs (very detailed now)
2. Review this checklist
3. Check `.env` configuration
4. Read `IMPLEMENTATION_SUMMARY.md` for details
5. Verify database connection

---

**Total setup time**: ~20 minutes
**Testing time**: ~15 minutes
**Reading time**: ~10 minutes

**Total**: ~45 minutes to full understanding and testing

Good luck! 🚀
