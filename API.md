# EventFlow Public API v1

Headless JSON API for embedding events and surveys into external sites
(e.g. the Kini AI website). The external site renders its own UI; all
logic (orders, attendees, payment, emails, response storage) stays here.

Base URL: `https://<your-deployment>` (e.g. `https://festivo001.vercel.app`)

## CORS

Allowed origins are controlled by the `API_ALLOWED_ORIGINS` environment
variable (comma-separated list, e.g. `https://kini-ai.com,https://www.kini-ai.com`).
Default is `*` (any origin). All endpoints answer `OPTIONS` preflights.

---

## GET /api/v1/events

Lists published events, newest start date first.

```json
{
  "events": [
    {
      "id": "uuid",
      "title": "Young Professionals' Hangout '24",
      "tag": "young-professionals-hangout-24-x7fq",
      "description": "<p>HTML description</p>",
      "image": "https://.../cover.jpg",
      "image_focus_y": 50,
      "start_date": "2024-12-21T18:00:00+00:00",
      "end_date": null,
      "start_time": "18:00:00",
      "end_time": "22:00:00",
      "location": "DeeMav Exclusive Lounge, Ikeja",
      "format": "physical",
      "virtual_platform": null
    }
  ]
}
```

## GET /api/v1/events/{tag}

Full detail for one published event: the event, its visible ticket types,
and its registration questions. 404 if unknown or unpublished.

```json
{
  "event": { /* same shape as list entries */ },
  "passes": [
    {
      "id": "uuid",
      "title": "General Admission",
      "description": "Standard entry",
      "price": 5000,
      "is_free": false,
      "type": "individual",            // or "group"
      "group_size": null,
      "quantity_available": 100,
      "quantity_sold": 12,
      "sold_out": false,
      "show_for_option_id": null        // selection-logic: only show this pass when that option id was chosen
    }
  ],
  "questions": [
    {
      "id": "uuid",
      "title": "What is your t-shirt size?",
      "type": "select",                 // text | long_text | select | dropdown | checkbox | linear_scale | star_rating
      "required": true,
      "order": 0,
      "page": 1,
      "is_selection_logic": false,      // true = asked BEFORE tickets, gates which passes show
      "options": [ { "id": "uuid", "text": "Medium" } ],
      "scale": null,                    // for scales: { "min": 1, "max": 5, "min_label": "...", "max_label": "..." }
      "logic": null                     // for campaigns; unused in event registration
    }
  ]
}
```

Selection-logic flow: show questions with `is_selection_logic: true` first;
when the visitor picks an option, only display passes whose
`show_for_option_id` is null or matches the chosen option's id.

## POST /api/v1/events/{tag}/register

Registers guests for an event. Mirrors the hosted page's validation
(duplicate emails, already-registered, required answers, availability).

Request:
```json
{
  "pass_id": "uuid",
  "guests": [
    {
      "firstName": "Joseph",
      "lastName": "Farinloye",
      "email": "joseph@example.com",
      "answers": { "<question_id>": "Medium" }
    },
    { "email": "friend@example.com", "isInvite": true }
  ],
  "callback_url": "https://kini-ai.com/events/thanks"   // optional; where Paystack returns after payment
}
```

Free pass response (attendees created + confirmation emails sent immediately):
```json
{ "status": "registered", "order_ref": "EF-TAG-ABC123XYZ0" }
```

Paid pass response — redirect the visitor to `authorization_url`; fulfillment
happens automatically via the Paystack webhook after payment:
```json
{
  "status": "payment_required",
  "order_ref": "EF-TAG-ABC123XYZ0",
  "authorization_url": "https://checkout.paystack.com/..."
}
```

Errors: `400` (validation), `403` (unpublished), `404` (unknown event/pass),
`409` (already registered / sold out), `500`/`502` — all as `{ "error": "message" }`.

## GET /api/v1/campaigns/{id}

One ACTIVE campaign (survey/form) with everything needed to render it.
Drafts/closed campaigns return 404.

```json
{
  "campaign": { "id": "uuid", "name": "Post-Event Feedback", "type": "event", "trigger": "post_event", "event_id": "uuid" },
  "page_count": 3,
  "questions": [
    {
      "id": "uuid",
      "title": "How satisfied were you?",
      "type": "star_rating",
      "required": true,
      "order": 0,
      "page": 1,
      "options": [],
      "scale": { "min": 1, "max": 5 },
      "logic": [ { "if_equals": "No", "go_to_page": 3 } ]
    }
  ]
}
```

Rendering multi-page logic: group questions by `page`. On "Next", check each
answered question's `logic` — first rule whose `if_equals` matches the answer
(the literal `"*"` matches ANY answer) wins, and `go_to_page` is the next page.
A `go_to_page` greater than `page_count` means "submit now".
For a correct Back button, keep a history stack of visited pages.

## POST /api/v1/campaigns/{id}/submit

Submits a response to an active campaign.

Request:
```json
{
  "attendeeId": "uuid",              // optional; links the response to a Registry profile (enables property sync + Smart Groups)
  "email": "someone@example.com",    // optional; for anonymous respondents
  "answers": {
    "<question_id>": "Yes",          // select/dropdown/text/long_text: string
    "<question_id>": ["A", "B"],     // checkbox: string[]
    "<question_id>": 4               // linear_scale/star_rating: number
  }
}
```

Response: `{ "success": true, "responseId": "uuid" }`
Errors: `400` (no answers), `403` (not accepting responses), `404`, `500`.

---

## Custom sender domains (campaign/broadcast emails "from" your own domain)

Managed in-app at `/settings/senders`: add a domain → we register it with
Resend and show the DNS records (SPF/DKIM) to add at the domain host →
Verify → once verified, the identity appears as a "Send From" option in
Broadcasts and campaign sends. Unverified identities always fall back to
the platform default sender — mail never goes out through an unverified
domain.

## Environment variables (deployment)

| Var | Purpose |
|---|---|
| `API_ALLOWED_ORIGINS` | Comma-separated origins allowed to call the v1 API (default `*`) |
| `RESEND_API_KEY` | Required for email + sender-domain verification |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for API routes and admin actions |
| `NEXT_PUBLIC_SITE_URL` | Public base URL used in emailed links |
| `PAYSTACK_SECRET_KEY` | Required for paid registrations |
