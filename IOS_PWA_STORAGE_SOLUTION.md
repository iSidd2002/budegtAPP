# iOS PWA Authentication Persistence - Complete Solution

## 🔴 **The Root Problem**

iOS Safari has an **aggressive 7-day storage deletion policy** for Progressive Web Apps (PWAs):

- **All browser storage gets wiped** (IndexedDB, localStorage, Cache API) if the PWA isn't actively used for approximately 7 days
- **Even sooner deletion** can occur under memory pressure, device restarts, or iOS updates
- **This is by design** - Apple treats PWA storage as temporary/cache-like data, not persistent app data
- **No reliable workaround exists** to prevent iOS from deleting local storage

### Why Previous Solutions Failed

1. **localStorage-based auth** ❌ - Deleted by iOS after 7 days
2. **IndexedDB + localStorage dual storage** ❌ - Both deleted by iOS after 7 days
3. **Service Worker Cache API** ❌ - Also subject to the same 7-day deletion policy

**The fundamental issue**: You **cannot trust iOS to persist any client-side storage** for PWAs.

---

## ✅ **The Solution: Server-Side Sessions + Keepalive**

Since iOS cannot be trusted to persist local storage, we've implemented a **hybrid approach**:

### **1. Extended Server-Side Sessions (90 Days)**

**Changes Made:**
- Extended session expiry from **7 days → 90 days** in the database
- Extended cookie `maxAge` from **7 days → 90 days**
- This ensures the server-side session remains valid even if client storage is cleared

**Files Modified:**
- `lib/auth.ts` - Updated `generateSessionExpiry()` to 90 days
- `app/api/auth/login/route.ts` - Updated cookie maxAge to 90 days
- `app/api/auth/refresh/route.ts` - Updated cookie maxAge to 90 days

**Why 90 days?**
- Gives users a 3-month window to reopen the app
- Balances security with user convenience
- Allows for monthly budget app usage patterns

---

### **2. Session Keepalive Mechanism**

**New Endpoint:** `/api/auth/keepalive`

**Purpose:**
- Updates the session's `updatedAt` timestamp in the database
- Signals to iOS that the PWA is "active"
- Helps prevent aggressive storage eviction (though not guaranteed)

**When It's Called:**
1. **On every app open** - When AuthProvider mounts
2. **When app comes to foreground** - Via `visibilitychange` event listener
3. **After successful token refresh** - Keeps session alive

**Files Created:**
- `app/api/auth/keepalive/route.ts` - New keepalive endpoint

**Files Modified:**
- `app/components/AuthProvider.tsx` - Added `sendKeepalive()` function and visibility change listener

---

### **3. Automatic Token Recovery**

**How It Works:**

1. **User opens PWA after 7+ days**
   - iOS has deleted IndexedDB/localStorage
   - Client has no tokens

2. **AuthProvider detects missing tokens**
   - Attempts to refresh using httpOnly cookie (if still valid)
   - Cookie may persist longer than IndexedDB on iOS

3. **If cookie exists:**
   - `/api/auth/refresh` validates the cookie
   - Returns new access + refresh tokens
   - Tokens stored in IndexedDB/localStorage
   - User stays logged in ✅

4. **If cookie also deleted:**
   - User redirected to login page
   - Must re-authenticate

---

## 📊 **Expected Behavior**

### **Scenario 1: User Opens App Every Few Days**
- ✅ Tokens persist in IndexedDB/localStorage
- ✅ Keepalive prevents storage deletion (best effort)
- ✅ User stays logged in indefinitely

### **Scenario 2: User Opens App After 7-14 Days**
- ⚠️ IndexedDB/localStorage cleared by iOS
- ✅ httpOnly cookie may still exist
- ✅ AuthProvider auto-refreshes tokens from cookie
- ✅ User stays logged in (seamless recovery)

### **Scenario 3: User Opens App After 30+ Days**
- ❌ All storage cleared (IndexedDB, localStorage, cookies)
- ❌ No tokens available
- ❌ User must login again

### **Scenario 4: User Opens App After 90+ Days**
- ❌ Server-side session expired
- ❌ User must login again

---

## 🧪 **Testing Instructions**

### **Test 1: Normal Usage (Daily/Weekly)**
1. Login to the app on iPhone
2. Add to Home Screen
3. Use the app normally for a few days
4. Close and reopen from home screen
5. **Expected**: Should stay logged in

### **Test 2: Storage Deletion Simulation**
1. Login to the app on iPhone
2. Add to Home Screen
3. Open Safari Settings → Advanced → Website Data
4. Find your app and delete its data
5. Reopen PWA from home screen
6. **Expected**: Should auto-recover and stay logged in (if within 90 days)

