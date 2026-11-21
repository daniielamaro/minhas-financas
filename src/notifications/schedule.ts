import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AlarmSettings } from '@/src/domain/types';

const CATEGORY = 'minhasfinancas_reminder';
const CHANNEL = 'minhasfinancas-alarme';
export const ACTION_REGISTER = 'registrar';
export const ACTION_SNOOZE = 'adiar';

export type ScheduleResult =
  | { scheduled: true }
  | { scheduled: false; reason: 'web' | 'permission' | 'empty' | 'disabled' };

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (configured || Platform.OS === 'web') return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
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
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Lembretes de Minhas Finanças',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
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

export async function rescheduleAlarm(alarm: AlarmSettings): Promise<ScheduleResult> {
  if (Platform.OS === 'web') return { scheduled: false, reason: 'web' };
  await configureNotifications();
  await cancelMinhasFinancasNotifications();
  if (!alarm.enabled) return { scheduled: false, reason: 'disabled' };
  if (alarm.days.length === 0) return { scheduled: false, reason: 'empty' };

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return { scheduled: false, reason: 'permission' };

  for (const day of alarm.days) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Minhas Finanças',
        body: 'Hora de atualizar seus ganhos e perdas de hoje em Minhas Finanças.',
        data: { kind: 'minhasfinancas-reminder' },
        categoryIdentifier: CATEGORY,
        sound: alarm.sound ? 'default' : false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day + 1,
        hour: alarm.hour,
        minute: alarm.minute,
        channelId: CHANNEL,
      },
    });
  }
  return { scheduled: true };
}

export async function snoozeAlarm(sound: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await configureNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Minhas Finanças',
      body: 'Hora de atualizar seus ganhos e perdas de hoje em Minhas Finanças.',
      data: { kind: 'minhasfinancas-snooze' },
      categoryIdentifier: CATEGORY,
      sound: sound ? 'default' : false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 15 * 60,
      channelId: CHANNEL,
    },
  });
}
