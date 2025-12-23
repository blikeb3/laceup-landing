# Google Sheets Waitlist Setup Guide

Follow these steps to connect your waitlist form to Google Sheets:

## Step 1: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named "LaceUp Waitlist"
3. In the first row, add these column headers:
   - A1: `Timestamp`
   - B1: `Name`
   - C1: `Email`
   - D1: `Role`
   - E1: `Sport`
   - F1: `University`

## Step 2: Create Google Apps Script

1. In your Google Sheet, click **Extensions** > **Apps Script**
2. Delete any existing code
3. Paste the following code:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Add row to sheet
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name || '',
      data.email || '',
      data.role || '',
      data.sport || '',
      data.university || ''
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Added to waitlist'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click **Save** (💾 icon)
5. Name it "LaceUp Waitlist Handler"

## Step 3: Deploy as Web App

1. Click **Deploy** > **New deployment**
2. Click the gear icon (⚙️) next to "Select type"
3. Choose **Web app**
4. Configure:
   - **Description**: "LaceUp Waitlist Form"
   - **Execute as**: Me
   - **Who has access**: Anyone
5. Click **Deploy**
6. Click **Authorize access**
7. Choose your Google account
8. Click **Advanced** > **Go to [your project name] (unsafe)**
9. Click **Allow**
10. **Copy the Web App URL** (it looks like: `https://script.google.com/macros/s/...../exec`)

## Step 4: Update Your Code

1. Open `/components/WaitlistForm.tsx`
2. Find this line near the top:
   ```typescript
   const GOOGLE_SHEET_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
   ```
3. Replace `"YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"` with your actual URL from Step 3

Example:
```typescript
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbz.../exec";
```

## Step 5: Test It!

1. Go to your LaceUp landing page
2. Fill out the waitlist form
3. Submit it
4. Check your Google Sheet - you should see a new row with the data!

## Optional: Set Up Email Notifications

To get notified when someone joins the waitlist:

1. In Google Sheets, click **Tools** > **Notification rules**
2. Choose: "A user submits a form" or "Any changes are made"
3. Set notification preferences
4. Click **Save**

## Troubleshooting

- **Form not submitting?** Make sure you deployed the script as a web app with "Anyone" access
- **Not seeing data?** Check that your column headers in the sheet match exactly
- **Need to redeploy?** After changing the Apps Script, create a **New deployment** (not "Manage deployments")

---

**Need help?** Contact Logan at logan@laceupnetwork.com
