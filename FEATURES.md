# 📖 Feature Documentation - TerreCoord Property Coordinator

## Overview

TerreCoord Property Coordinator is a complete booking management system designed specifically for family and friends to coordinate vacation property usage. Unlike Airbnb or VRBO, it's 100% private, requires no payments, and generates customs documentation automatically.

---

## 🎯 Core Features

### 1. Public Booking Form

**What it does:** Allows guests to request bookings through a simple web form.

**How to use:**
1. Visit the homepage
2. Select property from dropdown (if multiple properties)
3. Enter your name and email address
4. Choose check-in date (arrival)
5. Choose check-out date (departure)
6. Click "Submit Booking Request"

**What happens next:**
- Booking is added to Google Calendar with "PENDING" status
- You receive confirmation email immediately
- Property owner receives notification email
- Owner reviews and approves/rejects within 24-48 hours

**Tips:**
- Dates are validated automatically
- System prevents double bookings
- Email confirmation includes all booking details
- You can request modifications by contacting owner

---

### 2. Owner Dashboard

**What it does:** Central hub for property owners to manage all booking requests and confirmed reservations.

**Access:** Visit `/owner` route (e.g., `https://yoursite.com/owner`)

**Dashboard Sections:**

#### Statistics Overview
- **Total Bookings:** All upcoming reservations
- **Pending Review:** Awaiting your approval/rejection
- **Confirmed:** Approved bookings
- **Declined:** Rejected requests (for reference)

#### Bookings Table
Shows all upcoming bookings with:
- Status badge (Pending, Confirmed, Declined)
- Guest name and email
- Check-in and check-out dates
- Number of nights
- Action buttons

#### Property Switcher
If you manage multiple properties, use dropdown to switch between them.

---

### 3. Booking Approval Workflow

#### Approving a Booking

**Steps:**
1. Review booking details in dashboard
2. Click green "✓ Approve" button
3. System automatically:
   - Updates calendar status to "CONFIRMED"
   - Sends approval email to guest
   - Generates customs PDF
   - Attaches PDF to approval email

**When to approve:**
- Guest is trusted family/friend
- Dates are convenient
- No conflicts with other plans

#### Rejecting a Booking

**Steps:**
1. Click red "✗ Reject" button
2. Confirm rejection in popup
3. System automatically:
   - Removes booking from calendar
   - Sends polite rejection email to guest
   - Marks booking as declined

**When to reject:**
- Dates conflict with owner's personal plans
- Property unavailable (maintenance, etc.)
- Guest should request different dates

---

### 4. Booking Management

#### Editing a Booking

**What you can edit:**
- Booking title (calendar event name)
- Guest name
- Guest email address
- Check-in date
- Check-out date

**Steps:**
1. Click "✏️ Edit" button on booking
2. Modify any fields
3. Click "Save Changes"
4. System validates new dates for conflicts
5. Guest receives notification if booking was confirmed

**Use cases:**
- Guest requests date change
- Typo in guest name/email
- Need to adjust booking status
- Extend or shorten stay

#### Canceling a Booking

**Steps:**
1. Click "🗑️ Cancel" button
2. Confirm cancellation
3. System automatically:
   - Removes event from calendar
   - Sends cancellation notice to guest
   - Marks booking as cancelled

**When to cancel:**
- Guest requests cancellation
- Property becomes unavailable
- Emergency situations

---

### 5. Customs Documentation System

**Purpose:** Generate official-looking certificates for customs/immigration officers to verify property occupancy.

**Use cases:**
- Owner traveling internationally with pet
- Proving residence/occupancy for customs
- Immigration documentation
- Legal proof of property usage

#### PDF Certificate Contents

The generated PDF includes:

**Header Section:**
- "Property Occupancy Certificate"
- "For Customs and Immigration Purposes"

**Property Information:**
- Property name
- Booking reference (Event ID)
- Generation date

**Guest Information:**
- Full name
- Email address

**Occupancy Period:**
- Check-in date (formatted: Month Day, Year)
- Check-out date (formatted: Month Day, Year)

**Attestation:**
Professional statement certifying the booking is legitimate.

**Footer:**
- Date stamp
- Auto-generated notice

#### How to Access PDFs

**Method 1: Automatic (Recommended)**
- PDF automatically attached to approval email
- Guest receives it instantly upon approval

**Method 2: Manual Download**
- Open owner dashboard
- Find confirmed booking
- Click "📄 PDF" button
- PDF downloads immediately

**Method 3: On-Demand Generation**
Visit: `/owner/download-pdf/[EVENT_ID]?property=[PROPERTY_KEY]`

---

### 6. Email Notification System

**All email notifications are professional, branded, and include relevant details.**

#### Booking Request Confirmation (to Guest)

**Sent when:** Guest submits booking request

**Includes:**
- Confirmation of receipt
- Property name
- Requested dates
- Status: "Pending approval"
- Next steps: "Wait for owner review"

