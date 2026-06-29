import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import ApprovalsScreen from '../screens/ApprovalsScreen';
import HomeScreen from '../screens/HomeScreen';
import LeavesScreen from '../screens/LeavesScreen';
import LoginScreen from '../screens/LoginScreen';
import MfaScreen from '../screens/MfaScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PayslipsScreen from '../screens/PayslipsScreen';
import PunchScreen from '../screens/PunchScreen';
import { colors } from '../theme/colors';

const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: '#fff',
        tabBarActiveTintColor: colors.navy,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: () => <TabIcon label="🏠" /> }}
      />
      <Tab.Screen
        name="Punch"
        component={PunchScreen}
        options={{ tabBarIcon: () => <TabIcon label="📍" /> }}
      />
      <Tab.Screen
        name="Leaves"
        component={LeavesScreen}
        options={{ tabBarIcon: () => <TabIcon label="🌴" /> }}
      />
      <Tab.Screen
        name="Payslips"
        component={PayslipsScreen}
        options={{ tabBarIcon: () => <TabIcon label="💰" /> }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarIcon: () => <TabIcon label="🔔" /> }}
      />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <RootStack.Screen name="Approvals" component={ApprovalsScreen} options={{ title: 'Approvals' }} />
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        <AppStack />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen
            name="Mfa"
            component={MfaScreen as React.ComponentType}
            options={{ headerShown: true, title: 'Verify MFA' }}
          />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
