import { io } from 'socket.io-client';

// En dev conecta al servidor por IP para que funcione desde el celu en la misma red
const SERVER_URL = import.meta.env.VITE_SERVER_URL
  ?? (import.meta.env.DEV ? 'http://192.168.1.19:3001' : window.location.origin);

export const socket = io(SERVER_URL, { autoConnect: false });
