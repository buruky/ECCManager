import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/screens/auth/LoginScreen';
import ManagerNavigator from './ManagerNavigator';
import SupervisorNavigator from './SupervisorNavigator';
import CaseManagerNavigator from './CaseManagerNavigator';
import { COLORS } from '@/utils/constants';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'manager' ? (
          <Stack.Screen name="Manager" component={ManagerNavigator} />
        ) : user.role === 'supervisor' ? (
          <Stack.Screen name="Supervisor" component={SupervisorNavigator} />
        ) : (
          <Stack.Screen name="CaseManager" component={CaseManagerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
