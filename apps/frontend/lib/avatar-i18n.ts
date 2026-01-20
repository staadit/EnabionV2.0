export type AvatarLanguage = 'EN' | 'PL' | 'DE' | 'NL';

export type AvatarLabels = {
  avatarsTitle: string;
  avatarsSubtitle: string;
  systemCardTitle: string;
  systemCardBody: string;
  systemCardCta: string;
  orgCardTitle: string;
  orgCardBody: string;
  orgCardCta: string;
  aiGatewayTitle: string;
  aiGatewayEmpty: string;
  aiGatewayTypeLabel: string;
  aiGatewayOccurredLabel: string;
  aiGatewayUseCaseLabel: string;
  aiGatewayModelLabel: string;
  aiGatewayTokensLabel: string;
  aiGatewayTotalLabel: string;
  aiGatewayLatencyLabel: string;
  aiGatewayErrorLabel: string;
  aiGatewayRequestIdLabel: string;
  aiGatewayErrorMessage: string;
  systemTitle: string;
  systemSubtitle: string;
  onboardingTitle: string;
  onboardingComplete: string;
  onboardingStepTitles: Record<string, string>;
  onboardingStepBodies: Record<string, string>;
  onboardingStepComplete: string;
  onboardingStepSkip: string;
  pipelineTitle: string;
  pipelineTotalLabel: string;
  stageLabels: Record<string, string>;
  readinessTitle: string;
  readinessEmpty: string;
  missingFieldsLabel: string;
  ndaStatusLabel: string;
  ndaStatusAccepted: string;
  ndaStatusMissing: string;
  suggestionsTitle: string;
  suggestionsEmpty: string;
  loadingLabel: string;
  intentLabel: string;
  stepStatusDone: string;
  stepStatusStep: string;
  emptyValue: string;
  selectPlaceholder: string;
  ctaFallback: string;
  ctaLabels: Record<string, string>;
  suggestionKindLabels: Record<string, string>;
  fieldLabels: Record<string, string>;
  tagsPlaceholder: string;
  orgProfileTitle: string;
  orgProfileHint: string;
  orgProfileSave: string;
  orgProfileSaved: string;
  orgProfileReadonly: string;
  profileFields: Record<string, string>;
  orgPageIntro: string;
  orgPageProfileCta: string;
  orgPagePipelineCta: string;
  orgPanelTitle: string;
  orgPanelEmpty: string;
  fitLabel: string;
  priorityLabel: string;
  reasonsLabel: string;
  acceptLabel: string;
  rejectLabel: string;
  notePrompt: string;
  fitBands: Record<string, string>;
  priorities: Record<string, string>;
  reasonLabels: Record<string, string>;
  systemSuggestionCreateIntentTitle: string;
  systemSuggestionCreateIntentBody: string;
  systemSuggestionMissingInfoTitle: string;
  systemSuggestionMissingInfoBody: string;
  systemSuggestionIntentCoachTitle: string;
  systemSuggestionIntentCoachBody: string;
  systemSuggestionSignNdaTitle: string;
  systemSuggestionSignNdaBody: string;
};

