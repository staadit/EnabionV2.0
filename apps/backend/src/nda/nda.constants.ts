export const NDA_VERSION = 'Enabion_mutual_nda_v0.1_en';

export const NDA_LANGUAGES = ['EN', 'PL', 'DE', 'NL'] as const;
export type NdaLanguage = (typeof NDA_LANGUAGES)[number];

export const NDA_TYPE_MUTUAL = 'MUTUAL';

export const NDA_FILES = {
  en: 'mutual_nda_v0.1_en.md',
  summary: {
    PL: 'mutual_nda_v0.1_summary_pl.md',
    DE: 'mutual_nda_v0.1_summary_de.md',
    NL: 'mutual_nda_v0.1_summary_nl.md',
  },
} as const;

export const NDA_V0_1_EN_HASH = '9ed55f618aab2662e3137c3aa2eaa86fcccd655d6d060e26664864b6509cbffd';
