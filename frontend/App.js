// App.js
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LandingScreen from "./src/screens/LandingScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import CompleteProfileScreen from "./src/screens/CompleteProfileScreen";
import HomeScreen from "./src/screens/HomeScreen";
import BottomNavigator from "./src/common/BottomNavigator";
import ChatTestScreen from "./src/screens/ChatTestScreen";
import ProfilePassengerView from "./src/screens/ProfilePassengerView";
import ChatScreen from "./src/screens/ChatScreen";

import { connectSocket } from "./src/socket";
import { NotificationProvider } from "./src/context/NotificationContext";
import { MessageProvider } from "./src/context/MessageContext"; // 🔥 NEW

const Stack = createNativeStackNavigator();

export default function App() {
  // 🔥 Connect socket ONE TIME here.
  useEffect(() => {
    connectSocket();
  }, []);

  return (
    <SafeAreaProvider style={styles.container}>
      <NotificationProvider>
        <MessageProvider>
          <NavigationContainer>
            <StatusBar style="light" />

            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Landing" component={LandingScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen
                name="CompleteProfileScreen"
                component={CompleteProfileScreen}
              />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Profile" component={ProfilePassengerView} />

              <Stack.Screen
                name="BottomNavigator"
                options={{ headerShown: false }}
              >
                {() => (
                  <SafeAreaView
                    style={{ flex: 1, backgroundColor: "#061237" }}
                    edges={[]}
                  >
                    <BottomNavigator />
                  </SafeAreaView>
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </MessageProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061237",
  },
});
