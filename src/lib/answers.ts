/**
 * Required-question checking, shared by checkout (registration) and invite
 * completion so a guest who is invited answers EXACTLY the same questions with
 * the same rules as one who registers directly.
 *
 * A question can be tied to a "track" (show_for_option_id): it only applies to
 * a guest whose answer to the trigger question equals that option.
 */

export interface RuleQuestion {
    id: string;
    title: string;
    is_required?: boolean;
    is_selection_logic?: boolean;
    show_for_option_id?: string | null;
    options?: { id: string; option_text: string }[];
}

export type AnswerValue = string | string[] | number | undefined | null;

const isEmpty = (a: AnswerValue) => a === undefined || a === null || a === "" || (Array.isArray(a) && a.length === 0);

/** Does this question apply to a guest with these answers? (Questions tied to a track only show for that track.) */
export function isQuestionRelevant(questions: RuleQuestion[], q: RuleQuestion, answers: Record<string, AnswerValue>): boolean {
    if (!q.show_for_option_id) return true;
    for (const other of questions) {
        const opt = (other.options ?? []).find((o) => o.id === q.show_for_option_id);
        if (opt) return answers[other.id] === opt.option_text;
    }
    return false; // stale link: fail closed
}

/** Returns the first required question this guest hasn't answered, or null if they're complete. */
export function missingRequiredQuestion(questions: RuleQuestion[], answers: Record<string, AnswerValue>): RuleQuestion | null {
    const optionIndex = new Map<string, { questionId: string; text: string }>();
    for (const q of questions) for (const o of q.options ?? []) optionIndex.set(o.id, { questionId: q.id, text: o.option_text });

    const relevant = (q: RuleQuestion) => {
        if (!q.show_for_option_id) return true;
        const linked = optionIndex.get(q.show_for_option_id);
        if (!linked) return false; // stale link: fail closed, like the page's hidden behaviour
        return answers[linked.questionId] === linked.text;
    };

    for (const q of questions) {
        if (!q.is_required || q.is_selection_logic) continue;
        if (!relevant(q)) continue;
        if (isEmpty(answers[q.id])) return q;
    }
    return null;
}
