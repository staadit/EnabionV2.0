export type AdminLanguage = 'EN' | 'PL' | 'DE' | 'NL';

export type AdminLabels = {
  settingsTitle: string;
  navHome: string;
  signOut: string;
  navOrg: string;
  navMembers: string;
  navPreferences: string;
  navNda: string;
  navAvatar: string;
  orgTitle: string;
  orgNameLabel: string;
  orgSlugLabel: string;
  orgSlugHint: string;
  orgInboundLabel: string;
  orgProviderTitle: string;
  orgProviderLanguagesLabel: string;
  orgProviderRegionsLabel: string;
  orgProviderTagsLabel: string;
  orgProviderBudgetLabel: string;
  orgProviderTeamSizeLabel: string;
  orgProviderTagsHint: string;
  orgProviderRegionsHint: string;
  orgSave: string;
  orgSaved: string;
  membersTitle: string;
  membersEmail: string;
  membersRole: string;
  membersStatus: string;
  membersActions: string;
  membersActive: string;
  membersDeactivated: string;
  membersDeactivate: string;
  membersDeactivateConfirm: string;
  membersLastOwner: string;
  membersAdd: string;
  membersAddSubmit: string;
  membersAddCancel: string;
  membersAddSuccess: string;
  membersResetLink: string;
  preferencesTitle: string;
  preferencesLanguageLabel: string;
  preferencesAiLabel: string;
  preferencesShareLabel: string;
  preferencesEmailLabel: string;
  preferencesSave: string;
  commonSaving: string;
  commonErrorPrefix: string;
  commonRequestFailed: string;
};

