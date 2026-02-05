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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for variables
ALTER TABLE public.event_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on variables" 
ON public.event_variables FOR ALL TO authenticated USING (true) WITH CHECK (true);

