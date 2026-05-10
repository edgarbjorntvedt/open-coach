export type Locale = "en" | "no";

export interface I18nStrings {
  languageName: string;
  sessionTitlePrefix: string;
  transcriptHeader: string;
  summaryHeader: string;
  summaryTopicLabel: string;
  summaryInsightsLabel: string;
  summaryPatternsLabel: string;
  summaryActionItemsLabel: string;
  emptySummary: string;
  summaryErrorTemplate: (msg: string) => string;
  activeThemesHeader: string;
  prepHeader: string;
  recentSessionsHeader: string;
  defaultUserName: string;
  defaultUserLabel: string;
  coachLabel: string;
}

const EN: I18nStrings = {
  languageName: "English",
  sessionTitlePrefix: "Coach session",
  transcriptHeader: "## Full transcript",
  summaryHeader: "## Summary",
  summaryTopicLabel: "Topic",
  summaryInsightsLabel: "Insights",
  summaryPatternsLabel: "Patterns",
  summaryActionItemsLabel: "Action items",
  emptySummary: "*(Empty transcript — no summary.)*",
  summaryErrorTemplate: (m) => `*(Summary generation failed: ${m})*`,
  activeThemesHeader: "## Active themes",
  prepHeader: "## Prep for this session",
  recentSessionsHeader: "## Recent sessions",
  defaultUserName: "the user",
  defaultUserLabel: "You",
  coachLabel: "Coach",
};

const NO: I18nStrings = {
  languageName: "Norwegian",
  sessionTitlePrefix: "Coach-sesjon",
  transcriptHeader: "## Full transkripsjon",
  summaryHeader: "## Sammendrag",
  summaryTopicLabel: "Tema",
  summaryInsightsLabel: "Innsikter",
  summaryPatternsLabel: "Mønstre",
  summaryActionItemsLabel: "Action items",
  emptySummary: "*(Tom transkripsjon — ingen sammendrag.)*",
  summaryErrorTemplate: (m) => `*(Sammendrag-generering feilet: ${m})*`,
  activeThemesHeader: "## Aktive tema",
  prepHeader: "## Prep for denne sesjonen",
  recentSessionsHeader: "## Siste sesjoner",
  defaultUserName: "brukeren",
  defaultUserLabel: "Du",
  coachLabel: "Coach",
};

const STRINGS: Record<Locale, I18nStrings> = { en: EN, no: NO };

export function resolveLocale(raw: string | undefined): Locale {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return "en";
  if (v === "no" || v.startsWith("nb") || v.startsWith("nn") || v.startsWith("no-")) return "no";
  if (v === "en" || v.startsWith("en-") || v.startsWith("en_")) return "en";
  return "en";
}

export function getStrings(locale: Locale): I18nStrings {
  return STRINGS[locale] ?? EN;
}

export interface UserIdentity {
  promptName: string;
  transcriptLabel: string;
}

export function resolveUserIdentity(raw: string | undefined, strings: I18nStrings): UserIdentity {
  const trimmed = raw?.trim();
  if (trimmed) {
    return { promptName: trimmed, transcriptLabel: trimmed };
  }
  return { promptName: strings.defaultUserName, transcriptLabel: strings.defaultUserLabel };
}
