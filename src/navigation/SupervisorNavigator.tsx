import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';
import { useIsDesktop, SIDEBAR_WIDTH } from '@/utils/responsive';
import WebTabBar from '@/components/WebTabBar';

import SupervisorDashboardScreen from '@/screens/supervisor/SupervisorDashboardScreen';
import SupervisorCasesScreen from '@/screens/supervisor/SupervisorCasesScreen';
import SupervisorCaseDetailScreen from '@/screens/supervisor/SupervisorCaseDetailScreen';
import CaseAssignmentScreen from '@/screens/supervisor/CaseAssignmentScreen';
import CaseDetailScreen from '@/screens/shared/CaseDetailScreen';
import ReportBugScreen from '@/screens/shared/ReportBugScreen';
import PendingApprovalsScreen from '@/screens/shared/PendingApprovalsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function CasesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupervisorCases" component={SupervisorCasesScreen} />
      <Stack.Screen name="SupervisorCaseDetail" component={SupervisorCaseDetailScreen} />
      <Stack.Screen name="CaseAssignment" component={CaseAssignmentScreen} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
    </Stack.Navigator>
  );
}

export default function SupervisorNavigator() {
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
            Approvals: 'person-add-outline',
            ReportBug: 'bug-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={SupervisorDashboardScreen} />
      <Tab.Screen name="Cases" component={CasesStack} />
      <Tab.Screen name="Approvals" component={PendingApprovalsScreen} options={{ tabBarLabel: 'Approvals' }} />
      <Tab.Screen name="ReportBug" component={ReportBugScreen} options={{ tabBarLabel: 'Report Bug' }} />
    </Tab.Navigator>
  );
}
