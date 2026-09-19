import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

const resources = {
  en: {
    translation: {
      home: "Home", snap: "Snap & Lot", prices: "Price Board",
      recyclers: "Recyclers", ledger: "Trust Ledger", earnings: "Earnings",
      safety: "Safety", settings: "Settings", listen: "Listen",
      weight: "Weight (kg)", value: "Estimated value",
      confirm: "Confirm", retry: "Retry", offline: "Offline — saved, will sync",
      online: "Online", cashDefault: "Cash payment (default)",
      digitalToggle: "Enable digital payments (optional)",
      language: "Language", pending: "Pending dues", total: "Total earned",
      history: "History", authorize: "Authorized", noBurn: "Never burn waste",
      howItWorks: "How it works", stepPhoto: "Snap photo", stepWeight: "Add weight",
      stepCash: "Get paid", todayRates: "Today's rates", listenAll: "Hear all",
      myLots: "My lots", viewAll: "View all", findRecycler: "Find recycler",
      todayEarn: "Today's earnings", safetyHeed: "Safety — take care",
      ready: "Ready", emptyLots: "No lots yet — snap your first photo",
      retake: "Retake", checkItem: "Check the item", saveLot: "Save lot",
    },
  },
  hi: {
    translation: {
      home: "होम", snap: "फोटो और लाट", prices: "भाव सूची",
      recyclers: "रीसायकलर", ledger: "विश्वास बही", earnings: "कमाई",
      safety: "सुरक्षा", settings: "सेटिंग", listen: "सुनें",
      weight: "वज़न (किलो)", value: "अनुमानित मूल्य",
      confirm: "पुष्टि करें", retry: "पुनः प्रयास", offline: "ऑफ़लाइन — सहेजा गया, सिंक होगा",
      online: "ऑनलाइन", cashDefault: "नकद भुगतान (डिफ़ॉल्ट)",
      digitalToggle: "डिजिटल भुगतान चालू करें (वैकल्पिक)",
      language: "भाषा", pending: "बकाया राशि", total: "कुल कमाई",
      history: "लेन-देन", authorize: "अधिकृत", noBurn: "कचरा कभी न जलाएं",
      howItWorks: "कैसे काम करें?", stepPhoto: "फोटो लें", stepWeight: "वजन डालें",
      stepCash: "पैसे पाएँ", todayRates: "आज का भाव", listenAll: "सब सुनें",
      myLots: "मेरा सामान", viewAll: "सब देखें", findRecycler: "ग्राहक खोजें",
      todayEarn: "आज की कमाई", safetyHeed: "सुरक्षा - ध्यान दें",
      ready: "तैयार है", emptyLots: "अभी कोई सामान नहीं — पहली फोटो लें",
      retake: "दोबारा लें", checkItem: "सामान जांचें", saveLot: "लाट सहेजें",
    },
  },
  mr: {
    translation: {
      home: "मुख्यपृष्ठ", snap: "फोटो आणि लॉट", prices: "भाव फलक",
      recyclers: "पुनर्वापरदार", ledger: "विश्वास खाते", earnings: "कमाई",
      safety: "सुरक्षा", settings: "सेटिंग्ज", listen: "ऐका",
      weight: "वजन (किलो)", value: "अंदाजे मूल्य",
      confirm: "निश्चित करा", retry: "पुन्हा प्रयत्न", offline: "ऑफलाइन — जतन केले, सिंक होईल",
      online: "ऑनलाइन", cashDefault: "रोख पेमेंट (मूलभूत)",
      digitalToggle: "डिजिटल पेमेंट सुरू करा (पर्यायी)",
      language: "भाषा", pending: "थकबाकी", total: "एकूण कमाई",
      history: "व्यवहार", authorize: "अधिकृत", noBurn: "कचरा कधीही जाळू नका",
      howItWorks: "कसे काम करते?", stepPhoto: "फोटो घ्या", stepWeight: "वजन टाका",
      stepCash: "पैसे मिळवा", todayRates: "आजचे भाव", listenAll: "सर्व ऐका",
      myLots: "माझे साहित्य", viewAll: "सर्व पहा", findRecycler: "ग्राहक शोधा",
      todayEarn: "आजची कमाई", safetyHeed: "सुरक्षा - लक्ष द्या",
      ready: "तयार आहे", emptyLots: "अद्याप सामान नाही — पहिला फोटो घ्या",
      retake: "पुन्हा घ्या", checkItem: "साहित्य तपासा", saveLot: "लॉट जतन करा",
    },
  },
  ml: {
    translation: {
      home: "ഹോം", snap: "ഫോട്ടോ & ലോട്ട്", prices: "വില പട്ടിക",
      recyclers: "റീസൈക്ലർമാർ", ledger: "ട്രസ്റ്റ് ലെഡ്ജർ", earnings: "വരുമാനം",
      safety: "സുരക്ഷ", settings: "ക്രമീകരണങ്ങൾ", listen: "കേൾക്കുക",
      weight: "ഭാരം (കിലോ)", value: "ഏകദേശ വില",
      confirm: "സ്ഥിരീകരിക്കുക", retry: "വീണ്ടും ശ്രമിക്കുക", offline: "ഓഫ്‌ലൈൻ — സംരക്ഷിച്ചു, സിങ്ക് ചെയ്യും",
      online: "ഓൺലൈൻ", cashDefault: "പണം നൽകൽ (സ്ഥിരസ്ഥിതി)",
      digitalToggle: "ഡിജിറ്റൽ പേയ്‌മെന്റുകൾ പ്രവർത്തനക്ഷമമാക്കുക",
      language: "ഭാഷ", pending: "കുടിശ്ശിക", total: "മൊത്തം സമ്പാദിച്ചത്",
      history: "ചരിത്രം", authorize: "അംഗീകരിച്ചു", noBurn: "മാലിന്യം ഒരിക്കലും കത്തിക്കരുത്",
      howItWorks: "ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു", stepPhoto: "ഫോട്ടോ എടുക്കുക", stepWeight: "ഭാരം ചേർക്കുക",
      stepCash: "പണം നേടുക", todayRates: "ഇന്നത്തെ നിരക്കുകൾ", listenAll: "എല്ലാം കേൾക്കുക",
      myLots: "എന്റെ സാധനങ്ങൾ", viewAll: "എല്ലാം കാണുക", findRecycler: "റീസൈക്ലറെ കണ്ടെത്തുക",
      todayEarn: "ഇന്നത്തെ വരുമാനം", safetyHeed: "സുരക്ഷ — ശ്രദ്ധിക്കുക",
      ready: "തയ്യാറാണ്", emptyLots: "ഇതുവരെ സാധനങ്ങളില്ല — നിങ്ങളുടെ ആദ്യ ഫോട്ടോ എടുക്കുക",
      retake: "വീണ്ടും എടുക്കുക", checkItem: "സാധനം പരിശോധിക്കുക", saveLot: "ലോട്ട് സംരക്ഷിക്കുക",
    },
  },
} as const;

export type AppLanguage = keyof typeof resources;

const device = Localization.getLocales()[0]?.languageCode ?? "en";
const initialLng: AppLanguage = "en"; // Enforced English as primary language

// Bind the instance synchronously at import time (proven: setI18n runs
// inside .init(), not after) so no first render can hit NO_I18NEXT_INSTANCE.
const ready = i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

/** Resolves once inline resources are loaded — await in boot gating. */
export function initI18n(): Promise<void> {
  return ready.then(() => undefined);
}

export const ttsLocale: Record<AppLanguage, string> = {
  mr: "mr-IN",
  hi: "hi-IN",
  ml: "ml-IN",
  en: "en-IN",
};

export default i18n;
