import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { CasesProvider } from '@/contexts/CasesContext';
import AppNavigator from '@/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CasesProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </CasesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
