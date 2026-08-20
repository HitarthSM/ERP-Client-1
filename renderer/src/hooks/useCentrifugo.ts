import { useEffect, useRef } from 'react';
import { Centrifuge, Subscription } from 'centrifuge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { get } from '../api';
import type { MeResponse } from '../services/auth.service';

const CENTRIFUGO_WS_URL =
  (import.meta.env.VITE_CENTRIFUGO_URL as string | undefined) ||
  'wss://centrifugo-latest-ow5v.onrender.com/connection/websocket';

interface NotificationPublication {
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

function requestOsPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

function showOsNotification(title: string, body?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/icon.png' });
}

function attachSub(
  cf: Centrifuge,
  channel: string,
  onPublication: (payload: NotificationPublication) => void,
): Subscription {
  const sub = cf.newSubscription(channel);
  sub.on('publication', (ctx) => onPublication(ctx.data as NotificationPublication));
  sub.on('error', (ctx) => console.error(`[centrifugo] sub error on ${channel}`, ctx.error));
  sub.subscribe();
  return sub;
}

export function useCentrifugo(user: MeResponse | null): void {
  const qc = useQueryClient();
  const cfRef = useRef<Centrifuge | null>(null);

  useEffect(() => {
    requestOsPermission();
  }, []);

  useEffect(() => {
    const userId = user?.id;
    const orgId  = user?.organization?.id;
    if (!userId) return;

    const cf = new Centrifuge(CENTRIFUGO_WS_URL, {
      getToken: async () => {
        const res = await get<{ token: string }>('/api/v1/notifications/centrifugo-token');
        return res.token;
      },
    });

    const onPublication = (payload: NotificationPublication): void => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      const title = payload.title ?? 'New notification';
      toast(title, { description: payload.body });
      showOsNotification(title, payload.body);
    };

    const userSub = attachSub(cf, `user_${userId}`, onPublication);
    const orgSub  = orgId ? attachSub(cf, `org_${orgId}`, onPublication) : null;

    let notifiedOfError = false;
    cf.on('error', (ctx) => {
      console.error('[centrifugo] connection error', ctx.error);
      if (!notifiedOfError) {
        notifiedOfError = true;
        toast.error('Real-time notifications unavailable');
      }
    });
    cf.connect();
    cfRef.current = cf;

    return () => {
      userSub.unsubscribe();
      orgSub?.unsubscribe();
      cf.disconnect();
      cfRef.current = null;
    };
  }, [user?.id, user?.organization?.id, qc]);
}
