# Two-Factor Authentication (2FA) Implementation

## Overview

This implementation adds TOTP-based two-factor authentication to the LaceUP platform using Supabase's built-in MFA support.

## Phase 1 - Core Features Implemented ✅

### Components Created

1. **MfaSetupDialog.tsx** - Guides users through 2FA enrollment
   - Displays QR code for scanning
   - Shows manual setup key
   - Verifies first code
   - Generates and displays backup codes

2. **MfaVerifyDialog.tsx** - Handles 2FA verification during login
   - OTP input for authenticator codes
   - Backup code fallback option
   - Clear error messaging

3. **BackupCodesDialog.tsx** - Displays backup codes
   - Shows all generated codes
   - Download functionality
   - Usage instructions

4. **SecuritySettings.tsx** - Profile security management
   - Enable/disable 2FA toggle
   - View enrolled authenticators
   - Remove factors
   - Security tips

### Library Functions (mfaHelpers.ts)

- `enrollTotpFactor()` - Start 2FA enrollment
- `verifyTotpEnrollment()` - Complete enrollment verification
- `createMfaChallenge()` - Create challenge during login
- `verifyMfaCode()` - Verify authenticator code
- `listMfaFactors()` - Get user's enrolled factors
- `unenrollMfaFactor()` - Remove authenticator
- `generateBackupCodes()` - Generate recovery codes
- `hashBackupCode()` - Hash codes for storage (SHA-256)
- `storeBackupCodes()` - Save codes to database
- `verifyBackupCode()` - Validate and mark backup code as used
- `logSecurityEvent()` - Audit trail logging
- `downloadBackupCodes()` - Download codes as text file

### Custom Hook (useMfa.ts)

Manages MFA state and operations:
- Lists enrolled factors
- Handles enrollment flow
- Verifies codes
- Removes factors
- Automatic refresh

### Integration Points

1. **Profile Page** - Added SecuritySettings component
   - Located in sidebar below endorsements
   - Accessible to all authenticated users

2. **Auth Page** - Enhanced sign-in flow
   - Checks for MFA after password verification
   - Shows MFA dialog if enabled
   - Supports backup code fallback
   - Continues to approval checks after MFA

### Database Schema

**user_mfa_backup_codes table:**
```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- code_hash (text, SHA-256 hashed)
- used_at (timestamptz, nullable)
- created_at (timestamptz)
```

**user_security_events table:**
```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- event_type (text) - e.g., 'mfa_enabled', 'mfa_disabled'
- metadata (jsonb)
- ip_address (inet)
- user_agent (text)
- created_at (timestamptz)
```

## Setup Instructions

### 1. Enable MFA in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Configuration**
3. Scroll to **Multi-Factor Authentication**
4. Enable **TOTP** (Time-based One-Time Password)
5. Set **Required AAL** to `aal2` (optional - makes 2FA required)

### 2. Apply Database Migration

```bash
# If using Supabase CLI
supabase db push

# Or apply manually in Supabase SQL Editor
# Run the contents of: supabase/migrations/20260126000000_add_mfa_tables.sql
```

### 3. Test the Implementation

#### Enrollment Flow:
1. Sign in to your account
2. Navigate to **Profile** page
3. Scroll to **Security Settings** section
4. Click **Enable 2FA**
5. Scan QR code with authenticator app
6. Enter verification code
7. Download backup codes (required)
8. Setup complete!

#### Sign-In Flow:
1. Enter email and password
2. If 2FA is enabled, MFA dialog appears
3. Enter 6-digit code from authenticator
4. OR click "Use backup code instead"
5. Sign in completes after verification

## User Experience

### First-Time Setup (3 steps)
1. **Scan** - QR code + manual key option
2. **Verify** - Test first code
3. **Backup** - Download recovery codes (mandatory)

### Daily Login
1. Email + Password (existing)
2. **NEW:** 6-digit code (if 2FA enabled)
3. Backup code option available

## Security Features

✅ **Rate Limiting** - Inherited from existing auth system  
✅ **Backup Codes** - 10 single-use codes, SHA-256 hashed  
✅ **Audit Logging** - Security events tracked  
✅ **RLS Policies** - Database-level security  
✅ **No SMS** - Avoids SIM swapping attacks  
✅ **Offline** - Works without internet (TOTP)  

## Supported Authenticator Apps

- Google Authenticator (iOS/Android)
- Microsoft Authenticator (iOS/Android)
- Authy (iOS/Android/Desktop)
- 1Password (with TOTP support)
- Any RFC 6238 compliant TOTP app

## Recovery Options

If user loses authenticator device:
1. **Backup Codes** - Use one of 10 recovery codes
2. **Admin Support** - Contact admin to disable 2FA
3. **Re-enrollment** - Set up new authenticator after recovery

## Known Limitations

1. **Supabase MFA Requirement**: 
   - Must enable MFA in Supabase project settings
   - Uses Supabase's native MFA implementation

2. **Backup Code Login**:
   - Currently marks code as used but may need session refresh
   - User prompted to set up new authenticator

3. **Device Management**:
   - Phase 2 feature (not implemented yet)
   - Can only see enrolled factors, not devices/locations

## Next Steps (Phase 2 & 3)

### Phase 2 - Enhanced UX
- [ ] "Remember this device for 30 days" option
- [ ] Better error messages for specific MFA failures
- [ ] Device management (view all authenticated devices)
- [ ] Show last login time/location

### Phase 3 - Admin & Advanced
- [ ] Admin panel to disable user 2FA
- [ ] Force 2FA for specific user roles (admin, employer)
- [ ] Security dashboard showing recent events
- [ ] Email notifications for security changes
- [ ] WebAuthn/Passkey support (future)

## Troubleshooting

### "MFA verification not initialized"
- Clear browser cache and cookies
- Try signing in again
- Ensure Supabase MFA is enabled in project settings

### Backup codes not working
- Check code format (XXXX-XXXX)
- Ensure code hasn't been used already
- Case-sensitive, remove spaces

### QR code not scanning
- Use manual setup key instead
- Ensure good lighting for QR scan
- Try different authenticator app

### Time sync issues
- Authenticator codes expire every 30 seconds
- Ensure device clock is accurate
- Use automatic time setting on phone

## Files Modified/Created

### New Files:
- `src/lib/mfaHelpers.ts`
- `src/hooks/useMfa.ts`
- `src/components/MfaSetupDialog.tsx`
- `src/components/MfaVerifyDialog.tsx`
- `src/components/BackupCodesDialog.tsx`
- `src/components/SecuritySettings.tsx`
- `supabase/migrations/20260126000000_add_mfa_tables.sql`

### Modified Files:
- `src/pages/Profile.tsx` - Added SecuritySettings component
- `src/pages/Auth.tsx` - Added MFA verification flow

## Testing Checklist

- [ ] Enroll new authenticator
- [ ] Verify code during enrollment
- [ ] Download backup codes
- [ ] Sign out and sign in with 2FA
- [ ] Use backup code to sign in
- [ ] Remove authenticator factor
- [ ] Test rate limiting on wrong codes
- [ ] Test on mobile device
- [ ] Test QR code scanning
- [ ] Test manual key entry

## Support

For issues or questions about the 2FA implementation:
1. Check Supabase MFA documentation
2. Review security event logs in database
3. Test in incognito/private window
4. Check browser console for errors
