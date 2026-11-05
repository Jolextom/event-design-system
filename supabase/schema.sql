-- Create a table for Smart Segments
-- This table stores the definitions of your dynamic groups.

CREATE TABLE IF NOT EXISTS public.smart_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL, -- Assuming you have an 'events' table, add REFERENCES public.events(id) if confirmed
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('manual', 'auto-segment', 'breakdown', 'automation')),
    rule TEXT, -- Human readable rule summary like "status = Checked In"
    rules_config JSONB, -- The structural logic: { logicType: 'AND', conditions: [...] }
    color TEXT DEFAULT 'bg-blue-100 text-blue-700',
    count INTEGER DEFAULT 0, -- Cached count of matching guests
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.smart_segments ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to read/write segments
-- (Adjust this policy based on your actual permissions model, e.g., checking event ownership)
CREATE POLICY "Enable all access for authenticated users" 
ON public.smart_segments 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Optional: If you want to support Manual assignments (e.g. dragging a user into a group)
CREATE TABLE IF NOT EXISTS public.smart_segment_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    segment_id UUID REFERENCES public.smart_segments(id) ON DELETE CASCADE,
    attendee_id UUID NOT NULL, -- References your attendees table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(segment_id, attendee_id)
);

-- Index for faster lookups by event
CREATE INDEX IF NOT EXISTS idx_smart_segments_event_id ON public.smart_segments(event_id);

-- Add properties column to attendees for dynamic variables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendees' AND column_name = 'properties') THEN
        ALTER TABLE public.attendees ADD COLUMN properties JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create a table for Event Variable Definitions
-- This defines what variables exist for an event (e.g. "Team Color", "T-Shirt Size")
CREATE TABLE IF NOT EXISTS public.event_variables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'select', 'number', 'boolean', 'date')),
    options JSONB, -- For 'select' type: ["Red", "Blue"]
    settings JSONB DEFAULT '{}'::jsonb, -- Configuration for assignment logic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for variables
ALTER TABLE public.event_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on variables"
ON public.event_variables FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================================
-- Campaigns, extended question types, and standalone/post-event form responses
-- ============================================================================
-- This section adds:
--   1. campaigns: wraps a form as either an event-linked or standalone campaign
--   2. New columns on the existing `questions` table (campaign_id, page,
--      logic_rules, property_key) plus widened question_type support, so the
--      SAME question model used for registration questions can also power
--      campaign forms. Existing event-scoped registration questions are
--      untouched — event_id becomes nullable but existing rows are unaffected.
--   3. form_responses / form_answers: submission storage for campaign forms
--      (registration questions keep using the existing `answers` table —
--      this is additive, not a replacement).
--   4. A trigger that bridges any answered question with a property_key onto
--      attendees.properties, so Smart Group rules (which only read
--      properties) automatically pick up survey/form answers.
-- ============================================================================

-- 1. Campaigns -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE, -- NULL for standalone campaigns
    type TEXT NOT NULL CHECK (type IN ('event', 'standalone')),
    trigger TEXT CHECK (trigger IN ('pre_registration', 'post_event', 'manual') OR trigger IS NULL),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on campaigns"
ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_campaigns_event_id ON public.campaigns(event_id);

-- 2. Extend `questions` for campaign use ----------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'campaign_id') THEN
        ALTER TABLE public.questions ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'page') THEN
        ALTER TABLE public.questions ADD COLUMN page INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'logic_rules') THEN
        -- e.g. [{ "if_equals": "Option A", "go_to_page": 2 }]
        ALTER TABLE public.questions ADD COLUMN logic_rules JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'property_key') THEN
        -- When set, answers to this question are mirrored onto attendees.properties[property_key]
        ALTER TABLE public.questions ADD COLUMN property_key TEXT;
    END IF;
END $$;

-- event_id must become nullable so standalone/post-event campaign questions
-- (which have campaign_id but no event) can exist. Existing rows are untouched.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = 'event_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.questions ALTER COLUMN event_id DROP NOT NULL;
    END IF;
END $$;

-- Widen question_type to support the new form field types, regardless of
-- what the existing CHECK constraint (if any) was named.
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attname = 'question_type'
    WHERE rel.relname = 'questions'
      AND con.contype = 'c'
      AND con.conkey @> ARRAY[att.attnum];

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.questions DROP CONSTRAINT %I', constraint_name);
    END IF;

    ALTER TABLE public.questions ADD CONSTRAINT questions_question_type_check
        CHECK (question_type IN ('text', 'select', 'checkbox', 'dropdown', 'linear_scale', 'star_rating', 'long_text'));
END $$;

CREATE INDEX IF NOT EXISTS idx_questions_campaign_id ON public.questions(campaign_id);

-- 3. Campaign form submissions --------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL, -- NULL for anonymous/standalone respondents
    email TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.form_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID NOT NULL REFERENCES public.form_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    value JSONB NOT NULL, -- string, string[] (checkboxes), or number depending on question type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_answers ENABLE ROW LEVEL SECURITY;

-- Public respondents can submit; only authenticated (event organizers) can read.
CREATE POLICY "Public can submit form responses"
ON public.form_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read form responses"
ON public.form_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can delete form responses"
ON public.form_responses FOR DELETE TO authenticated USING (true);

CREATE POLICY "Public can submit form answers"
ON public.form_answers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read form answers"
ON public.form_answers FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_form_responses_campaign_id ON public.form_responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_form_answers_response_id ON public.form_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_form_answers_question_id ON public.form_answers(question_id);

-- 4. Bridge: answered questions with a property_key mirror onto
--    attendees.properties, so Smart Group rules pick them up automatically.
CREATE OR REPLACE FUNCTION public.sync_answer_to_attendee_property()
RETURNS TRIGGER AS $$
DECLARE
    target_attendee_id UUID;
    target_property_key TEXT;
    answer_value JSONB;
