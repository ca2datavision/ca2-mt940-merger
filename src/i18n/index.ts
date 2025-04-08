import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      appTitle: 'MT940 to CSV Converter',
      description: 'Convert MT940 bank statement files to CSV format for easy analysis and processing',
      privacy: '🔒 100% Private: All processing happens directly in your browser - no data is ever uploaded to servers or stored',
      share: 'Share this tool with others - Note: Only the website link is shared, your files stay private!',
      language: 'Language',
      dropzone: 'Drop MT940 files here or click to select',
      previewCSV: 'Preview CSV',
      preview: 'Preview',
      resetTitle: 'Clear Files',
      reset: 'Clear Files',
      confirmReset: 'Would you like to clear all uploaded files? You can upload them again anytime.',
      cancel: 'Cancel',
      confirmAction: 'Yes, Clear Files',
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
      description: 'Convertește fișiere de extrase bancare MT940 în format CSV pentru analiză și procesare ușoară',
      privacy: '🔒 100% Privat: Toată procesarea are loc direct în browser - datele nu sunt niciodată încărcate pe server sau stocate',
      share: 'Împărtășește acest instrument - Notă: Se distribuie doar link-ul website-ului, fișierele tale rămân private!',
      language: 'Limba',
      dropzone: 'Trage fișiere MT940 aici sau click pentru a selecta',
      previewCSV: 'Previzualizare CSV',
      preview: 'Previzualizare',
      resetTitle: 'Șterge Fișierele',
      reset: 'Șterge Fișierele',
      confirmReset: 'Doriți să ștergeți toate fișierele încărcate? Le puteți încărca din nou oricând.',
      cancel: 'Anulează',
      confirmAction: 'Da, Șterge Fișierele',
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