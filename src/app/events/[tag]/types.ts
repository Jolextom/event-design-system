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
  has_passes: boolean;
  custom_questions_completed: boolean;
  created_by: string;
  tag?: string | null;
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
  is_paused: boolean | null;
  is_hidden: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  display_order: number | null;
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
export type QuestionType = 'text' | 'select';

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  display_order: number;
  created_at?: string;
}

export interface Question {
  id: string;
  event_id: string;
  title: string;
  question_type: QuestionType;
  is_required: boolean;
  question_order: number;
  created_at?: string;
  options?: QuestionOption[]; // Joined data
}

export interface CreateQuestionPayload {
  event_id: string;
  title: string;
  question_type: QuestionType;
  is_required: boolean;
  question_order: number;
}

export interface CreateQuestionOptionPayload {
  question_id: string;
  option_text: string;
  display_order: number;
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
} from "lucide-react";

export type GlobalSection =
  | "command"
  | "studio"
  | "registry"
  | "automations"
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
  { id: "broadcast", icon: MessageSquare, label: "Communications" },
  { id: "live", icon: Check, label: "Live Ops" },
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
  checked_in_by_staff_id: string | null;
  checked_in_by: string | null;
  responses?: Record<string, string>;
}