BEGIN
    -- Resolve the question's property_key (skip entirely if not mapped)
    SELECT property_key INTO target_property_key
    FROM public.questions WHERE id = NEW.question_id;

    IF target_property_key IS NULL OR target_property_key = '' THEN
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'answers' THEN
        target_attendee_id := NEW.attendee_id;
        answer_value := to_jsonb(NEW.answer_text);
    ELSIF TG_TABLE_NAME = 'form_answers' THEN
        SELECT attendee_id INTO target_attendee_id
        FROM public.form_responses WHERE id = NEW.response_id;
        answer_value := NEW.value;
    END IF;

    IF target_attendee_id IS NOT NULL THEN
        UPDATE public.attendees
        SET properties = COALESCE(properties, '{}'::jsonb) || jsonb_build_object(target_property_key, answer_value)
        WHERE id = target_attendee_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_answer_to_property ON public.answers;
CREATE TRIGGER trg_sync_answer_to_property
    AFTER INSERT OR UPDATE ON public.answers
    FOR EACH ROW EXECUTE FUNCTION public.sync_answer_to_attendee_property();

DROP TRIGGER IF EXISTS trg_sync_form_answer_to_property ON public.form_answers;
CREATE TRIGGER trg_sync_form_answer_to_property
    AFTER INSERT ON public.form_answers
    FOR EACH ROW EXECUTE FUNCTION public.sync_answer_to_attendee_property();


-- ============================================================================
-- Configurable scale ranges for linear_scale / star_rating questions
-- ============================================================================
-- Previously hardcoded to a fixed 1-5 range everywhere (builder, public form,
-- analytics). scale_config lets each question define its own range and
-- optional endpoint labels, e.g. {"min":1,"max":5,"min_label":"Never reliable",
-- "max_label":"Always reliable"} or {"min":1,"max":10}. NULL means "use the
-- default 1-5" for backward compatibility with existing questions.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'scale_config') THEN
        ALTER TABLE public.questions ADD COLUMN scale_config JSONB;
    END IF;
END $$;


-- ============================================================================
-- Custom sender identities (send campaign/broadcast emails from own domains)
-- ============================================================================
-- Each row is a sending domain registered with Resend. The owner adds the
-- DNS records we surface (from Resend's domain API), then verifies. Only
-- identities with status='verified' may be used as a From address.
CREATE TABLE IF NOT EXISTS public.sender_identities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    domain TEXT NOT NULL,
    from_name TEXT NOT NULL DEFAULT 'EventFlow',
    from_email TEXT NOT NULL,               -- e.g. surveys@theirbrand.com
    resend_domain_id TEXT,                  -- Resend's id for the domain
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
    dns_records JSONB,                      -- records the owner must add (from Resend)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, domain)
);

ALTER TABLE public.sender_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own sender identities"
ON public.sender_identities FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Staff table (check-in desk access codes and door staff management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Staff',
    access_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'offline',
    current_station TEXT,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, access_code)
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for staff" ON public.staff
FOR ALL USING (true) WITH CHECK (true);



-- ============================================================================
-- Checkout: sale windows, registration deadline, fees and split payments
-- ============================================================================
-- Additive and idempotent: every column is nullable, and NULL means "behave
-- exactly as before" (no deadline, no fee, no split). Safe to run on a live DB.
--
--   passes.sales_start_at / sales_end_at   per-ticket sale window (e.g. a promo
--                                          ticket that ends 30 Nov 11:55pm)
--   events.registration_closes_at          after this, nobody can register
--   events.paystack_subaccount_code        organiser's Paystack subaccount
--                                          (ACCT_xxx). When set, paid checkouts
--                                          are split: organiser gets the ticket
--                                          price, the platform keeps the fee.
--   events.fee_config                      see src/lib/fees.ts, e.g.
--                                          {"enabled":true,"pass_processing_fee":true,
--                                           "platform_fee":{"flat":500,"percent":0},
--                                           "round_to":50,"label":"Service fee"}
--   orders_table.fee_amount                service fee (naira) included in the
--                                          order's total, for reporting
ALTER TABLE public.passes       ADD COLUMN IF NOT EXISTS sales_start_at           TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.passes       ADD COLUMN IF NOT EXISTS sales_end_at             TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.events       ADD COLUMN IF NOT EXISTS registration_closes_at   TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.events       ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT;
ALTER TABLE public.events       ADD COLUMN IF NOT EXISTS fee_config               JSONB;
ALTER TABLE public.orders_table ADD COLUMN IF NOT EXISTS fee_amount               NUMERIC;

-- Older databases may predate group tickets: make sure the ticket columns the
-- checkout and the dashboard templates rely on exist (no-ops if they already do).
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS type           TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS group_size     INTEGER;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS max_per_person INTEGER;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS display_order  INTEGER;

-- Make the API see the new columns immediately.
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Event images (cover photos uploaded from an event's Basic Info page)
-- Run once in the Supabase SQL editor. Without it, uploading fails with "Bucket not found".
--   * a PUBLIC bucket called event-images (so the cover shows on the event page and in link previews)
--   * 10 MB limit, image types only
--   * a logged-in organiser can add / replace / delete files ONLY inside their own folder
--     (the app saves to  <user id>/<event id>/image_....), and nobody can list the bucket.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "event-images: organisers add to their own folder" on storage.objects;
create policy "event-images: organisers add to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'event-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "event-images: organisers replace in their own folder" on storage.objects;
create policy "event-images: organisers replace in their own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'event-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'event-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "event-images: organisers delete from their own folder" on storage.objects;
create policy "event-images: organisers delete from their own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'event-images' and (storage.foldername(name))[1] = auth.uid()::text);
