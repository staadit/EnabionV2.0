export const INTENT_STAGES = ['NEW', 'CLARIFY', 'MATCH', 'COMMIT', 'WON', 'LOST'] as const;
export type IntentStage = (typeof INTENT_STAGES)[number];

export const INTENT_SOURCES = ['manual', 'paste', 'email'] as const;
export type IntentSource = (typeof INTENT_SOURCES)[number];
