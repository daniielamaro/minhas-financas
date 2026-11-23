import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AlarmSettings } from '@/src/domain/types';

const CATEGORY = 'minhasfinancas_reminder';
const CHANNEL_SOUND = 'minhasfinancas-alarme-v2';
const CHANNEL_SILENT = 'minhasfinancas-alarme-silencioso';
const SOUND = 'alarme.wav';
export const ACTION_REGISTER = 'registrar';
export const ACTION_SNOOZE = 'adiar';

export type ScheduleResult =
  | { scheduled: true; exact: boolean }
  | { scheduled: false; reason: 'web' | 'permission' | 'empty' | 'disabled' };

let configured = false;

function channelFor(sound: boolean) {
  return sound ? CHANNEL_SOUND : CHANNEL_SILENT;
}

function alarmContent(kind: string, sound: boolean) {
  return {
    title: 'Minhas Finanças',
    body: 'Hora de atualizar seus ganhos e perdas de hoje em Minhas Finanças.',
    data: { kind },
    categoryIdentifier: CATEGORY,
    sound: sound ? SOUND : false,
    priority: Notifications.AndroidNotificationPriority.MAX,
    interruptionLevel: 'timeSensitive' as const,
    color: '#005444',
    vibrate: sound ? [0, 700, 200, 700, 200, 1000] : undefined,
  };
}

export async function configureNotifications(): Promise<void> {
  if (configured || Platform.OS === 'web') return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    {
      identifier: ACTION_REGISTER,
      buttonTitle: 'Registrar',
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: 'Adiar 15 min',
      options: { opensAppToForeground: true },
    },
  ]);
  if (Platform.OS === 'android') {
    await Notifications.deleteNotificationChannelAsync('minhasfinancas-alarme').catch(() => undefined);
    await Notifications.deleteNotificationChannelAsync('fluxo-alarme').catch(() => undefined);
    await Notifications.setNotificationChannelAsync(CHANNEL_SOUND, {
      name: 'Alarme de Minhas Finanças',
      importance: Notifications.AndroidImportance.MAX,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: SOUND,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
      vibrationPattern: [0, 700, 200, 700, 200, 1000],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#005444',
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_SILENT, {
      name: 'Alarme silencioso',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      enableVibrate: false,
    });
  }
}

async function exactAlarmGranted(request: boolean): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const current = await Notifications.getExactAlarmPermissionsAsync();
    if (current.granted || !request) return current.granted;
    const asked = await Notifications.requestExactAlarmPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

async function cancelMinhasFinancasNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => {
        const kind = item.content.data?.kind;
        return kind === 'minhasfinancas-reminder' || kind === 'minhasfinancas-snooze';
      })
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function rescheduleAlarm(alarm: AlarmSettings, requestExact = false): Promise<ScheduleResult> {
  if (Platform.OS === 'web') return { scheduled: false, reason: 'web' };
  await configureNotifications();
  await cancelMinhasFinancasNotifications();
  if (!alarm.enabled) return { scheduled: false, reason: 'disabled' };
  if (alarm.days.length === 0) return { scheduled: false, reason: 'empty' };

  const permission = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  if (permission.status !== 'granted') return { scheduled: false, reason: 'permission' };

  const exact = await exactAlarmGranted(requestExact);
  const channelId = channelFor(alarm.sound);
  for (const day of alarm.days) {
    await Notifications.scheduleNotificationAsync({
      content: alarmContent('minhasfinancas-reminder', alarm.sound),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day + 1,
        hour: alarm.hour,
        minute: alarm.minute,
        channelId,
        ...(Platform.OS === 'android' ? { delivery: exact ? ('alarmClock' as const) : ('bestEffort' as const) } : {}),
      },
    });
  }
  return { scheduled: true, exact };
}

export async function snoozeAlarm(sound: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await configureNotifications();
  const exact = await exactAlarmGranted(false);
  await Notifications.scheduleNotificationAsync({
    content: alarmContent('minhasfinancas-snooze', sound),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 15 * 60 * 1000),
      channelId: channelFor(sound),
      ...(Platform.OS === 'android' ? { delivery: exact ? ('alarmClock' as const) : ('bestEffort' as const) } : {}),
    },
  });
}