### **Test 3: Long Inactivity (7+ Days)**
1. Login to the app on iPhone
2. Add to Home Screen
3. **Don't open the app for 7-10 days**
4. Reopen PWA from home screen
5. **Expected**: 
   - If cookies persist: Auto-recovery, stays logged in
   - If cookies deleted: Redirected to login

### **Test 4: Check Console Logs**
Open Safari Web Inspector (Mac → iPhone USB):
```
[AuthProvider] Checking auth on pathname: /dashboard
[AuthProvider] Has access token: false
[AuthProvider] Attempting token refresh...
[Refresh API] Using refreshToken from: cookie
[AuthProvider] Token refreshed successfully
[AuthProvider] Sending keepalive ping...
[AuthProvider] Keepalive successful
```

---

## 🔧 **Technical Implementation Details**

### **Session Keepalive Flow**

```
User Opens PWA
     ↓
AuthProvider Mounts
     ↓
checkAuth() Called
     ↓
Token Valid? → YES → sendKeepalive()
     ↓                      ↓
     NO              POST /api/auth/keepalive
     ↓                      ↓
refreshAccessToken()   Update session.updatedAt
     ↓                      ↓
sendKeepalive()       Return success
```

### **Visibility Change Listener**

```javascript
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    // App came to foreground
    await sendKeepalive();
  }
});
```

**Why This Matters:**
- iOS PWAs lose focus when user switches apps
- When user returns, we immediately ping the server
- Signals "active usage" to iOS
- May help prevent storage eviction (not guaranteed)

---

## ⚠️ **Important Limitations**

### **What This Solution DOES:**
✅ Extends server-side session to 90 days
✅ Provides automatic token recovery via cookies
✅ Sends keepalive signals to maintain "active" status
✅ Improves user experience for regular users

### **What This Solution CANNOT DO:**
❌ **Prevent iOS from deleting storage** - This is an iOS platform limitation
❌ **Guarantee indefinite persistence** - iOS can still clear storage anytime
❌ **Work offline after storage deletion** - Requires internet to recover tokens
❌ **Bypass Apple's PWA restrictions** - Fundamental platform constraint

---

## 🚀 **Deployment Checklist**

- [x] Extended session expiry to 90 days
- [x] Extended cookie maxAge to 90 days
- [x] Created `/api/auth/keepalive` endpoint
- [x] Added keepalive calls to AuthProvider
- [x] Added visibility change listener
- [x] Tested build successfully

**Next Steps:**
1. Deploy to production (Vercel)
2. Test on real iPhone device
3. Monitor console logs for keepalive activity
4. Test after 7+ days of inactivity
5. Gather user feedback

---

## 📝 **User Communication**

**What to tell users:**

> "For the best experience on iPhone, please open the Budget App at least once every 2-3 weeks. This helps keep you logged in and ensures your data stays synced."

**Why this is necessary:**
- iOS has strict storage policies for web apps
- Regular usage helps maintain your session
- This is a platform limitation, not an app bug

---

## 🔍 **Monitoring & Debugging**

### **Server-Side Logs to Monitor:**
```
[Keepalive] Updated X sessions for user Y
[Refresh API] Using refreshToken from: cookie
[Refresh API] Session found: true
```

### **Client-Side Logs to Monitor:**
```
[AuthProvider] Sending keepalive ping...
[AuthProvider] Keepalive successful
[AuthProvider] App became visible, sending keepalive...
```

### **Signs of Success:**
- Users stay logged in for weeks/months
- Keepalive logs appear regularly
- Token refresh from cookies works

### **Signs of Issues:**
- Users complain about frequent logouts
- No keepalive logs in console
- Refresh always fails (no cookie)

---

## 📚 **References**

- [iOS PWA 7-Day Storage Deletion Policy](https://vinova.sg/navigating-safari-ios-pwa-limitations/)
- [Apple PWA Limitations](https://www.netguru.com/blog/how-to-share-session-cookie-or-state-between-pwa-in-standalone-mode-and-safari-on-ios)
- [WebKit Bug Tracker](https://bugs.webkit.org/)

---

## ✅ **Summary**

This solution provides the **best possible authentication persistence** for iOS PWAs given Apple's platform constraints. While we cannot prevent iOS from deleting storage, we've implemented:

1. **Long-lived server sessions** (90 days)
2. **Automatic token recovery** via cookies
3. **Keepalive mechanism** to signal active usage
4. **Visibility change detection** for foreground events

**Result**: Users should stay logged in for weeks/months with regular usage, with automatic recovery if storage is cleared within the 90-day window.

