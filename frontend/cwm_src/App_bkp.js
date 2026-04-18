import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import CreateAccountScreen from './screens/CreateAccountScreen';
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';
import ModifyPreferencesScreen from './screens/ModifyPreferencesScreen';
import { Font } from 'expo-font';
import { FontAwesome } from '@expo/vector-icons';

global.MyStorage = AsyncStorage

const Stack = createStackNavigator();

const App = () => {
  useEffect(() => {
    loadFonts();
  }, []);

  const loadFonts = async () => {
    await Font.loadAsync({
      // Load FontAwesome font
      ...FontAwesome.font,
      // You can load other fonts here if needed
    });
  };

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="CreateProfile" component={ModifyPreferencesScreen}  />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
