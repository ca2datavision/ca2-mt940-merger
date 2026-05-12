import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      appTitle: 'MT940 Validator & Merger',
      description: 'Validate, merge, and export MT940 bank statements. Supports CSV and MT940 output formats.',
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
      },
      validation: {
        status: {
          valid: 'Valid',
          validWithWarnings: 'Valid with warnings',
          invalid: 'Invalid'
        },
        files: 'Files',
        statements: 'Statements',
        transactions: 'Transactions',
        errors: 'errors',
        warnings: 'warnings',
        noIssues: 'No issues'
      },
      issues: {
        title: 'Validation Issues ({{count}})',
        noMatchingFilters: 'No issues match the selected filters',
        filter: {
          error: 'Errors',
          warning: 'Warnings',
          info: 'Info'
        }
      },
      report: {
        title: 'Validation Report',
        summary: 'Summary',
        accounts: 'Accounts',
        currencies: 'Currencies',
        dateRange: 'Date Range',
        validationResult: 'Validation Result',
        mergeAssessment: 'Merge Assessment',
        mergeReady: 'Ready to merge',
        mergeNotReady: 'Cannot merge',
        warningsSection: 'Warnings',
        noWarnings: 'No warnings',
        downloadReport: 'Download Report'
      },
      downloads: {
        json: 'JSON',
        jsonTitle: 'Download validation result as JSON',
        report: 'Report',
        reportTitle: 'Download validation report as Markdown',
        enhanced: 'Enhanced CSV',
        enhancedTitle: 'Download 19-column enhanced CSV with full details'
      },
      progress: {
        title: 'Processing Files',
        processing: 'File {{current}} of {{total}}',
        cancel: 'Cancel'
      },
      merge: {
        title: 'Merge MT940 Statements',
        selectAll: 'Select All',
        deselectAll: 'Deselect All',
        transactions: 'transactions',
        selected: '{{count}} statement(s) selected',
        selectToMerge: 'Select statements to merge',
        preview: 'Preview',
        previewTitle: 'Merged MT940 Preview',
        previewTitleMulti: 'Multi-Message MT940 Preview',
        previewTitleSingle: 'Single-Statement MT940 Preview',
        previewMulti: 'Preview Multi',
        previewSingle: 'Preview Single',
        download: 'Download MT940',
        downloadMulti: 'Multi-Message',
        downloadSingle: 'Single Statement',
        multiDesc: 'Keep original statement structure',
        singleDesc: 'Combine all into one statement',
        disabledErrors: '{{count}} validation error(s) - fix before merging',
        disabledNoSelection: 'Select statements to enable merge',
        singleConfirmTitle: 'Confirm Single Statement Merge',
        singleConfirmMessage: 'Merging into a single statement will recalculate the closing balance. This may differ from the original statement numbers. Only use this if your system requires a single consolidated statement.',
        confirmDownload: 'Download'
      },
      validationCodes: {
        BALANCE_DISCONTINUITY: 'Balance discontinuity between statements',
        MISSING_OPENING_BALANCE: 'Missing opening balance (:60F:/:60M:)',
        MISSING_CLOSING_BALANCE: 'Missing closing balance (:62F:/:62M:)',
        STRUCT_MISSING_25: 'Missing account identifier (:25:)',
        STRUCT_MISSING_28: 'Missing statement number (:28C:/:28:)',
        STRUCT_MISSING_60: 'Missing opening balance (:60F:/:60M:)',
        STRUCT_MISSING_62: 'Missing closing balance (:62F:/:62M:)',
        STRUCT_28_NONSTANDARD: 'Non-standard statement number format (:28: instead of :28C:)',
        STRUCT_NO_TAGS: 'No MT940 tags found in file',
        STRUCT_NO_STATEMENTS: 'No valid statements found',
        TXN_MALFORMED_61: 'Malformed transaction line (:61:)',
        BAL_MALFORMED_65: 'Malformed forward balance (:65:)',
        DUP_FILE: 'Duplicate file detected',
        DUP_STATEMENT: 'Duplicate statement detected',
        DUP_TRANSACTION: 'Duplicate transaction detected',
        MERGE_NO_STATEMENTS: 'No statements available for merge',
        MERGE_VALIDATION_ERRORS: 'Cannot merge: validation errors present',
        MERGE_MULTIPLE_ACCOUNTS: 'Cannot merge: multiple accounts',
        MERGE_MULTIPLE_CURRENCIES: 'Cannot merge: multiple currencies',
        MERGE_BALANCE_GAP: 'Cannot merge: balance gap between statements',
        MERGE_NOT_CHRONOLOGICAL: 'Cannot merge: statements not in chronological order'
      }
    }
  },
  ro: {
    translation: {
      appTitle: 'Validator & Îmbinare MT940',
      description: 'Validează, îmbină și exportă extrase bancare MT940. Suportă formate de export CSV și MT940.',
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
      },
      validation: {
        status: {
          valid: 'Valid',
          validWithWarnings: 'Valid cu avertismente',
          invalid: 'Invalid'
        },
        files: 'Fișiere',
        statements: 'Extrase',
        transactions: 'Tranzacții',
        errors: 'erori',
        warnings: 'avertismente',
        noIssues: 'Fără probleme'
      },
      issues: {
        title: 'Probleme de Validare ({{count}})',
        noMatchingFilters: 'Nicio problemă nu corespunde filtrelor selectate',
        filter: {
          error: 'Erori',
          warning: 'Avertismente',
          info: 'Informații'
        }
      },
      report: {
        title: 'Raport de Validare',
        summary: 'Rezumat',
        accounts: 'Conturi',
        currencies: 'Valute',
        dateRange: 'Interval Date',
        validationResult: 'Rezultat Validare',
        mergeAssessment: 'Evaluare Îmbinare',
        mergeReady: 'Gata pentru îmbinare',
        mergeNotReady: 'Nu se poate îmbina',
        warningsSection: 'Avertismente',
        noWarnings: 'Fără avertismente',
        downloadReport: 'Descarcă Raport'
      },
      downloads: {
        json: 'JSON',
        jsonTitle: 'Descarcă rezultatul validării ca JSON',
        report: 'Raport',
        reportTitle: 'Descarcă raportul de validare ca Markdown',
        enhanced: 'CSV Extins',
        enhancedTitle: 'Descarcă CSV extins cu 19 coloane și detalii complete'
      },
      progress: {
        title: 'Se procesează fișierele',
        processing: 'Fișierul {{current}} din {{total}}',
        cancel: 'Anulează'
      },
      merge: {
        title: 'Îmbinare Extrase MT940',
        selectAll: 'Selectează Tot',
        deselectAll: 'Deselectează Tot',
        transactions: 'tranzacții',
        selected: '{{count}} extras(e) selectat(e)',
        selectToMerge: 'Selectează extrase pentru îmbinare',
        preview: 'Previzualizare',
        previewTitle: 'Previzualizare MT940 Îmbinat',
        previewTitleMulti: 'Previzualizare MT940 Multi-Mesaj',
        previewTitleSingle: 'Previzualizare MT940 Extras Unic',
        previewMulti: 'Previzualizare Multi',
        previewSingle: 'Previzualizare Unic',
        download: 'Descarcă MT940',
        downloadMulti: 'Multi-Mesaj',
        downloadSingle: 'Extras Unic',
        multiDesc: 'Păstrează structura originală',
        singleDesc: 'Combină totul într-un singur extras',
        disabledErrors: '{{count}} eroare(i) de validare - corectați înainte de îmbinare',
        disabledNoSelection: 'Selectați extrase pentru a activa îmbinarea',
        singleConfirmTitle: 'Confirmă Îmbinarea în Extras Unic',
        singleConfirmMessage: 'Îmbinarea într-un singur extras va recalcula soldul final. Acesta poate diferi de numerele extraselor originale. Folosiți această opțiune doar dacă sistemul dvs. necesită un singur extras consolidat.',
        confirmDownload: 'Descarcă'
      },
      validationCodes: {
        BALANCE_DISCONTINUITY: 'Discontinuitate de sold între extrase',
        MISSING_OPENING_BALANCE: 'Sold inițial lipsă (:60F:/:60M:)',
        MISSING_CLOSING_BALANCE: 'Sold final lipsă (:62F:/:62M:)',
        STRUCT_MISSING_25: 'Identificator cont lipsă (:25:)',
        STRUCT_MISSING_28: 'Număr extras lipsă (:28C:/:28:)',
        STRUCT_MISSING_60: 'Sold inițial lipsă (:60F:/:60M:)',
        STRUCT_MISSING_62: 'Sold final lipsă (:62F:/:62M:)',
        STRUCT_28_NONSTANDARD: 'Format nestandard pentru numărul extrasului (:28: în loc de :28C:)',
        STRUCT_NO_TAGS: 'Nu s-au găsit etichete MT940 în fișier',
        STRUCT_NO_STATEMENTS: 'Nu s-au găsit extrase valide',
        TXN_MALFORMED_61: 'Linie tranzacție malformată (:61:)',
        BAL_MALFORMED_65: 'Sold anticipat malformat (:65:)',
        DUP_FILE: 'Fișier duplicat detectat',
        DUP_STATEMENT: 'Extras duplicat detectat',
        DUP_TRANSACTION: 'Tranzacție duplicată detectată',
        MERGE_NO_STATEMENTS: 'Nu există extrase disponibile pentru îmbinare',
        MERGE_VALIDATION_ERRORS: 'Nu se poate îmbina: erori de validare prezente',
        MERGE_MULTIPLE_ACCOUNTS: 'Nu se poate îmbina: conturi multiple',
        MERGE_MULTIPLE_CURRENCIES: 'Nu se poate îmbina: valute multiple',
        MERGE_BALANCE_GAP: 'Nu se poate îmbina: diferență de sold între extrase',
        MERGE_NOT_CHRONOLOGICAL: 'Nu se poate îmbina: extrasele nu sunt în ordine cronologică'
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