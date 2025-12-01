// src/socket/index.js
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

let socket = null;
let readyCallbacks = [];

// FIX: delayed identify, safe reconnect
export const connectSocket = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const userId = Number(await AsyncStorage.getItem("userId"));

    if (socket && socket.connected) return socket;

    if (socket) {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch {}
      socket = null;
    }

    socket = io(BASE_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
    });

    socket.on("connect", async () => {
      const finalUserId = Number(await AsyncStorage.getItem("userId"));

      if (finalUserId && socket.connected) {
        socket.emit("identify", { userId: finalUserId });
      }

      try {
        readyCallbacks.forEach((cb) => cb());
      } finally {
        readyCallbacks = [];
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("APP SOCKET = DISCONNECTED", reason);
    });

    socket.on("identify_ack", (data) => {
      console.log("[SOCKET] identify_ack =", data);
    });

    return socket;
  } catch (e) {
    console.log("[socket] connect error", e);
    throw e;
  }
};

export const getSocket = () => socket;

export const onSocketReady = (callback) => {
  if (socket && socket.connected) {
    callback();
    return;
  }

  readyCallbacks.push(callback);

  if (!socket) {
    connectSocket().catch(() => {});
  }
};

export const subscribe = (event, callback) => {
  if (!socket) return;
  socket.on(event, callback);
};

export const disconnectSocket = () => {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {}
  socket = null;
};
