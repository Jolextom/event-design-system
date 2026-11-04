/**
 * Event templates: a ready-made event (details, registration form, tickets,
 * deadlines) that a logged-in organiser can create with one click from the
 * dashboard. The event is created AS the logged-in user, so it appears in their
 * own dashboard exactly like an event they made by hand.
 */

export type TemplateQuestionType = "text" | "long_text" | "select" | "dropdown" | "checkbox" | "linear_scale" | "star_rating";

export interface TemplateQuestion {
    page: number;
    title: string;
    type: TemplateQuestionType;
    required?: boolean;
    options?: string[];
    property_key?: string;
}

/** A value the organiser fills in when creating from the template. */
export interface TemplateInput {
    key: string;
    label: string;
    type: "number" | "time" | "datetime";
    /** Pre-filled value (datetime: "YYYY-MM-DDTHH:mm", Lagos time). */
    defaultValue?: string | number;
    required?: boolean;
    hint?: string;
}

export interface TemplatePass {
    title: string;
    description?: string;
    /** Naira. 0 = free. */
    price: number;
    type: "individual" | "group";
    groupSize?: number;
    /** A fixed number, or the key of a TemplateInput that holds it. */
    quantity: number | { input: string };
    /** Key of a datetime TemplateInput: when sales of this ticket stop. */
    salesEndInput?: string;
}

export interface TemplateVariant {
    id: string;
    label: string;
    hint: string;
    /** Appended to the event title, e.g. " (TEST)". */
    titleSuffix?: string;
    inputs: TemplateInput[];
    passes: TemplatePass[];
    /** Key of a datetime input: when registration for the whole event closes. */
    registrationClosesInput?: string;
}

export interface EventTemplate {
    id: string;
    name: string;
    summary: string;
    title: string;
    /** YYYY-MM-DD */
    date: string;
    startTime: string; // HH:mm
    /** Timezone offset all template times are written in, e.g. "+01:00" for Lagos. */
    tzOffset: string;
    location: string;
    description: string; // HTML
    /** Path under /public to a cover image (made absolute with the site's own origin). */
    coverPath?: string;
    /** Inputs every variant needs (e.g. the event's end time). */
    inputs: TemplateInput[];
    questions: TemplateQuestion[];
    variants: TemplateVariant[];
}
