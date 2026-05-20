import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import MfaEnrollmentScreen from '@/screens/shared/MfaEnrollmentScreen';
import ManagerNavigator from './ManagerNavigator';
import SupervisorNavigator from './SupervisorNavigator';
import CaseManagerNavigator from './CaseManagerNavigator';
import { COLORS } from '@/utils/constants';

const Stack = createStackNavigator();
const AuthedStack = createStackNavigator();

function AuthenticatedNavigator() {
  const { user } = useAuth();
  return (
    <AuthedStack.Navigator screenOptions={{ headerShown: false }}>
      {user?.role === 'manager' ? (
        <AuthedStack.Screen name="ManagerTabs" component={ManagerNavigator} />
      ) : user?.role === 'supervisor' ? (
        <AuthedStack.Screen name="SupervisorTabs" component={SupervisorNavigator} />
      ) : (
        <AuthedStack.Screen name="CaseManagerTabs" component={CaseManagerNavigator} />
      )}
      <AuthedStack.Screen name="MfaEnrollment" component={MfaEnrollmentScreen} />
    </AuthedStack.Navigator>
  );
}

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
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <Stack.Screen name="App" component={AuthenticatedNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
