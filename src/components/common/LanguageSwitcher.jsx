import { useTranslation } from "react-i18next";

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event) => {
    const language = event.target.value;

    i18n.changeLanguage(language);
    localStorage.setItem("aumbram-language", language);
  };

  return (
    <select
      aria-label="Select language"
      value={i18n.resolvedLanguage || i18n.language}
      onChange={handleLanguageChange}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2"
    >
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
    </select>
  );
}

export default LanguageSwitcher;
