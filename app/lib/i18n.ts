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
    },
  },
} as const;

export type AppLanguage = keyof typeof resources;

export async function initI18n(): Promise<void> {
  const device = Localization.getLocales()[0]?.languageCode ?? "en";
  const lng: AppLanguage =
    device === "mr" ? "mr" : device === "hi" ? "hi" : "en";
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export const ttsLocale: Record<AppLanguage, string> = {
  mr: "mr-IN",
  hi: "hi-IN",
  en: "en-IN",
};

export default i18n;
