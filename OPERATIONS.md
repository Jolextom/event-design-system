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
