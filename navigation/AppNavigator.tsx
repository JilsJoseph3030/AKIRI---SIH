import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { getCurrentSession, AuthSession } from '../lib/auth';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Placeholder screens
const HomeDashboard = () => <View><Text>Home Dashboard</Text></View>;
const ScaleIngestion = () => <View><Text>Scale Ingestion</Text></View>;
const TransactionLedger = () => <View><Text>Transaction Ledger</Text></View>;
const SafetyGuidance = () => <View><Text>Safety Guidance</Text></View>;

// Tab Navigator for authenticated users
const MainTabs = ({ role }: { role: string }) => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeDashboard" component={HomeDashboard} />
      <Tab.Screen name="ScaleIngestion" component={ScaleIngestion} />
      <Tab.Screen name="SafetyGuidance" component={SafetyGuidance} />
      
      {/* RBAC Route Protection: Hide sensitive ledger data from informal collectors */}
      {(role === 'AGGREGATOR_HUB' || role === 'AUTHORIZED_RECYCLER') && (
        <Tab.Screen name="TransactionLedger" component={TransactionLedger} />
      )}
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentSession().then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#00E676" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main">
            {() => <MainTabs role={session.role} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login" component={() => <View><Text>Login Screen</Text></View>} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
