import React, { useState, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type LanguageCode = 'en' | 'hi' | 'mr';

const translations = {
  en: {
    Weight: "Weight",
    Payout: "Payout",
    "Scale Connected": "Scale Connected",
    "Sync Pending": "Sync Pending",
    "Scan QR": "Scan QR"
  },
  hi: {
    Weight: "वजन (Weight)",
    Payout: "भुगतान (Payout)",
    "Scale Connected": "स्केल कनेक्टेड है",
    "Sync Pending": "सिंक पेंडिंग",
    "Scan QR": "QR स्कैन करें"
  },
  mr: {
    Weight: "वजन (Weight)",
    Payout: "पेआउट (Payout)",
    "Scale Connected": "स्केल जोडलेले आहे",
    "Sync Pending": "सिंक प्रलंबित",
    "Scan QR": "QR स्कॅन करा"
  }
};

interface I18nContextProps {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: keyof typeof translations['en']) => string;
}

const I18nContext = createContext<I18nContextProps>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key
});

export const I18nProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('en');

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || translations['en'][key];
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

export const LanguageToggle = () => {
  const { language, setLanguage } = useI18n();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setLanguage('en')} style={[styles.btn, language === 'en' && styles.active]}>
        <Text style={styles.text}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setLanguage('hi')} style={[styles.btn, language === 'hi' && styles.active]}>
        <Text style={styles.text}>HI</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setLanguage('mr')} style={[styles.btn, language === 'mr' && styles.active]}>
        <Text style={styles.text}>MR</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, padding: 10, justifyContent: 'center' },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#333' },
  active: { backgroundColor: '#00E676' },
  text: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
