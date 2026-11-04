import type { EventTemplate } from "./types";
import { mainCharacterFest } from "./main-character-fest";

/** Templates offered on the dashboard. Add a new one by creating a file like main-character-fest.ts and listing it here. */
export const EVENT_TEMPLATES: EventTemplate[] = [mainCharacterFest];

export type { EventTemplate, TemplateInput, TemplateVariant, TemplatePass, TemplateQuestion } from "./types";
