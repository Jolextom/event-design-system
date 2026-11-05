# Operations: payments, emails and event-day tools

Short reference for running an event on this platform. Environment variables go in
Vercel (Project → Settings → Environment Variables); a new value only takes effect after a redeploy.

## Environment variables

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | everything |
| `PAYSTACK_SECRET_KEY` | payments (`sk_test_…` while testing, `sk_live_…` for real money). The public key isn't used. |
| `RESEND_API_KEY` | all email |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` | links inside emails (set both to your site, e.g. `https://maincharacterfest.vercel.app`) |
| `CHECKIN_REMINDER_SECRET` | OPTIONAL. Only for the pre-event "send everyone their QR again" page. Not needed: every ticket email already carries the QR. |
| `RECONCILE_SECRET` | OPTIONAL. Only for the backup page that completes orders paid at Paystack but never finished (needed only if the webhook ever misses one). |

## Paystack webhook (do this before taking real payments)

Paystack tells us a payment succeeded by calling a URL. Without it, a payment is only
completed if the customer returns to our receipt page; someone who pays and closes the tab
gets charged but isn't registered.

Paystack dashboard → Settings → API Keys & Webhooks:
- **Test Webhook URL**: `https://<your-site>/api/paystack/webhook`
- **Live Webhook URL**: the same URL
- Test and live mode have separate settings; set both. Signatures are checked with `PAYSTACK_SECRET_KEY`.

### Safety net if a payment was missed
Finds orders still "pending", asks Paystack if each was really paid, and (only with `confirm=yes`) completes the paid ones.

```
Look only:   https://<your-site>/api/admin/reconcile-orders?tag=<event-tag>&secret=<RECONCILE_SECRET>
Complete:    https://<your-site>/api/admin/reconcile-orders?tag=<event-tag>&secret=<RECONCILE_SECRET>&confirm=yes
```

## Check-in codes (QR) by email

Every ticket email carries that person's own QR code and check-in code, which the check-in
desk scans. Before the event you can also send everyone a reminder with the same pass
(`CHECKIN_REMINDER_SECRET`). Always start with a test send to yourself:

```
Test to yourself:  /api/admin/send-checkin-reminder?tag=<event-tag>&secret=<SECRET>&testEmail=you@example.com
Real, to everyone: /api/admin/send-checkin-reminder?tag=<event-tag>&secret=<SECRET>&confirm=yes
```
It skips anyone already sent one and sends at most 50 per run (add `&limit=` to change it).

## Who emails come from

- An event with its own email identity (see `email` in `src/app/[tag]/theme.ts`, e.g. Main Character Fest)
  sends as that brand through the platform's sending domain.
- Any other event uses the owner's verified sender (Dashboard → Senders) if there is one, else the platform default.

## Email limits

Invite and ticket emails to one person: at most one every 2 minutes and 4 per 24 hours
(`src/lib/guests.ts`). The "resend" endpoint only accepts the event's organiser (logged in)
or someone holding the order reference.

## Service fee and paying the organiser directly

Dashboard → **Templates** → Main Character Fest → *Real event*:
- **Add the ₦500 service fee** (on by default). Customers pay the ticket price + Paystack's own fee + ₦500, shown as ONE
  "Service fee" line at checkout (₦15,000 → ₦15,850; ₦22,500 group → ₦23,500). The modal previews these numbers and what you keep.
- **Organiser's Paystack subaccount code** (optional, looks like `ACCT_xxxxxxxxxx`). With it, Paystack pays the organiser
  the exact ticket price straight to their bank and you keep the fee. Without it, everything lands in your own Paystack account.

To get a code: Paystack dashboard → Subaccounts → create one with the organiser's bank details (if it asks for a percentage
charge, enter 0; the exact split is set per payment by our code). **Test mode and live mode have separate subaccounts**:
use a TEST code with the test key and a LIVE code with the live key.

After a test payment, open the transaction in Paystack's dashboard and check the split shows the organiser receiving the
ticket price and your account receiving the fee.

### Changing them later: the Payments tab

