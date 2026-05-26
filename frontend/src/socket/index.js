import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

let socket = null;
let readyCallbacks = [];
let connectCallbacks = [];

export let activeChatId = null;
export const setActiveChat = (id) => {
  activeChatId = id;
};

let notifyCallbacks = [];

export const onNotify = (cb) => {
  notifyCallbacks.push(cb);

  return () => {
    notifyCallbacks = notifyCallbacks.filter((fn) => fn !== cb);
  };
};

export const onSocketConnected = (cb) => {
  connectCallbacks.push(cb);

  if (socket?.connected) {
    cb();
  }

  return () => {
    connectCallbacks = connectCallbacks.filter((fn) => fn !== cb);
  };
};

const identifyCurrentUser = async () => {
  const userId = Number(await AsyncStorage.getItem("userId"));

  if (socket?.connected && userId) {
    socket.emit("identify", { userId });
  }
};

export const connectSocket = async ({ force = false } = {}) => {
  const token = await AsyncStorage.getItem("token");

  if (socket && socket.connected && !force) {
    await identifyCurrentUser();
    return socket;
  }

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
    await identifyCurrentUser();

    readyCallbacks.forEach((cb) => cb());
    readyCallbacks = [];
    connectCallbacks.forEach((cb) => cb());
  });

  socket.on("new_notification", (data) => {
    notifyCallbacks.forEach((fn) => fn(data));
  });

  socket.on("notification_deleted", (data) => {
    notifyCallbacks.forEach((fn) => fn(data));
  });

  socket.on("newMessage", (msg) => {
    if (msg.conversationId !== activeChatId) {
      notifyCallbacks.forEach((fn) => fn(msg));
    }
  });

  return socket;
};

export const reconnectSocketAfterAuth = async () => {
  return connectSocket({ force: true });
};

export const getSocket = () => socket;

export const onSocketReady = (callback) => {
  if (socket && socket.connected) {
    callback();
    return () => {};
  }

  readyCallbacks.push(callback);

  if (!socket) {
    connectSocket().catch(() => {});
  }

  return () => {
    readyCallbacks = readyCallbacks.filter((cb) => cb !== callback);
  };
};

export const disconnectSocket = () => {
  if (!socket) return;

  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {}

  socket = null;
};
