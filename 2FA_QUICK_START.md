# Quick Start: 2FA Setup Guide

## Prerequisites Checklist

Before testing the 2FA feature, complete these steps:

### 1. Enable MFA in Supabase Dashboard

1. Open your Supabase project at [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to: **Authentication** → **Configuration**
4. Scroll to **Multi-Factor Authentication** section
5. Toggle **TOTP** to **Enabled**
6. (Optional) Set **Required AAL** to `aal2` if you want to make 2FA mandatory for all users

### 2. Apply Database Migration

Choose one method:

#### Option A: Using Supabase CLI (Recommended)
```bash
cd C:\laceup-landing
supabase db push
```

#### Option B: Using SQL Editor
1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of:
   `supabase/migrations/20260126000000_add_mfa_tables.sql`
4. Click **Run**

### 3. Install Authenticator App (for testing)

On your phone, download one of:
- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)  
- **Authy** (iOS/Android)

## Testing the Feature

### Test 1: Enable 2FA on Your Account

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Sign in to your account

3. Navigate to **Profile** page

4. Scroll down to **Security Settings** card

5. Click **Enable 2FA** button

6. **Scan QR Code:**
   - Open your authenticator app
   - Tap "+" or "Add"
   - Scan the QR code shown
   - OR manually enter the setup key

7. **Verify:**
   - Enter the 6-digit code from your app
   - Click "Verify & Enable 2FA"

8. **Save Backup Codes:**
   - Download the backup codes file
   - Store it securely (you'll need these if you lose your phone)
   - Click "Complete Setup"

9. ✅ 2FA is now enabled!

### Test 2: Sign In with 2FA

1. Sign out

2. Sign in with your email and password

3. **NEW STEP:** You'll see a dialog asking for your 2FA code

4. Open your authenticator app

5. Enter the 6-digit code

6. Click "Verify"

7. ✅ You're signed in!

### Test 3: Use Backup Code

1. Sign out

2. Sign in with email and password

3. When the 2FA dialog appears, click **"Use backup code instead"**

4. Enter one of your backup codes (format: XXXX-XXXX)

5. Click "Verify Backup Code"

6. ✅ Signed in! (Note: That backup code is now used and won't work again)

### Test 4: Disable 2FA

1. Go to Profile → Security Settings

2. Click the trash icon next to your authenticator

3. Confirm you want to disable 2FA

4. ✅ 2FA is now disabled

## Verification Checklist

- [ ] Migration applied successfully (no SQL errors)
- [ ] Security Settings card appears on Profile page
- [ ] Can enable 2FA (QR code displays)
- [ ] Authenticator app scans QR code successfully
- [ ] Backup codes download as .txt file
- [ ] MFA dialog appears after password entry
- [ ] Can sign in with authenticator code
- [ ] Can sign in with backup code
- [ ] Can disable 2FA
- [ ] Security events logged in database

## Troubleshooting

### "Cannot read properties of undefined" error
- Ensure migration is applied
- Check Supabase logs for RLS policy errors
- Verify MFA is enabled in Supabase dashboard

### QR code doesn't display
- Check browser console for errors
- Verify Supabase MFA is enabled
- Try refreshing the page

### "Invalid code" error
- Codes expire every 30 seconds - try a fresh code
- Ensure phone's time is set correctly (automatic)
- Check if you're using the right authenticator entry

### Backup codes don't work
- Format must be XXXX-XXXX (with dash)
- Codes are case-sensitive
- Each code only works once
- Check database to see if code was already used:
  ```sql
  SELECT * FROM user_mfa_backup_codes 
  WHERE user_id = 'YOUR_USER_ID';
  ```

## Database Verification

Check if tables were created:

```sql
-- Should show 2 new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_mfa_backup_codes', 'user_security_events');

-- View your backup codes (hashed)
SELECT * FROM user_mfa_backup_codes 
WHERE user_id = auth.uid();

-- View security events
SELECT * FROM user_security_events 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

## Next Steps

Once testing is complete:

1. **Enable for All Users**: Update Profile page to encourage 2FA adoption
2. **Make Optional/Required**: Decide if 2FA should be mandatory for certain roles
3. **Monitor Adoption**: Track how many users enable 2FA
4. **Add Email Notifications**: Alert users when 2FA is enabled/disabled
5. **Implement Phase 2 Features**: Device management, remember device, etc.

## Support

If you encounter issues:
1. Check browser console for errors
2. Review Supabase logs
3. Verify all steps in this guide
4. Check [2FA_IMPLEMENTATION.md](./2FA_IMPLEMENTATION.md) for detailed documentation