**Template:**
```
Subject: Booking Request Received - [Property Name]

Hi [Guest Name],

We've received your booking request for [Property Name]:
- Check-in: [Date]
- Check-out: [Date]

Your request is pending approval. You'll receive another email once reviewed.

Best regards,
TerreCoord Team
```

#### New Booking Alert (to Owner)

**Sent when:** Guest submits booking request

**Includes:**
- Guest name and email
- Property name
- Requested dates
- Direct link to dashboard

**Template:**
```
Subject: New Booking Request - [Property Name]

New booking request submitted:
- Property: [Property Name]
- Guest: [Name] ([Email])
- Dates: [Start] - [End]

Review in Dashboard: [Link]
```

#### Approval Notification (to Guest)

**Sent when:** Owner approves booking

**Includes:**
- Confirmation of approval
- Booking dates
- Customs PDF attachment (if enabled)
- Welcome message

**Template:**
```
Subject: Booking Approved - [Property Name]

Hi [Guest Name],

Great news! Your booking has been approved:
- Property: [Property Name]
- Check-in: [Date]
- Check-out: [Date]

A customs certificate is attached for your travel documentation.

We look forward to hosting you!
```

#### Rejection Notice (to Guest)

**Sent when:** Owner rejects booking

**Includes:**
- Polite rejection message
- Suggestion to request different dates
- No negative tone

**Template:**
```
Subject: Booking Request Update - [Property Name]

Hi [Guest Name],

We're sorry, but your booking request could not be approved for the requested dates.

The property may already be booked. Please feel free to submit another request for different dates.

Best regards,
TerreCoord Team
```

#### Modification Alert (to Guest)

**Sent when:** Owner edits confirmed booking

**Includes:**
- Notice of changes
- New dates
- Updated details

**Template:**
```
Subject: Booking Updated - [Property Name]

Hi [Guest Name],

Your booking has been updated:
- New Check-in: [Date]
- New Check-out: [Date]

Best regards,
TerreCoord Team
```

#### Cancellation Notice (to Guest)

**Sent when:** Booking is cancelled

**Includes:**
- Cancellation confirmation
- Contact information for questions

**Template:**
```
Subject: Booking Cancelled - [Property Name]

Hi [Guest Name],

Your booking for [Property Name] has been cancelled.

If you have questions, please contact the property owner.

Best regards,
TerreCoord Team
```

---

### 7. Conflict Detection

**How it works:**
System checks Google Calendar for overlapping events before:
- Creating new booking
- Updating existing booking dates

**Validation rules:**
- No two bookings can overlap by even one day
- Check-out date of Booking A = Check-in date of Booking B is **not allowed**
- System requires at least 1 day gap between bookings

**Example scenarios:**

✅ **Allowed:**
- Booking A: Jan 1-3
- Booking B: Jan 4-6
(No overlap)

❌ **Not allowed:**
- Booking A: Jan 1-3
- Booking B: Jan 3-5
(Jan 3 overlaps)

✅ **Allowed:**
- Booking A: Jan 1-5
- Booking B: Jan 6-8
(1 day gap)

**Error handling:**
If conflict detected, user sees friendly error message:
"These dates are already booked. Please choose different dates."

---

### 8. Multi-Property Support

**Configuration:** Properties defined in `calendars.json`

**How it works:**
- Each property has unique Google Calendar
- Property selector appears in booking form
- Owner dashboard includes property switcher
- All features work independently per property

**Example configuration:**
```json
{
  "beach": {
    "name": "Coastal Beach House",
    "id": "beach@group.calendar.google.com"
  },
  "mountain": {
    "name": "Mountain View Cabin",
    "id": "mountain@group.calendar.google.com"
  }
}
```

**Guest experience:**
- Selects property from dropdown
- Submits booking for specific property
- Receives property-specific communications

**Owner experience:**
- Switches between properties with dropdown
- Manages each property independently
- Sees aggregated statistics per property

---

### 9. Google Calendar Integration

**How integration works:**

1. **OAuth Authentication:** Owner authorizes app once
2. **Two-Way Sync:** 
   - App reads existing calendar events
   - App creates/updates/deletes events
   - Changes appear in Google Calendar immediately
3. **Event Format:**
   - Title: "PENDING Booking: [Guest Name]" or "CONFIRMED Booking: [Guest Name]"
   - Description: Guest details, dates, status
   - Dates: All-day events
   - Calendar: Property-specific calendar

**Calendar event lifecycle:**

```
New Booking
    ↓
"PENDING Booking: John Doe" created
    ↓
Owner Approves
    ↓
Title updated to "CONFIRMED Booking: John Doe"
    ↓
Owner Cancels
    ↓
Event deleted from calendar
```

**Benefits:**
- Owner sees bookings in native Google Calendar app
- Integrates with existing calendar workflows
- Automatic sync with phone, tablet, desktop
- Can set calendar notifications/reminders

