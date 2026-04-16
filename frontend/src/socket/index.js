// src/socket/index.js
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

let socket = null;
let readyCallbacks = [];

export let activeChatId = null;
export const setActiveChat = (id) => {
  activeChatId = id;
};

let notifyCallbacks = [];

export const onNotify = (cb) => {
  notifyCallbacks.push(cb);
};

export const connectSocket = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

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
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    socket.on("connect", async () => {
      const userId = Number(await AsyncStorage.getItem("userId"));
      if (userId) {
        socket.emit("chat_identify", { userId });
      }

      try {
        readyCallbacks.forEach((cb) => cb());
      } finally {
        readyCallbacks = [];
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("APP SOCKET DISCONNECTED:", reason);
    });

    socket.on("newMessage", (msg) => {
      // If the message belongs to another conversation → notify
      if (msg.conversationId !== activeChatId) {
        notifyCallbacks.forEach((fn) => fn(msg));
      }
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
