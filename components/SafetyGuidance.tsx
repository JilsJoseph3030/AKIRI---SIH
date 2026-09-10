import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useI18n } from '../lib/i18n';

export const SafetyGuidance = () => {
  const { language, t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const playAudioGuidelines = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    
    try {
      // In a real environment, load audio assets based on the active language context.
      // const asset = language === 'mr' ? require('../assets/audio/safety_mr.mp3') : require('../assets/audio/safety_hi.mp3');
      // const { sound: newSound } = await Audio.Sound.createAsync(asset);
      // setSound(newSound);
      // await newSound.playAsync();
      
      Alert.alert("Audio Playing", `🔊 Playing safety guidelines aloud in ${language.toUpperCase()}...`);
      
      // Mock playback duration
      setTimeout(() => setIsPlaying(false), 3000);
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsPlaying(false);
    }
  };

  // Cleanup audio on unmount
  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const HazardCard = ({ title, emoji, description }: { title: string, emoji: string, description: string }) => (
    <View style={styles.card}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Hazmat Flagging Notice */}
        <View style={styles.hazmatBanner}>
          <Text style={styles.hazmatIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.hazmatTitle}>HAZMAT ALERT</Text>
            <Text style={styles.hazmatText}>
              Intact Lithium-Ion batteries and hazardous items are flagged for direct pickup by Authorized Recyclers. Do not dismantle!
            </Text>
          </View>
        </View>

        {/* Vernacular Audio Prompt */}
        <TouchableOpacity 
          style={[styles.audioButton, isPlaying && styles.audioButtonActive]} 
          onPress={playAudioGuidelines}
          disabled={isPlaying}
        >
          <Text style={styles.audioIcon}>🔊</Text>
          <Text style={styles.audioText}>
            {isPlaying ? "Playing Guidelines..." : "Listen to Safety Rules (Hindi/Marathi)"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Dangers to Avoid (DON'T)</Text>

        <HazardCard 
          title="No Open Cable Burning" 
          emoji="🚫 🔥🔌" 
          description="Burning wires releases toxic smoke and damages your lungs." 
        />
        <HazardCard 
          title="No Acid Leaching" 
          emoji="🚫 🧪💧" 
          description="Using acids to extract gold poisons the groundwater and burns skin." 
        />
        <HazardCard 
          title="No CRT Tube Cracking" 
          emoji="🚫 🔨📺" 
          description="Breaking old TVs releases poisonous lead dust into the air." 
        />

        <Text style={[styles.sectionHeader, { color: '#00E676', marginTop: 10 }]}>Lithium-Ion Battery Safety (DO)</Text>

        <View style={styles.doDontContainer}>
          <View style={styles.doBox}>
            <Text style={styles.doDontTitle}>✅ DO</Text>
            <Text style={styles.doDontEmoji}>📦 🔋</Text>
            <Text style={styles.doDontText}>Store safely in dry boxes.</Text>
            <Text style={styles.doDontText}>Keep away from sunlight.</Text>
          </View>

          <View style={styles.dontBox}>
            <Text style={styles.doDontTitle}>❌ DON'T</Text>
            <Text style={styles.doDontEmoji}>🔨 🔥</Text>
            <Text style={styles.doDontText}>Never puncture or hit.</Text>
            <Text style={styles.doDontText}>Never throw in fire.</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  hazmatBanner: { flexDirection: 'row', backgroundColor: '#D32F2F', padding: 16, borderRadius: 12, marginBottom: 24, alignItems: 'center' },
  hazmatIcon: { fontSize: 32, marginRight: 16 },
  hazmatTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  hazmatText: { color: '#FFCDD2', fontSize: 14, marginTop: 4, fontWeight: 'bold' },
  audioButton: { flexDirection: 'row', backgroundColor: '#2962FF', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 24, elevation: 4 },
  audioButtonActive: { backgroundColor: '#1E88E5' },
  audioIcon: { fontSize: 24, marginRight: 12 },
  audioText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  sectionHeader: { color: '#FF5252', fontSize: 22, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase' },
  card: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cardEmoji: { fontSize: 36, marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cardDescription: { color: '#AAA', fontSize: 14, marginTop: 4 },
  doDontContainer: { flexDirection: 'row', gap: 12 },
  doBox: { flex: 1, backgroundColor: '#1B5E20', padding: 16, borderRadius: 12, alignItems: 'center' },
  dontBox: { flex: 1, backgroundColor: '#b71c1c', padding: 16, borderRadius: 12, alignItems: 'center' },
  doDontTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  doDontEmoji: { fontSize: 32, marginBottom: 8 },
  doDontText: { color: '#FFF', fontSize: 14, textAlign: 'center', marginBottom: 4 }
});
