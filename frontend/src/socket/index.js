// src/socket/index.js
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

let socket = null;
let readyCallbacks = [];

/**
 * Create or return existing socket.
 * idempotent: if already connected it returns that socket.
 */
export const connectSocket = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const userId = Number(await AsyncStorage.getItem("userId"));

    // If socket exists and is connected, just return it
    if (socket && socket.connected) {
      return socket;
    }

    // If socket exists but not connected, attempt to disconnect cleanly first
    if (socket) {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch (e) {}
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
      console.log("APP SOCKET = CONNECTED");
      // emit identify if we have userId
      if (userId && socket && socket.connected) {
        socket.emit("identify", { userId });
      }

      // flush ready callbacks
      try {
        readyCallbacks.forEach((cb) => {
          try {
            cb();
          } catch (e) {}
        });
      } finally {
        readyCallbacks = [];
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("APP SOCKET = DISCONNECTED", reason);
    });

    // helpful debug
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

/**
 * Calls callback when socket exists and is connected.
 * If socket already ready -> immediate call.
 * Multiple callers are queued until ready.
 */
export const onSocketReady = (callback) => {
  if (socket && socket.connected) {
    callback();
    return;
  }

  readyCallbacks.push(callback);

  // safety: if socket null, try to create it (best-effort)
  if (!socket) {
    // fire-and-forget; errors are logged in connectSocket
    connectSocket().catch((e) => {});
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
  } catch (e) {}
  socket = null;
};