const BASE_LABELS: AvatarLabels = {
  avatarsTitle: 'Avatars',
  avatarsSubtitle: 'System and Organization guidance for BCOS.',
  systemCardTitle: 'System Avatar',
  systemCardBody: 'Onboarding, governance reminders, and next steps.',
  systemCardCta: 'Open System Avatar',
  orgCardTitle: 'Organization Avatar',
  orgCardBody: 'Org preferences and lead qualification.',
  orgCardCta: 'Open Organization Avatar',
  aiGatewayTitle: 'Recent AI Gateway activity',
  aiGatewayEmpty: 'No AI Gateway events yet.',
  aiGatewayTypeLabel: 'Type',
  aiGatewayOccurredLabel: 'Occurred',
  aiGatewayUseCaseLabel: 'Use case',
  aiGatewayModelLabel: 'Model',
  aiGatewayTokensLabel: 'Tokens',
  aiGatewayTotalLabel: 'total',
  aiGatewayLatencyLabel: 'Latency',
  aiGatewayErrorLabel: 'Error',
  aiGatewayRequestIdLabel: 'Request ID',
  aiGatewayErrorMessage: 'Unable to load AI Gateway events.',
  systemTitle: 'System Avatar',
  systemSubtitle: 'BCOS onboarding and governance guidance.',
  onboardingTitle: 'First run onboarding',
  onboardingComplete: 'Onboarding completed.',
  onboardingStepTitles: {
    how_it_works: 'How Enabion works',
    nda: 'Confidentiality & NDA',
    first_intent: 'Create your first Intent',
    use_avatars: 'Use Avatars effectively',
  },
  onboardingStepBodies: {
    how_it_works: 'Clarify -> Match -> Commit (Deliver/Expand are status only in R1.0).',
    nda: 'L1 is default. L2 needs Mutual NDA. L3 is a placeholder.',
    first_intent: 'Create an Intent from a brief or email to start the flow.',
    use_avatars: 'Use Intent Coach for clarifying questions and gaps.',
  },
  onboardingStepComplete: 'Mark complete',
  onboardingStepSkip: 'Skip for now',
  pipelineTitle: 'Pipeline overview',
  pipelineTotalLabel: 'Total',
  stageLabels: {
    NEW: 'New',
    CLARIFY: 'Clarify',
    MATCH: 'Match',
    COMMIT: 'Commit',
    WON: 'Won',
    LOST: 'Lost',
  },
  readinessTitle: 'BCOS readiness check',
  readinessEmpty: 'Select an intent to see missing fields.',
  missingFieldsLabel: 'Missing fields',
  ndaStatusLabel: 'Mutual NDA status',
  ndaStatusAccepted: 'Accepted',
  ndaStatusMissing: 'Not accepted',
  suggestionsTitle: 'Next recommended actions',
  suggestionsEmpty: 'No suggestions right now.',
  loadingLabel: 'Loading...',
  intentLabel: 'Intent',
  stepStatusDone: 'Done',
  stepStatusStep: 'Step',
  emptyValue: '-',
  selectPlaceholder: '--',
  ctaFallback: 'Open',
  ctaLabels: {
    create_intent: 'Create Intent',
    open_intent: 'Open Intent',
    open_intent_coach: 'Open Intent Coach',
    open_nda_settings: 'Open NDA settings',
  },
  suggestionKindLabels: {
    missing_info: 'Missing info',
    next_step: 'Next step',
    lead_qualification: 'Lead qualification',
    risk: 'Risk',
    question: 'Question',
    rewrite: 'Rewrite',
    summary: 'Summary',
  },
  fieldLabels: {
    goal: 'Goal',
    client: 'Client',
    context: 'Context',
    scope: 'Scope',
    kpi: 'KPI',
    risks: 'Risks',
    deadlineAt: 'Deadline',
  },
  tagsPlaceholder: 'tag1, tag2, tag3',
  orgProfileTitle: 'Organization Avatar profile',
  orgProfileHint: 'Use comma-separated tags. Keep them short and consistent.',
  orgProfileSave: 'Save profile',
  orgProfileSaved: 'Saved.',
  orgProfileReadonly: 'View-only access. Ask an Owner or BD to update.',
  profileFields: {
    markets: 'Markets',
    industries: 'Industries',
    clientTypes: 'Client types',
    servicePortfolio: 'Service portfolio',
    techStack: 'Tech stack',
    excludedSectors: 'Excluded sectors',
    preferredLanguages: 'Preferred languages',
  },
  orgPageIntro: 'Keep your org preferences up to date to qualify leads consistently.',
  orgPageProfileCta: 'Open Avatar profile',
  orgPagePipelineCta: 'Open pipeline',
  orgPanelTitle: 'Organization Avatar',
  orgPanelEmpty: 'Qualification not available yet.',
  fitLabel: 'Fit',
  priorityLabel: 'Priority',
  reasonsLabel: 'Reasons',
  acceptLabel: 'Accept',
  rejectLabel: 'Reject',
  notePrompt: 'Optional reason (avoid PII):',
  fitBands: {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
    NO_FIT: 'No-fit',
  },
  priorities: {
    P1: 'P1',
    P2: 'P2',
    P3: 'P3',
  },
  reasonLabels: {
    match_industry: 'Matches industry focus',
    match_tech: 'Matches tech stack',
    match_service: 'Matches service portfolio',
    match_client_type: 'Matches client type',
    match_market: 'Market aligned',
    excluded_sector: 'Excluded sector',
    market_not_supported: 'Market not supported',
    language_not_supported: 'Language not supported',
    insufficient_signals: 'Insufficient signals',
  },
  systemSuggestionCreateIntentTitle: 'Create your first Intent',
  systemSuggestionCreateIntentBody: 'Start with a first Intent to enter the Clarify flow.',
  systemSuggestionMissingInfoTitle: 'Complete missing Intent fields',
  systemSuggestionMissingInfoBody: 'Add the missing details to improve BCOS readiness.',
  systemSuggestionIntentCoachTitle: 'Run Intent Coach',
  systemSuggestionIntentCoachBody: 'Let Intent Coach suggest clarifying questions and gaps.',
  systemSuggestionSignNdaTitle: 'Sign Mutual NDA',
  systemSuggestionSignNdaBody: 'Complete Mutual NDA to enable Level 2 collaboration.',
};

