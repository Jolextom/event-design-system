// Event type for event details
export interface Event {
  id: string;
  event_title: string;
  description: string;
  image?: string | null;
  is_published: boolean;
  start_date: string | null;
  end_date?: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string;
  event_format?: 'physical' | 'virtual' | 'hybrid';
  virtual_link?: string | null;
  virtual_platform?: string | null;
  has_passes: boolean;
  custom_questions_completed: boolean;
  created_by: string;
  tag?: string | null;
  image_focus_y?: number;
}

// Pass (ticket) type for event passes
export type PassType = 'individual' | 'group';

export interface Pass {
  id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  price: number | null;
  is_free: boolean;
  max_per_person: number | null;
  min_per_person: number | null;
  quantity_available: number;
  type: PassType;
  group_size: number | null;
  quantity_sold: number | null;
  sales_volume: number | null;
  organiser_fees_volume: number | null;
  is_hidden: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  display_order: number | null;
  show_for_option_id: string | null;
}

// Payload for creating a new pass
export interface CreatePassPayload {
  event_id: string;
  title: string;
  description?: string;
  price: number;
  is_free: boolean;
  type: PassType;
  quantity_available: number;
  max_per_person?: number;
  group_size?: number;
}

// Registration Form Question types
export type QuestionType =
  | 'text'          // short answer (registration + forms)
  | 'select'        // single choice, radio/dropdown-styled (registration + forms)
  | 'checkbox'      // multi-select (forms only)
  | 'dropdown'      // single choice, native <select> (forms only)
  | 'linear_scale'  // numeric scale, e.g. 1-5 (forms only)
  | 'star_rating'   // star rating, e.g. 1-5 stars (forms only)
  | 'long_text';    // paragraph answer (forms only)

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  display_order: number;
  created_at?: string;
}

// Conditional page-routing rule attached to a question, evaluated on submit.
// e.g. { if_equals: "Option A", go_to_page: 2 }
export interface QuestionLogicRule {
  if_equals: string;
  go_to_page: number;
}

export interface Question {
  id: string;
  event_id: string | null;       // null for standalone campaign questions
  campaign_id?: string | null;   // set for campaign/form questions
  title: string;
  question_type: QuestionType;
  is_required: boolean;
  question_order: number;
  is_selection_logic?: boolean;
  page?: number;                 // 1-indexed page/section within the form
  logic_rules?: QuestionLogicRule[] | null;
  property_key?: string | null;  // maps answer -> attendees.properties[property_key]
  created_at?: string;
  options?: QuestionOption[]; // Joined data
}

export interface CreateQuestionPayload {
  event_id?: string;
  campaign_id?: string;
  title: string;
  question_type: QuestionType;
  is_required: boolean;
  question_order: number;
  page?: number;
  logic_rules?: QuestionLogicRule[];
  property_key?: string;
}

export interface CreateQuestionOptionPayload {
  question_id: string;
  option_text: string;
  display_order: number;
}

// ── Campaigns (dual mode: event-linked or standalone) ──────────────────────
export type CampaignType = 'event' | 'standalone';
export type CampaignTrigger = 'pre_registration' | 'post_event' | 'manual';
export type CampaignStatus = 'draft' | 'active' | 'closed';

export interface Campaign {
  id: string;
  event_id: string | null;
  type: CampaignType;
  trigger: CampaignTrigger | null;
  name: string;
  status: CampaignStatus;
  created_by?: string | null;
  created_at?: string;
}

export interface FormResponse {
  id: string;
  campaign_id: string;
  attendee_id: string | null;
  email: string | null;
  submitted_at: string;
}

export interface FormAnswer {
  id: string;
  response_id: string;
  question_id: string;
  value: string | string[] | number;
  created_at?: string;
}
import { LucideIcon } from "lucide-react";
import {
  Activity,
  MessageSquare,
  Ticket,
  Target,
  Home,
  Command,
  Users,
  Zap,
  Check,
  Settings,
  ClipboardList,
} from "lucide-react";

export type GlobalSection =
  | "command"
  | "studio"
  | "registry"
  | "automations"
  | "campaigns"
  | "broadcast"
  | "live"
  | "settings";
export type CategoryId =
  | "essentials"
  | "registration"
  | "ticketing"
  | "variables";

export interface Category {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
}

export const BUILDER_CATEGORIES: Category[] = [
  {
    id: "essentials",
    label: "Basic Info",
    icon: Activity,
    description: "Title, description, and location",
  },
  {
    id: "ticketing",
    label: "Ticket Types",
    icon: Ticket,
    description: "Pricing and availability",
  },
  {
    id: "registration",
    label: "Signup Form",
    icon: MessageSquare,
    description: "Questions for your guests",
  },
  {
    id: "variables",
    label: "Smart Segments",
    icon: Target,
    description: "Variable definitions for automated logic",
  },
];

export const GLOBAL_NAV = [
  { id: "command", icon: Home, label: "Dashboard" },
  { id: "studio", icon: Command, label: "Studio" },
  { id: "registry", icon: Users, label: "Guests" },
  { id: "automations", icon: Zap, label: "Automations" },
  { id: "campaigns", icon: ClipboardList, label: "Campaigns" },
  { id: "broadcast", icon: MessageSquare, label: "Communications" },
  { id: "live", icon: Check, label: "Event Day" },
  { id: "settings", icon: Settings, label: "Settings" },
];

// Guest/Attendee interface based on the attendees table
export interface Attendee {
  id: string;
  event_id: string | null;
  order_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  ref: string;
  created_at: string | null;
  check_in: boolean | null;
  check_in_time: string | null;
  email_status: string | null;
  last_email_sent: string | null;
  team_id: string | null;
  pass_id: string | null;
  checked_in_by_staff_id: string | null;
  checked_in_by: string | null;
  responses?: Record<string, string>;
  properties?: Record<string, any>; // Dynamic variables
  order?: {
    email: string;
  };
}

export interface Staff {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  role: string;
  access_code: string;
  status: 'online' | 'offline';
  current_station: string | null;
  last_active: string | null;
  created_at: string;
}

// Smart Segment Logic
export interface Group {
  id: string;
  name: string;
  rule: string;
  count: number;
  color: string;
  type: string;
  options?: BreakdownOption[];
  rules_config?: any;
}

export interface BreakdownOption {
  label: string;
  count: number;
  pct: number;
  color: string;
  guests: Guest[];
}

export interface Guest {
  name: string;
  email: string;
  status: string;
  avatar: string;
}

export interface EventVariable {
  id: string;
  event_id: string;
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean' | 'date';
  options?: string[]; // For select type
  settings?: {
    method?: 'manual' | 'random_equal' | 'random_pure';
  };
}
