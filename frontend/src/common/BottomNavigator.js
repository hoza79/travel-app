import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React, { useContext } from "react";
import { Image, View, Text } from "react-native";

import HomeScreen from "../screens/HomeScreen";
import MessagesScreen from "../screens/MessagesScreen";
import PostScreen from "../screens/PostScreen";
import ProfileSelfScreen from "../screens/ProfileSelfScreen"; // ⭐ CHANGED
import NotificationsScreen from "../screens/NotificationScreen";

import { NotificationContext } from "../context/NotificationContext";
import { MessageContext } from "../context/MessageContext";

const Tab = createBottomTabNavigator();

const NotificationTabIcon = ({ focused }) => {
  const { unreadCount } = useContext(NotificationContext);

  return (
    <View>
      <Image
        source={require("../assets/notifications.png")}
        style={{
          width: 35,
          height: 35,
          tintColor: focused ? "white" : "#7282ab",
        }}
      />

      {unreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            minWidth: 18,
            height: 18,
            borderRadius: 10,
            backgroundColor: "white",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text
            style={{
              color: "#061237",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </Text>
        </View>
      )}
    </View>
  );
};

const MessageTabIcon = ({ focused }) => {
  const { unreadMessages } = useContext(MessageContext);

  return (
    <View>
      <Image
        source={require("../assets/messages.png")}
        style={{
          width: 35,
          height: 35,
          tintColor: focused ? "white" : "#7282ab",
        }}
      />

      {unreadMessages > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            minWidth: 18,
            height: 18,
            borderRadius: 10,
            backgroundColor: "white",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text
            style={{
              color: "#061237",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {unreadMessages > 99 ? "99+" : String(unreadMessages)}
          </Text>
        </View>
      )}
    </View>
  );
};

const BottomNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          borderRadius: 30,
          backgroundColor: "rgba(5, 22, 80, 0.7)",
          borderWidth: 0.3,
          borderColor: "rgba(255,255,255,0.1)",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 5 },
          shadowRadius: 8,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "#7282ab",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/home.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ focused }) => <MessageTabIcon focused={focused} />,
        }}
      />

      <Tab.Screen
        name="Post"
        component={PostScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/post.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <NotificationTabIcon focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileSelfScreen} // ⭐ FIX — always YOUR profile
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/profile.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomNavigator;
