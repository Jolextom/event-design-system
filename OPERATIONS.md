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
