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
    Settings
} from "lucide-react";

export type GlobalSection = "command" | "studio" | "registry" | "automations" | "broadcast" | "live" | "settings";
export type CategoryId = "essentials" | "registration" | "ticketing" | "variables";

export interface Category {
    id: CategoryId;
    label: string;
    icon: LucideIcon;
    description: string;
    badge?: string;
}

export const BUILDER_CATEGORIES: Category[] = [
    { id: "essentials", label: "Basic Info", icon: Activity, description: "Title, description, and location" },
    { id: "registration", label: "Signup Form", icon: MessageSquare, description: "Questions for your guests", badge: "Live" },
    { id: "ticketing", label: "Ticket Types", icon: Ticket, description: "Pricing and availability" },
    { id: "variables", label: "Smart Segments", icon: Target, description: "Variable definitions for automated logic" },
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
