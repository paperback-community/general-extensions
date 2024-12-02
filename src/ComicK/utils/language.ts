type Language = {
  code: string;
  name: string;
};

const languages: Language[] = [
  { code: "all", name: "All Languages" },
  { code: "en", name: "English" },
  { code: "pt-br", name: "Português do Brasil" },
  { code: "es-419", name: "Español (Latinoamérica)" },
  { code: "ru", name: "Русский" },
  { code: "fr", name: "Français" },
  { code: "pl", name: "Polski" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "tr", name: "Türkçe" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "it", name: "Italiano" },
  { code: "es", name: "Español" },
  { code: "ar", name: "العربية" },
  { code: "zh-hk", name: "繁體中文 (香港)" },
  { code: "uk", name: "Українська" },
  { code: "hu", name: "Magyar" },
  { code: "de", name: "Deutsch" },
  { code: "zh", name: "中文" },
  { code: "ko", name: "한국어" },
  { code: "th", name: "ไทย" },
  { code: "bg", name: "Български" },
  { code: "ca", name: "Català" },
  { code: "fa", name: "فارسی" },
  { code: "ro", name: "Română" },
  { code: "cs", name: "Čeština" },
  { code: "mn", name: "Монгол" },
  { code: "pt", name: "Português" },
  { code: "he", name: "עברית" },
  { code: "hi", name: "हिन्दी" },
  { code: "tl", name: "Tagalog" },
  { code: "ms", name: "Bahasa Melayu" },
  { code: "eu", name: "Euskara" },
  { code: "kk", name: "Қазақ" },
  { code: "sr", name: "Српски" },
  { code: "my", name: "မြန်မာစာ" },
  { code: "el", name: "Ελληνικά" },
  { code: "nl", name: "Nederlands" },
  { code: "ja", name: "日本語" },
  { code: "eo", name: "Esperanto" },
  { code: "fi", name: "Suomi" },
  { code: "ka", name: "ქართული" },
  { code: "lt", name: "Lietuvių" },
  { code: "ta", name: "தமிழ்" },
  { code: "bn", name: "বাংলা" },
  { code: "sv", name: "Svenska" },
  { code: "hr", name: "Hrvatski" },
  { code: "la", name: "Latina" },
  { code: "ne", name: "नेपाली" },
  { code: "cv", name: "Чӑваш" },
  { code: "ur", name: "اردو" },
  { code: "be", name: "Беларуская" },
  { code: "no", name: "Norsk" },
  { code: "sq", name: "Shqip" },
  { code: "te", name: "తెలుగు" },
  { code: "da", name: "Dansk" },
  { code: "et", name: "Eesti" },
  { code: "ga", name: "Gaeilge" },
  { code: "az", name: "Azərbaycan" },
  { code: "sk", name: "Slovenčina" },
  { code: "jv", name: "Basa Jawa" },
  { code: "af", name: "Afrikaans" },
  { code: "sl", name: "Slovenščina" },
  { code: "uz", name: "Ўзбек" },
];

function getLanguageOptions() {
  return languages.map((lang) => ({
    id: lang.code,
    title: lang.name,
  }));
}

function getLanguageName(code: string): string {
  return languages.find((language) => language.code == code)?.name ?? "Unknown";
}

export { languages, getLanguageOptions, getLanguageName };