---

### 10. Status Badge System

**Visual indicators for quick status recognition:**

| Badge | Meaning | Owner Actions Available |
|-------|---------|-------------------------|
| 🟡 **Pending** | Awaiting owner review | Approve, Reject, Edit, Cancel |
| ✅ **Confirmed** | Approved by owner | Download PDF, Edit, Cancel |
| ❌ **Declined** | Rejected by owner | View only (historical record) |

**Badge colors:**
- **Pending:** Yellow/amber - draws attention
- **Confirmed:** Green - positive, final
- **Declined:** Red - negative, complete

**Animations:**
Pending badges pulse slowly to indicate action needed.

---

## 🎨 User Interface Features

### Responsive Design
- **Mobile:** Stacked layout, full-width buttons
- **Tablet:** Optimized spacing, readable tables
- **Desktop:** Full dashboard layout, side-by-side content

### Dark Mode Support
System automatically detects user's OS preference and applies dark theme.

### Accessibility
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast ratios (WCAG compliant)
- Focus indicators on all interactive elements

### Form Validation
- Real-time validation as you type
- Helpful error messages
- Date range validation
- Email format checking
- Required field indicators (red asterisk)

### Loading States
- Buttons show spinner during submission
- Prevents double-submission
- Clear feedback on processing

---

## 🔧 Advanced Features

### System Health Check

**Endpoint:** `/health`

**Returns:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-17T21:00:00.000Z",
  "features": {
    "emailNotifications": true,
    "pdfGeneration": true,
    "customsDocs": true
  }
}
```

**Use cases:**
- Verify system is running
- Check feature flags
- Monitor uptime
- Debugging deployment issues

### Event Listing (JSON)

**Endpoint:** `/list-events?property=[KEY]`

**Returns:** Raw Google Calendar events in JSON format

**Use cases:**
- Debugging calendar sync
- API integration
- Data export
- Troubleshooting

---

## 💡 Best Practices

### For Guests

1. **Book early** - Submit requests well in advance
2. **Provide accurate email** - Ensures you receive notifications
3. **Check spam folder** - Sometimes emails land there
4. **Request reasonable dates** - Increases approval likelihood
5. **Be flexible** - Have backup dates in mind

### For Owners

1. **Review promptly** - Respond within 24-48 hours
2. **Communicate clearly** - Use edit feature for changes
3. **Download PDFs** - Keep copies for records
4. **Monitor dashboard** - Check regularly for new requests
5. **Keep calendar current** - Block personal usage dates

---

## 🆘 User Support

### Common Issues

**"I didn't receive confirmation email"**
- Check spam/junk folder
- Verify email address was entered correctly
- Contact owner if still not received

**"My dates show as unavailable"**
- Dates may already be booked
- Try different dates
- Contact owner for date availability

**"I need to change my booking dates"**
- Contact property owner directly
- Owner can edit booking from dashboard
- You'll receive notification of changes

**"Where is my customs PDF?"**
- Check approval email attachments
- Ask owner to resend or download from dashboard
- PDF is generated upon approval only

---

## 📊 Usage Analytics

### What Owners Can Track

**Dashboard Statistics:**
- Total bookings (upcoming only)
- Pending review count
- Confirmed booking count  
- Declined booking count

**Per Booking:**
- Guest information
- Date range
- Number of nights
- Status history
- Modification log (in Google Calendar description)

---

## 🔐 Privacy & Security

### Data Handling

**What we store:**
- Booking information in Google Calendar
- OAuth tokens in local file
- No payment information (not a commercial platform)
- No user accounts/passwords

**Email privacy:**
- Emails sent only for booking notifications
- No marketing emails
- No sharing with third parties
- Unsubscribe not needed (transactional only)

**PDF Privacy:**
- Generated on-demand
- Not stored on server
- Sent directly to guest email
- Contains only booking information

---

## 🎯 Success Stories

**Use Case 1: International Pet Travel**
Owner travels to/from country with pet. Customs requires proof of property occupancy. TerreCoord generates professional certificate showing occupancy dates, satisfying customs requirements.

**Use Case 2: Family Coordination**
Extended family shares beach house. TerreCoord prevents double bookings, ensures fair usage, and keeps everyone informed via email notifications.

**Use Case 3: Multi-Property Management**
Owner has both beach house and mountain cabin. TerreCoord's property switcher allows managing both from single dashboard without confusion.

---

## 📞 Getting Help

**For Technical Issues:**
- Check README.md troubleshooting section
- Review DEPLOYMENT.md for configuration issues
- Check `/health` endpoint for system status

**For Feature Requests:**
- Document your use case
- Explain desired behavior
- Submit as enhancement request

**For Booking Questions:**
- Guests: Contact property owner directly
- Owners: Review this documentation first

---

**Enjoy stress-free property coordination with TerreCoord! 🏡**