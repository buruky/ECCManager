import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';
import { useIsDesktop, SIDEBAR_WIDTH } from '@/utils/responsive';
import WebTabBar from '@/components/WebTabBar';

import ManagerDashboardScreen from '@/screens/manager/ManagerDashboardScreen';
import AllCasesScreen from '@/screens/manager/AllCasesScreen';
import CreateCaseScreen from '@/screens/manager/CreateCaseScreen';
import UserManagementScreen from '@/screens/manager/UserManagementScreen';
import CreateUserScreen from '@/screens/manager/CreateUserScreen';
import EditUserScreen from '@/screens/manager/EditUserScreen';
import AuditLogScreen from '@/screens/manager/AuditLogScreen';
import CaseDetailScreen from '@/screens/shared/CaseDetailScreen';
import CaseAssignmentScreen from '@/screens/supervisor/CaseAssignmentScreen';
import ReportBugScreen from '@/screens/shared/ReportBugScreen';
import PendingApprovalsScreen from '@/screens/shared/PendingApprovalsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function CasesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AllCases" component={AllCasesScreen} />
      <Stack.Screen name="CreateCase" component={CreateCaseScreen} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
      <Stack.Screen name="CaseAssignment" component={CaseAssignmentScreen} />
    </Stack.Navigator>
  );
}

function UsersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen name="CreateUser" component={CreateUserScreen} />
      <Stack.Screen name="EditUser" component={EditUserScreen} />
      <Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} />
    </Stack.Navigator>
  );
}

export default function ManagerNavigator() {
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
            Users: 'people-outline',
            AuditLog: 'list-outline',
            ReportBug: 'bug-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ManagerDashboardScreen} />
      <Tab.Screen name="Cases" component={CasesStack} />
      <Tab.Screen name="Users" component={UsersStack} />
      <Tab.Screen name="AuditLog" component={AuditLogScreen} options={{ tabBarLabel: 'Audit Log' }} />
      <Tab.Screen name="ReportBug" component={ReportBugScreen} options={{ tabBarLabel: 'Report Bug' }} />
    </Tab.Navigator>
  );
}