const LABELS: Record<AdminLanguage, AdminLabels> = {
  EN: {
    settingsTitle: 'Settings',
    navHome: 'Home',
    signOut: 'Sign out',
    navOrg: 'Organization',
    navMembers: 'Members',
    navPreferences: 'Preferences',
    navNda: 'NDA',
    navAvatar: 'Avatar profile',
    orgTitle: 'Organization profile',
    orgNameLabel: 'Org name',
    orgSlugLabel: 'Org slug',
    orgSlugHint: '3-6 chars, lowercase letters/numbers; optional -01 suffix.',
    orgInboundLabel: 'Inbound email',
    orgProviderTitle: 'Provider profile (Matching)',
    orgProviderLanguagesLabel: 'Provider languages',
    orgProviderRegionsLabel: 'Provider regions',
    orgProviderTagsLabel: 'Provider tags',
    orgProviderBudgetLabel: 'Budget bucket',
    orgProviderTeamSizeLabel: 'Team size',
    orgProviderTagsHint: 'Comma-separated, e.g. ai, cybersecurity, fintech.',
    orgProviderRegionsHint: 'Comma-separated, e.g. PL, DE, NL.',
    orgSave: 'Save changes',
    orgSaved: 'Saved.',
    membersTitle: 'Members and roles',
    membersEmail: 'Email',
    membersRole: 'Role',
    membersStatus: 'Status',
    membersActions: 'Actions',
    membersActive: 'Active',
    membersDeactivated: 'Deactivated',
    membersDeactivate: 'Deactivate',
    membersDeactivateConfirm: 'Deactivate this member?',
    membersLastOwner: 'Last Owner guardrail.',
    membersAdd: 'Add member',
    membersAddSubmit: 'Send invite',
    membersAddCancel: 'Cancel',
    membersAddSuccess: 'Member added.',
    membersResetLink: 'Reset link',
    preferencesTitle: 'Org preferences',
    preferencesLanguageLabel: 'Default language',
    preferencesAiLabel: 'Enable AI features',
    preferencesShareLabel: 'Enable share links',
    preferencesEmailLabel: 'Enable inbound email ingest',
    preferencesSave: 'Save preferences',
    commonSaving: 'Saving...',
    commonErrorPrefix: 'Error:',
    commonRequestFailed: 'Request failed.',
  },
  PL: {
    settingsTitle: 'Ustawienia',
    navHome: 'Start',
    signOut: 'Wyloguj',
    navOrg: 'Organizacja',
    navMembers: 'Czlonkowie',
    navPreferences: 'Preferencje',
    navNda: 'NDA',
    navAvatar: 'Profil Avatara',
    orgTitle: 'Profil organizacji',
    orgNameLabel: 'Nazwa organizacji',
    orgSlugLabel: 'Slug organizacji',
    orgSlugHint: '3-6 znakow, male litery/cyfry; opcjonalny sufiks -01.',
    orgInboundLabel: 'Adres inbound email',
    orgProviderTitle: 'Profil dostawcy (Matching)',
    orgProviderLanguagesLabel: 'Jezyki dostawcy',
    orgProviderRegionsLabel: 'Regiony dostawcy',
    orgProviderTagsLabel: 'Tagi dostawcy',
    orgProviderBudgetLabel: 'Budzet',
    orgProviderTeamSizeLabel: 'Wielkosc zespolu',
    orgProviderTagsHint: 'Po przecinku, np. ai, cybersecurity, fintech.',
    orgProviderRegionsHint: 'Po przecinku, np. PL, DE, NL.',
    orgSave: 'Zapisz zmiany',
    orgSaved: 'Zapisano.',
    membersTitle: 'Czlonkowie i role',
    membersEmail: 'Email',
    membersRole: 'Rola',
    membersStatus: 'Status',
    membersActions: 'Akcje',
    membersActive: 'Aktywny',
    membersDeactivated: 'Dezaktywowany',
    membersDeactivate: 'Dezaktywuj',
    membersDeactivateConfirm: 'Dezaktywowac tego czlonka?',
    membersLastOwner: 'Zabezpieczenie ostatniego Ownera.',
    membersAdd: 'Dodaj czlonka',
    membersAddSubmit: 'Wyslij zaproszenie',
    membersAddCancel: 'Anuluj',
    membersAddSuccess: 'Czlonek dodany.',
    membersResetLink: 'Link resetu',
    preferencesTitle: 'Preferencje organizacji',
    preferencesLanguageLabel: 'Domyslny jezyk',
    preferencesAiLabel: 'Wlacz funkcje AI',
    preferencesShareLabel: 'Wlacz linki udostepniania',
    preferencesEmailLabel: 'Wlacz inbound email ingest',
    preferencesSave: 'Zapisz preferencje',
    commonSaving: 'Zapisywanie...',
    commonErrorPrefix: 'Blad:',
    commonRequestFailed: 'Nieudane zapytanie.',
  },
  DE: {
    settingsTitle: 'Einstellungen',
    navHome: 'Start',
    signOut: 'Abmelden',
    navOrg: 'Organisation',
    navMembers: 'Mitglieder',
    navPreferences: 'Einstellungen',
    navNda: 'NDA',
    navAvatar: 'Avatar Profil',
    orgTitle: 'Organisationsprofil',
    orgNameLabel: 'Org-Name',
    orgSlugLabel: 'Org-Slug',
    orgSlugHint: '3-6 Zeichen, klein, Buchstaben/Zahlen; optional -01 Suffix.',
    orgInboundLabel: 'Inbound E-Mail',
    orgProviderTitle: 'Provider Profil (Matching)',
    orgProviderLanguagesLabel: 'Provider Sprachen',
    orgProviderRegionsLabel: 'Provider Regionen',
    orgProviderTagsLabel: 'Provider Tags',
    orgProviderBudgetLabel: 'Budget',
    orgProviderTeamSizeLabel: 'Teamgroesse',
    orgProviderTagsHint: 'Kommagetrennt, z.B. ai, cybersecurity, fintech.',
    orgProviderRegionsHint: 'Kommagetrennt, z.B. PL, DE, NL.',
    orgSave: 'Aenderungen speichern',
    orgSaved: 'Gespeichert.',
    membersTitle: 'Mitglieder und Rollen',
    membersEmail: 'E-Mail',
    membersRole: 'Rolle',
    membersStatus: 'Status',
    membersActions: 'Aktionen',
    membersActive: 'Aktiv',
    membersDeactivated: 'Deaktiviert',
    membersDeactivate: 'Deaktivieren',
    membersDeactivateConfirm: 'Mitglied deaktivieren?',
    membersLastOwner: 'Guardrail fuer letzten Owner.',
    membersAdd: 'Mitglied hinzufuegen',
    membersAddSubmit: 'Einladung senden',
    membersAddCancel: 'Abbrechen',
    membersAddSuccess: 'Mitglied hinzugefuegt.',
    membersResetLink: 'Reset-Link',
    preferencesTitle: 'Org-Einstellungen',
    preferencesLanguageLabel: 'Standardsprache',
    preferencesAiLabel: 'AI-Funktionen aktivieren',
    preferencesShareLabel: 'Share-Links aktivieren',
    preferencesEmailLabel: 'Inbound E-Mail ingest aktivieren',
    preferencesSave: 'Einstellungen speichern',
    commonSaving: 'Speichern...',
    commonErrorPrefix: 'Fehler:',
    commonRequestFailed: 'Anfrage fehlgeschlagen.',
  },
  NL: {
    settingsTitle: 'Instellingen',
    navHome: 'Home',
    signOut: 'Uitloggen',
    navOrg: 'Organisatie',
    navMembers: 'Leden',
    navPreferences: 'Voorkeuren',
    navNda: 'NDA',
    navAvatar: 'Avatar profiel',
    orgTitle: 'Organisatieprofiel',
    orgNameLabel: 'Organisatienaam',
    orgSlugLabel: 'Org slug',
    orgSlugHint: '3-6 tekens, lowercase letters/cijfers; optioneel -01 suffix.',
    orgInboundLabel: 'Inbound email',
    orgProviderTitle: 'Provider profiel (Matching)',
    orgProviderLanguagesLabel: 'Provider talen',
    orgProviderRegionsLabel: "Provider regio's",
    orgProviderTagsLabel: 'Provider tags',
    orgProviderBudgetLabel: 'Budget',
    orgProviderTeamSizeLabel: 'Teamgrootte',
    orgProviderTagsHint: 'Komma-gescheiden, bv. ai, cybersecurity, fintech.',
    orgProviderRegionsHint: 'Komma-gescheiden, bv. PL, DE, NL.',
    orgSave: 'Wijzigingen opslaan',
    orgSaved: 'Opgeslagen.',
    membersTitle: 'Leden en rollen',
    membersEmail: 'Email',
    membersRole: 'Rol',
    membersStatus: 'Status',
    membersActions: 'Acties',
    membersActive: 'Actief',
    membersDeactivated: 'Gedeactiveerd',
    membersDeactivate: 'Deactiveer',
    membersDeactivateConfirm: 'Dit lid deactiveren?',
    membersLastOwner: 'Laatste Owner guardrail.',
    membersAdd: 'Lid toevoegen',
    membersAddSubmit: 'Uitnodiging versturen',
    membersAddCancel: 'Annuleren',
    membersAddSuccess: 'Lid toegevoegd.',
    membersResetLink: 'Reset link',
    preferencesTitle: 'Org-voorkeuren',
    preferencesLanguageLabel: 'Standaardtaal',
    preferencesAiLabel: 'AI-functies inschakelen',
    preferencesShareLabel: 'Share links inschakelen',
    preferencesEmailLabel: 'Inbound email ingest inschakelen',
    preferencesSave: 'Voorkeuren opslaan',
    commonSaving: 'Opslaan...',
    commonErrorPrefix: 'Fout:',
    commonRequestFailed: 'Verzoek mislukt.',
  },
};

export function getAdminLabels(language?: string | null): AdminLabels {
  const key = (language || 'EN').toUpperCase() as AdminLanguage;
  return LABELS[key] || LABELS.EN;
}
