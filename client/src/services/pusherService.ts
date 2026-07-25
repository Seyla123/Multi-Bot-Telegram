import Pusher from 'pusher-js';

// Access environment variables using Vite's import.meta.env
const pusherKey = import.meta.env.VITE_PUSHER_KEY || '';
const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || '';

let pusherInstance: Pusher | null = null;
let channelInstance: any = null;

export const initializePusher = () => {
  if (pusherInstance) return pusherInstance;

  if (!pusherKey || !pusherCluster) {
    console.warn('Pusher credentials missing. Realtime updates disabled.');
    return null;
  }

  Pusher.logToConsole = true;

  pusherInstance = new Pusher(pusherKey, {
    cluster: pusherCluster,
  });

  channelInstance = pusherInstance.subscribe('telegram-chat');
  
  return pusherInstance;
};

export const getPusherChannel = () => {
  if (!channelInstance) {
    initializePusher();
  }
  return channelInstance;
};
