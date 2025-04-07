import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      appTitle: 'MT940 to CSV Converter',
      privacy: '🔒 100% Private: All processing happens directly in your browser - no data is ever uploaded or stored',
      share: 'Share this tool with others - Note: Only the website link is shared, your files stay private!',
      dropzone: 'Drop MT940 files here or click to select',
      previewCSV: 'Preview CSV',
      preview: 'Preview',
      download: 'Download CSV',
      removeFile: 'Remove',
      previewModal: {
        statement: 'Statement Information',
        account: 'Account',
        currency: 'Currency'
      },
      footer: {
        opensource: 'Free & Open Source Software',
        ai: 'Built with AI assistance',
        company: 'Built by CA2 Data Vision',
        contact: 'Contact'
      }
    }
  },
  ro: {
    translation: {
      appTitle: 'Convertor MT940 în CSV',
      privacy: '🔒 100% Privat: Toată procesarea are loc direct în browser - datele nu sunt niciodată încărcate sau stocate',
      share: 'Împărtășește acest instrument - Notă: Se distribuie doar link-ul website-ului, fișierele tale rămân private!',
      dropzone: 'Trage fișiere MT940 aici sau click pentru a selecta',
      previewCSV: 'Previzualizare CSV',
      preview: 'Previzualizare',
      download: 'Descarcă CSV',
      removeFile: 'Șterge',
      previewModal: {
        statement: 'Informații Extras',
        account: 'Cont',
        currency: 'Valută'
      },
      footer: {
        opensource: 'Software Gratuit și Open Source',
        ai: 'Construit cu asistență AI',
        company: 'Construit de CA2 Data Vision',
        contact: 'Contact'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;