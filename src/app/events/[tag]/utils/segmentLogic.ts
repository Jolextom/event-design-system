import { Attendee } from "../types";

// Types matching the modal configuration
export type ConditionOperator = "equals" | "not_equals" | "contains" | "starts_with" | "is_set" | "is_not_set";
export type LogicOperator = "AND" | "OR";

export interface Condition {
    id: string;
    field: string;
    operator: ConditionOperator;
    value: string;
}

export interface RuleConfig {
    logicType: LogicOperator;
    conditions: Condition[];
}

/**
 * The Brain: Evaluates if a guest matches a set of rules.
 */
export function evaluateSegment(guest: Attendee, config: RuleConfig | undefined): boolean {
    if (!config || !config.conditions || config.conditions.length === 0) {
        return false; // No rules, no match? Or match all? Usually manual segments have no rules.
    }

    // Evaluator function for a single condition
    const matchesCondition = (condition: Condition): boolean => {
        // Resolve value from guest object
        let guestValue: any = "";

        // Core Fields
        if (condition.field === "status") guestValue = guest.check_in ? "Checked In" : "Registered"; // Simplified mapping
        else if (condition.field === "email") guestValue = guest.email;
        else if (condition.field === "first_name") guestValue = guest.first_name;
        else if (condition.field === "last_name") guestValue = guest.last_name;
        else if (condition.field === "checked_in") guestValue = guest.check_in ? "true" : "false";
        // else if (condition.field === "ticket_type") ... need pass name lookup ideally, or pass ID

        // Custom Properties (Variables)
        // If the field isn't a core field, check properties
        else {
            guestValue = guest.properties?.[condition.field] ?? "";
        }

        // Normalize to string for comparison (unless boolean logic is strictly needed)
        const strValue = String(guestValue).toLowerCase();
        const targetValue = condition.value.toLowerCase();

        switch (condition.operator) {
            case "equals":
                return strValue === targetValue;
            case "not_equals":
                return strValue !== targetValue;
            case "contains":
                return strValue.includes(targetValue);
            case "starts_with":
                return strValue.startsWith(targetValue);
            case "is_set":
                return guestValue !== "" && guestValue !== null && guestValue !== undefined;
            case "is_not_set":
                return guestValue === "" || guestValue === null || guestValue === undefined;
            default:
                return false;
        }
    };

    // Combine results based on Logic Type
    if (config.logicType === "AND") {
        return config.conditions.every(matchesCondition);
    } else {
        return config.conditions.some(matchesCondition);
    }
}