Event dashboard → **Ticket Types** → **Payments** tab. Edit the organiser's payout code and the service fee (flat ₦, optional %,
rounding, label, whether customers also pay Paystack's fee) at any time, with a table showing what the customer pays and what you
keep on each ticket. Changes apply to NEW payments only; every order stores the exact amount it was charged.
Use this to swap a TEST subaccount code for the LIVE one when you go live. It warns you if you set a payout code but no fee
(Paystack's fee would then come out of your own account on every sale).

## Deleting an event

Dashboard → each event has a **Delete** button (owner only). It removes the event and everything attached to it
(tickets, guests, orders, form questions and answers, email records, staff, segments), in the order the database
requires, then confirms the event is really gone. Events with guests or orders need their exact name typed.

- **Deleting does not refund anyone.** The modal warns when completed (possibly real) orders exist; refund in Paystack first.
- If something unexpected still points at the event, you get a message naming what couldn't be removed; nothing further is
  deleted and you can press Delete again once it is fixed.
- Runs on the server with the service-role key (`SUPABASE_SERVICE_ROLE_KEY` must be set), after checking your login token
  and that you created the event. Code: `src/lib/eventDelete.ts`, `src/app/events/dashboard/actions.ts`.

## Who may do what (organiser-only actions)

Sending a broadcast, sending an event campaign, adding or removing check-in staff, and deleting an event all
check on the server that the caller is logged in **and created that event** (`src/lib/authz.ts`). Hiding a button is
not protection, because anyone can call these endpoints directly. The guest confirmation email is internal-only
(`src/lib/welcomeEmail.ts`) and is sent by checkout/payment/invite code that has already checked who is asking.
Co-organisers are not supported yet: only the event's creator can do these things.

## Receipt and invite links, and what the database exposes

The receipt page (after paying) and the invite page (link in an email) used to read the orders and guests tables
straight from the visitor's browser with the public key. They now ask the server for ONE reference
(`getReceiptAction` / `getInviteAction` in `src/app/[tag]/actions.ts`, logic in `src/lib/publicViews.ts`), and get back
only what the page draws: no payment internals, phone numbers, answers or other guests. A few wrong references in a row
block that visitor for 10 minutes. The reference itself (e.g. `EF-…-F92AA249A0`) works like a ticket link: anyone who has it
sees that order's names, emails and check-in QR codes, so don't post receipt links publicly.

**Do this once:** the code no longer needs public read access to `orders_table`, `attendees`, `answers`, so check what the
database currently allows. In the Supabase SQL editor:

```sql
select tablename, policyname, cmd, roles, qual
from pg_policies
where tablename in ('attendees','orders_table','answers','email_deliveries','staff')
order by 1, 2;
```

Any row with `roles` containing `anon` (or `public`) and `cmd` of `SELECT` or `ALL` means anyone holding the public key can list
that table. Send that output to be tightened (organiser dashboards, staff check-in and the watch/join pages still read these
tables with a login, so the policies need rewriting rather than just removing).

## Paying in a popup

"Pay" now opens Paystack's checkout in a popup on the event page instead of leaving the site. The server still creates
the transaction (price, service fee, organiser split); the page only receives its `access_code` and shows Paystack's checkout
for it (`@paystack/inline-js` `resumeTransaction`, wrapper in `src/lib/paystackPopup.ts`). When the payment succeeds the customer
goes to the receipt page, which verifies it with Paystack exactly as before (the webhook is still the safety net).

- Closing the popup shows "Payment wasn't completed" with **Resume payment**, which reopens the same payment (no duplicate order).
- If the popup can't open (blocked, offline, no response within 10 seconds) the page falls back to the old full-page Paystack redirect.
- Test it with a Paystack TEST card in test mode before going live; popups cannot be exercised without reaching Paystack.

## Event-specific wording (tab title, link preview, brand name)

`src/app/[tag]/theme.ts` holds per-event settings, matched on the start of the event's tag. For Main Character Fest it sets:
- `meta`: the browser tab title, search/share description and site name (`src/app/[tag]/layout.tsx` turns this into the page's
  title, description and Open Graph/Twitter tags; the cover image comes from the event's own `image`). Tags containing `-test`
  are titled "[Test] …" and marked noindex.
- `brandName`: shown instead of "EventFlow" on the event page header and the receipt / join pages.
Events without these keep the platform defaults. To brand another event, add the same fields to its theme entry.
Link previews are cached by WhatsApp/X/Facebook, so after changing the wording re-scrape the link (e.g. Facebook Sharing
Debugger) or wait for their cache to expire.

## Changing your password

Dashboard → **Password** (or `/settings/password`). It asks for the current password first (so someone at an unlocked laptop
can't change it), enforces a new password of at least 10 characters that isn't obviously guessable, and by default signs out
every OTHER device, which is the quickest way to kick someone out if you think the old password leaked. This device stays signed in.
Rules: `src/lib/passwordRules.ts`.

Supabase settings that go with it (Dashboard → Authentication):
- **Sign In / Providers → "Allow new users to sign up": turn OFF** so strangers can't create accounts on your platform.
- **Password security**: raise the minimum length to 10 and turn on leaked-password protection if your plan offers it.
- There is no "Forgot password" link on the sign-in page yet. If you lock yourself out, use Authentication → Users → your user →
  "Send password recovery", or set a new password there.

## Main Character Fest: no invites, and a code of conduct on the form

Set in `src/app/[tag]/theme.ts` for this event only (other events are unchanged):
- `allowInvites: false`: group buyers can't "Invite" the others. The form shows every guest's own fields, and the server
  (`src/lib/checkout.ts`) refuses invited guests and half-filled groups, so nothing can bypass the form. The "manage your group"
  box in the confirmation email is not sent for this event.
- `conduct`: a short code of conduct (Expected behaviour + Dress code) at the end of the registration form. The Register / Pay
  button stays off until the "I have read and agree" box is ticked. To edit the wording, change the text in that entry.
- The agreement is a tick on the form; it is not stored per guest in the database.

## WhatsApp group for registered guests

An app can't add someone to a WhatsApp group; people must tap the invite link themselves. So the link (`community` in
`src/app/[tag]/theme.ts`) is shown to registered guests in two places: a green "Join the … WhatsApp group" button on the receipt
page (only once the order is complete) and in the confirmation email. Test copies of the event (tag contains `-test`) never
show it, so test registrations don't land in the real group.

- To change the link (for example if it leaks): make a new invite link in WhatsApp (Group info > Invite via link > Reset link),
  replace `url` in the theme, and deploy. Use the clean link without `?s=cl&p=a&iam=2`.
- Anyone who has the link can join, even if they didn't register. In WhatsApp, turn on **Group settings > Approve new
  participants** if you want to check people before they come in.

## Client feedback round (registration questions, promo, dress code)

- **Questions** (Templates > Main Character Fest): "Which character", "Which movie or franchise" and "Squad or group name" are optional;
  the squad question was removed; **Region** and **Gender** (Male/Female) come right after "School or organisation name" and are
  required. These apply to events created from the template from now on. An event that already exists keeps its own questions: change
  them in the event's dashboard (Registration > open a question > Required toggle > Save, or add/delete questions there).
- **Promo is "while stock lasts"**: the Group of 3 has no end date; the "Group-of-3 tickets available" number you type when creating
  the event IS the promo stock. When it runs out the ticket shows greyed out as "Sold out" and the server refuses it too.
  To restock, raise that ticket's quantity in Ticketing. Registration still closes on its own date.
- **Dress code** wording (form and code-of-conduct doc): "Come dressed as your favourite movie character: costumes are encouraged,
  not compulsory. Modest dress is still required for everyone."
- Known limit: stock is checked when someone starts paying and counted when the payment completes, so with the last few promo
  tickets, two people paying at the same moment can both succeed and slightly oversell.

## Event end time is optional

The end time is no longer required: not in Templates (the box says "optional"), not when creating an event, and it can be removed
later in Studio > Basic Info > Date & Time > **Remove end time** > Save. With no end time the event page shows only the start time
("10:00 AM", not "10:00 AM – 6:00 PM"). Internally the end time is stored empty and `end_date` equals the start, so nothing that reads
it has to cope with a missing value. Calendar links in emails only use the start time (they assume a default length).

## "How many are left" meter and the link preview

- **On the event page** the Group of 3 shows a live meter (`stockMeter` in `src/app/[tag]/theme.ts`, rules in `src/lib/stockMeter.ts`):
  a bar for how much is gone plus a line that gets louder as stock runs down: "N of M groups left" -> "Going fast: only N groups left"
  (half gone) -> "Almost gone: only N groups left" (fewer than 10, or under 15%) -> "Last one". "N groups already claimed" appears from 5.
  The numbers are real (capacity minus completed purchases) and refresh every 20 seconds while the page is open. No capacity set, or sold
  out: no meter (a sold-out ticket is greyed out). The capacity you set on the ticket is the number it counts down from.
- **Link previews (WhatsApp, Facebook, X) are cached by those apps**, for hours to days, and none publishes an exact time. So the preview
  never shows a live number. It says "Group of 3 is 50% off while stock lasts." while a group ticket still has stock, and leaves that
  line out once they are sold out; our server works this out on every request, but an app only picks it up when it next re-reads the link.
  To force a fresh preview: Facebook's Sharing Debugger re-scrapes a link; for WhatsApp share the link with `?v=2` on the end (a new
  address gets a fresh preview).
