import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';
import { useIsDesktop, SIDEBAR_WIDTH } from '@/utils/responsive';
import WebTabBar from '@/components/WebTabBar';

import CaseManagerDashboardScreen from '@/screens/casemanager/CaseManagerDashboardScreen';
import MyCasesScreen from '@/screens/casemanager/MyCasesScreen';
import CaseDetailScreen from '@/screens/shared/CaseDetailScreen';
import ReportBugScreen from '@/screens/shared/ReportBugScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={CaseManagerDashboardScreen} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
    </Stack.Navigator>
  );
}

function CasesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyCases" component={MyCasesScreen} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
    </Stack.Navigator>
  );
}

export default function CaseManagerNavigator() {
  const isDesktop = useIsDesktop();

  return (
    <Tab.Navigator
      tabBar={(props) => <WebTabBar {...props} />}
      sceneContainerStyle={isDesktop ? { marginLeft: SIDEBAR_WIDTH } : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { borderTopColor: COLORS.border },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: 'home-outline',
            Cases: 'folder-outline',
            ReportBug: 'bug-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Cases" component={CasesStack} options={{ tabBarLabel: 'My Cases' }} />
      <Tab.Screen name="ReportBug" component={ReportBugScreen} options={{ tabBarLabel: 'Report Bug' }} />
    </Tab.Navigator>
  );
}
