import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2 } from 'lucide-react';

export const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const languages = [
    { code: 'en', name: 'EN' },
    { code: 'ro', name: 'RO' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language)?.name || 'EN';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-1 text-gray-600 hover:text-gray-900"
      >
        <Globe2 className="h-5 w-5" />
        <span className="text-sm font-medium">{currentLanguage}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1" role="menu">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100 ${
                    i18n.language === lang.code ? 'text-indigo-600 font-medium' : 'text-gray-700'
                  }`}
                  role="menuitem"
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};