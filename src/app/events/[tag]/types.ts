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
  type: string;
  quantity_sold: number | null;
  sales_volume: number | null;
  organiser_fees_volume: number | null;
  is_paused: boolean | null;
  is_hidden: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  display_order: number | null;
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
    id: "registration",
    label: "Signup Form",
    icon: MessageSquare,
    description: "Questions for your guests",
    badge: "Live",
  },
  {
    id: "ticketing",
    label: "Ticket Types",
    icon: Ticket,
    description: "Pricing and availability",
  },
  {
    id: "variables",
    label: "Smart Segments",
    icon: Target,
    description: "Variable definitions for automated logic",
  },
];

export const GLOBAL_NAV = [
  { id: "command", icon: Home, label: "Command" },
  { id: "studio", icon: Command, label: "Studio" },
  { id: "registry", icon: Users, label: "Registry" },
  { id: "automations", icon: Zap, label: "Automations" },
  { id: "broadcast", icon: MessageSquare, label: "Broadcast" },
  { id: "live", icon: Check, label: "Live Ops" },
  { id: "settings", icon: Settings, label: "Settings" },
];