const LABELS: Record<AvatarLanguage, AvatarLabels> = {
  EN: BASE_LABELS,
  PL: {
    ...BASE_LABELS,
    avatarsSubtitle: 'System i Organizacja - wsparcie BCOS.',
    systemCardBody: 'Onboarding, governance i kolejne kroki.',
    orgCardBody: 'Preferencje org i kwalifikacja leadow.',
    aiGatewayTitle: 'Aktywnosc AI Gateway',
    aiGatewayEmpty: 'Brak eventow AI Gateway.',
    aiGatewayTypeLabel: 'Typ',
    aiGatewayOccurredLabel: 'Czas',
    aiGatewayUseCaseLabel: 'Use case',
    aiGatewayModelLabel: 'Model',
    aiGatewayTokensLabel: 'Tokeny',
    aiGatewayTotalLabel: 'razem',
    aiGatewayLatencyLabel: 'Opoznienie',
    aiGatewayErrorLabel: 'Blad',
    aiGatewayRequestIdLabel: 'ID zadania',
    aiGatewayErrorMessage: 'Nie mozna zaladowac eventow AI Gateway.',
    systemSubtitle: 'Onboarding BCOS i wskazowki governance.',
    onboardingTitle: 'Onboarding startowy',
    onboardingComplete: 'Onboarding zakonczony.',
    onboardingStepTitles: {
      how_it_works: 'Jak dziala Enabion',
      nda: 'Poufnosc i NDA',
      first_intent: 'Stworz pierwszy Intent',
      use_avatars: 'Uzywaj Avatarow skutecznie',
    },
    onboardingStepBodies: {
      how_it_works: 'Clarify -> Match -> Commit (Deliver/Expand tylko status w R1.0).',
      nda: 'L1 domyslny. L2 po Mutual NDA. L3 to placeholder.',
      first_intent: 'Stworz Intent z briefu lub maila, aby zaczac flow.',
      use_avatars: 'Uzyj Intent Coach do pytan i luk.',
    },
    pipelineTitle: 'Przeglad pipeline',
    readinessTitle: 'BCOS readiness check',
    readinessEmpty: 'Wybierz Intent, aby zobaczyc braki.',
    missingFieldsLabel: 'Brakujace pola',
    ndaStatusLabel: 'Status Mutual NDA',
    ndaStatusAccepted: 'Zaakceptowane',
    ndaStatusMissing: 'Niezaakceptowane',
    suggestionsTitle: 'Rekomendowane akcje',
    suggestionsEmpty: 'Brak sugestii.',
    loadingLabel: 'Ladowanie...',
    intentLabel: 'Intent',
    stepStatusDone: 'Gotowe',
    stepStatusStep: 'Krok',
    emptyValue: '-',
    selectPlaceholder: '--',
    ctaFallback: 'Otworz',
    ctaLabels: {
      create_intent: 'Stworz Intent',
      open_intent: 'Otworz Intent',
      open_intent_coach: 'Otworz Intent Coach',
      open_nda_settings: 'Ustawienia NDA',
    },
    suggestionKindLabels: {
      missing_info: 'Brakujace dane',
      next_step: 'Nastepny krok',
      lead_qualification: 'Kwalifikacja leada',
      risk: 'Ryzyko',
      question: 'Pytanie',
      rewrite: 'Przepisanie',
      summary: 'Podsumowanie',
    },
    fieldLabels: {
      goal: 'Cel',
      client: 'Klient',
      context: 'Kontekst',
      scope: 'Zakres',
      kpi: 'KPI',
      risks: 'Ryzyka',
      deadlineAt: 'Deadline',
    },
    tagsPlaceholder: 'tag1, tag2, tag3',
    orgProfileTitle: 'Profil Organization Avatar',
    orgProfileHint: 'Uzywaj tagow po przecinku. Krotkie i spojne.',
    orgProfileSave: 'Zapisz profil',
    orgProfileSaved: 'Zapisano.',
    orgProfileReadonly: 'Tylko podglad. Popros Owner lub BD o zmiany.',
    profileFields: {
      markets: 'Rynki',
      industries: 'Branze',
      clientTypes: 'Typy klientow',
      servicePortfolio: 'Portfolio uslug',
      techStack: 'Tech stack',
      excludedSectors: 'Sektory wykluczone',
      preferredLanguages: 'Preferowane jezyki',
    },
    orgPageIntro: 'Dbaj o preferencje org, aby kwalifikowac leady spojnie.',
    orgPageProfileCta: 'Otworz profil Avatara',
    orgPagePipelineCta: 'Otworz pipeline',
    orgPanelTitle: 'Organization Avatar',
    orgPanelEmpty: 'Brak kwalifikacji.',
    fitLabel: 'Fit',
    priorityLabel: 'Priorytet',
    reasonsLabel: 'Powody',
    acceptLabel: 'Akceptuj',
    rejectLabel: 'Odrzuc',
    notePrompt: 'Opcjonalny powod (bez PII):',
    fitBands: {
      HIGH: 'Wysoki',
      MEDIUM: 'Sredni',
      LOW: 'Niski',
      NO_FIT: 'No-fit',
    },
    reasonLabels: {
      match_industry: 'Zgodnosc z branza',
      match_tech: 'Zgodnosc z tech stack',
      match_service: 'Zgodnosc z portfolio',
      match_client_type: 'Zgodnosc z typem klienta',
      match_market: 'Zgodnosc z rynkiem',
      excluded_sector: 'Sektor wykluczony',
      market_not_supported: 'Rynek nieobslugiwany',
      language_not_supported: 'Jezyk nieobslugiwany',
      insufficient_signals: 'Za malo sygnalow',
    },
    systemSuggestionCreateIntentTitle: 'Stworz pierwszy Intent',
    systemSuggestionCreateIntentBody: 'Zacznij od pierwszego Intentu, aby wejsc w Clarify.',
    systemSuggestionMissingInfoTitle: 'Uzupelnij brakujace pola Intenta',
    systemSuggestionMissingInfoBody: 'Dodaj brakujace informacje dla BCOS readiness.',
    systemSuggestionIntentCoachTitle: 'Uruchom Intent Coach',
    systemSuggestionIntentCoachBody: 'Intent Coach podpowie pytania i luki.',
    systemSuggestionSignNdaTitle: 'Podpisz Mutual NDA',
    systemSuggestionSignNdaBody: 'Wypelnij Mutual NDA, aby odblokowac L2.',
  },
  DE: {
    ...BASE_LABELS,
    avatarsSubtitle: 'System und Organisation - BCOS guidance.',
    systemCardBody: 'Onboarding, Governance und naechste Schritte.',
    orgCardBody: 'Org-Profile und Lead-Qualifikation.',
    aiGatewayTitle: 'AI Gateway Aktivitaet',
    aiGatewayEmpty: 'Noch keine AI Gateway Events.',
    aiGatewayTypeLabel: 'Typ',
    aiGatewayOccurredLabel: 'Zeit',
    aiGatewayUseCaseLabel: 'Use case',
    aiGatewayModelLabel: 'Modell',
    aiGatewayTokensLabel: 'Tokens',
    aiGatewayTotalLabel: 'gesamt',
    aiGatewayLatencyLabel: 'Latenz',
    aiGatewayErrorLabel: 'Fehler',
    aiGatewayRequestIdLabel: 'Request ID',
    aiGatewayErrorMessage: 'AI Gateway Events konnten nicht geladen werden.',
    systemSubtitle: 'BCOS Onboarding und Governance Hinweise.',
    onboardingTitle: 'Erststart Onboarding',
    onboardingComplete: 'Onboarding abgeschlossen.',
    onboardingStepTitles: {
      how_it_works: 'Wie Enabion funktioniert',
      nda: 'Vertraulichkeit & NDA',
      first_intent: 'Ersten Intent erstellen',
      use_avatars: 'Avatare effektiv nutzen',
    },
    onboardingStepBodies: {
      how_it_works: 'Clarify -> Match -> Commit (Deliver/Expand nur Status in R1.0).',
      nda: 'L1 ist Standard. L2 nach Mutual NDA. L3 ist Platzhalter.',
      first_intent: 'Intent aus Brief oder Email erstellen.',
      use_avatars: 'Intent Coach fuer Fragen und Luecken nutzen.',
    },
    pipelineTitle: 'Pipeline Ueberblick',
    readinessTitle: 'BCOS readiness check',
    readinessEmpty: 'Intent waehlen, um fehlende Felder zu sehen.',
    missingFieldsLabel: 'Fehlende Felder',
    ndaStatusLabel: 'Mutual NDA Status',
    ndaStatusAccepted: 'Akzeptiert',
    ndaStatusMissing: 'Nicht akzeptiert',
    suggestionsTitle: 'Empfohlene Aktionen',
    suggestionsEmpty: 'Keine Vorschlaege.',
    loadingLabel: 'Laedt...',
    intentLabel: 'Intent',
    stepStatusDone: 'Fertig',
    stepStatusStep: 'Schritt',
    emptyValue: '-',
    selectPlaceholder: '--',
    ctaFallback: 'Oeffnen',
    ctaLabels: {
      create_intent: 'Intent erstellen',
      open_intent: 'Intent oeffnen',
      open_intent_coach: 'Intent Coach oeffnen',
      open_nda_settings: 'NDA Einstellungen',
    },
    suggestionKindLabels: {
      missing_info: 'Fehlende Infos',
      next_step: 'Naechster Schritt',
      lead_qualification: 'Lead Qualifikation',
      risk: 'Risiko',
      question: 'Frage',
      rewrite: 'Umschreiben',
      summary: 'Zusammenfassung',
    },
    fieldLabels: {
      goal: 'Ziel',
      client: 'Kunde',
      context: 'Kontext',
      scope: 'Umfang',
      kpi: 'KPI',
      risks: 'Risiken',
      deadlineAt: 'Deadline',
    },
    tagsPlaceholder: 'tag1, tag2, tag3',
    orgProfileTitle: 'Organization Avatar Profil',
    orgProfileHint: 'Tags per Komma. Kurz und konsistent.',
    orgProfileSave: 'Profil speichern',
    orgProfileSaved: 'Gespeichert.',
    orgProfileReadonly: 'Nur lesen. Owner oder BD um Update bitten.',
    profileFields: {
      markets: 'Maerkte',
      industries: 'Branchen',
      clientTypes: 'Kundentypen',
      servicePortfolio: 'Service Portfolio',
      techStack: 'Tech Stack',
      excludedSectors: 'Ausgeschlossene Sektoren',
      preferredLanguages: 'Bevorzugte Sprachen',
    },
    orgPageIntro: 'Org-Praeferenzen pflegen fuer konsistente Qualifikation.',
    orgPageProfileCta: 'Avatar Profil oeffnen',
    orgPagePipelineCta: 'Pipeline oeffnen',
    orgPanelTitle: 'Organization Avatar',
    orgPanelEmpty: 'Keine Qualifikation.',
    fitLabel: 'Fit',
    priorityLabel: 'Prioritaet',
    reasonsLabel: 'Gruende',
    acceptLabel: 'Akzeptieren',
    rejectLabel: 'Ablehnen',
    notePrompt: 'Optionaler Grund (keine PII):',
    fitBands: {
      HIGH: 'Hoch',
      MEDIUM: 'Mittel',
      LOW: 'Niedrig',
      NO_FIT: 'No-fit',
    },
    reasonLabels: {
      match_industry: 'Branchenmatch',
      match_tech: 'Tech Stack match',
      match_service: 'Service Portfolio match',
      match_client_type: 'Kundentyp match',
      match_market: 'Markt passend',
      excluded_sector: 'Sektor ausgeschlossen',
      market_not_supported: 'Markt nicht unterstuetzt',
      language_not_supported: 'Sprache nicht unterstuetzt',
      insufficient_signals: 'Zu wenig Signale',
    },
    systemSuggestionCreateIntentTitle: 'Ersten Intent erstellen',
    systemSuggestionCreateIntentBody: 'Start mit dem ersten Intent fuer den Clarify Flow.',
    systemSuggestionMissingInfoTitle: 'Fehlende Intent Felder ergaenzen',
    systemSuggestionMissingInfoBody: 'Fehlende Details ergaenzen fuer BCOS readiness.',
    systemSuggestionIntentCoachTitle: 'Intent Coach starten',
    systemSuggestionIntentCoachBody: 'Intent Coach liefert Fragen und Luecken.',
    systemSuggestionSignNdaTitle: 'Mutual NDA unterzeichnen',
    systemSuggestionSignNdaBody: 'Mutual NDA abschliessen, um L2 zu aktivieren.',
  },
  NL: {
    ...BASE_LABELS,
    avatarsSubtitle: 'Systeem en Organisatie - BCOS guidance.',
    systemCardBody: 'Onboarding, governance en volgende stappen.',
    orgCardBody: 'Org voorkeuren en lead kwalificatie.',
    aiGatewayTitle: 'AI Gateway activiteit',
    aiGatewayEmpty: 'Nog geen AI Gateway events.',
    aiGatewayTypeLabel: 'Type',
    aiGatewayOccurredLabel: 'Tijd',
    aiGatewayUseCaseLabel: 'Use case',
    aiGatewayModelLabel: 'Model',
    aiGatewayTokensLabel: 'Tokens',
    aiGatewayTotalLabel: 'totaal',
    aiGatewayLatencyLabel: 'Latentie',
    aiGatewayErrorLabel: 'Fout',
    aiGatewayRequestIdLabel: 'Request ID',
    aiGatewayErrorMessage: 'AI Gateway events konden niet geladen worden.',
    systemSubtitle: 'BCOS onboarding en governance guidance.',
    onboardingTitle: 'Eerste onboarding',
    onboardingComplete: 'Onboarding afgerond.',
    onboardingStepTitles: {
      how_it_works: 'Hoe Enabion werkt',
      nda: 'Vertrouwelijkheid & NDA',
      first_intent: 'Eerste Intent maken',
      use_avatars: 'Avatars effectief gebruiken',
    },
    onboardingStepBodies: {
      how_it_works: 'Clarify -> Match -> Commit (Deliver/Expand alleen status in R1.0).',
      nda: 'L1 is standaard. L2 na Mutual NDA. L3 is placeholder.',
      first_intent: 'Maak een Intent op basis van brief of email.',
      use_avatars: 'Gebruik Intent Coach voor vragen en gaps.',
    },
    pipelineTitle: 'Pipeline overzicht',
    readinessTitle: 'BCOS readiness check',
    readinessEmpty: 'Selecteer een intent om ontbrekende velden te zien.',
    missingFieldsLabel: 'Ontbrekende velden',
    ndaStatusLabel: 'Mutual NDA status',
    ndaStatusAccepted: 'Geaccepteerd',
    ndaStatusMissing: 'Niet geaccepteerd',
    suggestionsTitle: 'Aanbevolen acties',
    suggestionsEmpty: 'Geen suggesties.',
    loadingLabel: 'Laden...',
    intentLabel: 'Intent',
    stepStatusDone: 'Klaar',
    stepStatusStep: 'Stap',
    emptyValue: '-',
    selectPlaceholder: '--',
    ctaFallback: 'Openen',
    ctaLabels: {
      create_intent: 'Intent maken',
      open_intent: 'Intent openen',
      open_intent_coach: 'Intent Coach openen',
      open_nda_settings: 'NDA instellingen',
    },
    suggestionKindLabels: {
      missing_info: 'Ontbrekende info',
      next_step: 'Volgende stap',
      lead_qualification: 'Lead kwalificatie',
      risk: 'Risico',
      question: 'Vraag',
      rewrite: 'Herschrijven',
      summary: 'Samenvatting',
    },
    fieldLabels: {
      goal: 'Doel',
      client: 'Klant',
      context: 'Context',
      scope: 'Scope',
      kpi: 'KPI',
      risks: 'Risico`s',
      deadlineAt: 'Deadline',
    },
    tagsPlaceholder: 'tag1, tag2, tag3',
    orgProfileTitle: 'Organization Avatar profiel',
    orgProfileHint: 'Tags gescheiden door komma`s. Kort en consistent.',
    orgProfileSave: 'Profiel opslaan',
    orgProfileSaved: 'Opgeslagen.',
    orgProfileReadonly: 'Alleen lezen. Vraag Owner of BD om update.',
    profileFields: {
      markets: 'Markten',
      industries: 'Industrieen',
      clientTypes: 'Klanttypen',
      servicePortfolio: 'Service portfolio',
      techStack: 'Tech stack',
      excludedSectors: 'Uitgesloten sectoren',
      preferredLanguages: 'Voorkeurstalen',
    },
    orgPageIntro: 'Houd org voorkeuren up to date voor consistente kwalificatie.',
    orgPageProfileCta: 'Avatar profiel openen',
    orgPagePipelineCta: 'Pipeline openen',
    orgPanelTitle: 'Organization Avatar',
    orgPanelEmpty: 'Geen kwalificatie.',
    fitLabel: 'Fit',
    priorityLabel: 'Prioriteit',
    reasonsLabel: 'Redenen',
    acceptLabel: 'Accepteren',
    rejectLabel: 'Afwijzen',
    notePrompt: 'Optionele reden (geen PII):',
    fitBands: {
      HIGH: 'Hoog',
      MEDIUM: 'Midden',
      LOW: 'Laag',
      NO_FIT: 'No-fit',
    },
    reasonLabels: {
      match_industry: 'Match industrie',
      match_tech: 'Match tech stack',
      match_service: 'Match service portfolio',
      match_client_type: 'Match klanttype',
      match_market: 'Markt match',
      excluded_sector: 'Sector uitgesloten',
      market_not_supported: 'Markt niet ondersteund',
      language_not_supported: 'Taal niet ondersteund',
      insufficient_signals: 'Te weinig signalen',
    },
    systemSuggestionCreateIntentTitle: 'Eerste Intent maken',
    systemSuggestionCreateIntentBody: 'Start met de eerste Intent om de Clarify flow te starten.',
    systemSuggestionMissingInfoTitle: 'Vul ontbrekende Intent velden aan',
    systemSuggestionMissingInfoBody: 'Vul ontbrekende details aan voor BCOS readiness.',
    systemSuggestionIntentCoachTitle: 'Intent Coach starten',
    systemSuggestionIntentCoachBody: 'Intent Coach geeft vragen en gaps.',
    systemSuggestionSignNdaTitle: 'Mutual NDA tekenen',
    systemSuggestionSignNdaBody: 'Rond Mutual NDA af om L2 te activeren.',
  },
};

export function getAvatarLabels(language?: string | null): AvatarLabels {
  const key = (language || 'EN').toUpperCase() as AvatarLanguage;
  return LABELS[key] || LABELS.EN;
}
