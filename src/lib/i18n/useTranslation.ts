import { en, type LoginTranslations } from "./translations/en";

// Only English is implemented today (per brief). Any other selected
// locale honestly falls back to English strings rather than crashing on
// a missing key. Swapping in a real i18n library later only requires
// changing this hook's internals — call sites stay the same.
export function useTranslation(): LoginTranslations {
  return en;
}
