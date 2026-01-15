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

export type GlobalSection = "overview" | "builder" | "audience" | "logic" | "operations" | "settings";
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
    { id: "variables", label: "Guest Groups", icon: Target, description: "Automated logic for team colors/groups" },
];

export const GLOBAL_NAV = [
    { id: "overview", icon: Home, label: "Home" },
    { id: "builder", icon: Command, label: "Setup" },
    { id: "audience", icon: Users, label: "Guest List" },
    { id: "logic", icon: Zap, label: "Logic Flow" },
    { id: "operations", icon: Check, label: "Team & Check-in" },
    { id: "settings", icon: Settings, label: "Settings" },
];
