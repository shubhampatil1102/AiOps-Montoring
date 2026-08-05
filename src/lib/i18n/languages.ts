export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  comingSoon: boolean;
}

// Only "en" has real translations (see translations/en.ts). The rest are
// listed per the brief but marked comingSoon — honest UI state, not a
// silent no-op.
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English", comingSoon: false },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी", comingSoon: true },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", comingSoon: true },
  { code: "de", label: "German", nativeLabel: "Deutsch", comingSoon: true },
  { code: "fr", label: "French", nativeLabel: "Français", comingSoon: true },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", comingSoon: true },
];
