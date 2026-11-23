import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createProfile as persistCreateProfile,
  deleteEntry,
  deleteProfile as persistDeleteProfile,
  loadActiveProfile,
  loadAlarm,
  loadEntries,
  loadProfiles,
  materializeRecurrences,
  openFinanceDb,
  saveAlarm as persistAlarm,
  saveEntry as persistEntry,
  selectProfile as persistSelectProfile,
  updateProfile as persistUpdateProfile,
} from '@/src/db/database';
import { todayISO } from '@/src/domain/dates';
import { rescheduleAlarm, type ScheduleResult } from '@/src/notifications/schedule';
import {
  defaultAlarm,
  type AlarmSettings,
  type Entry,
  type EntryDraft,
  type LedgerProfile,
  type ProfileKind,
} from '@/src/domain/types';

function noticeFor(result: ScheduleResult): string | null {
  if (result.scheduled) {
    return result.exact
      ? null
      : 'O alarme foi salvo, mas o Android pode atrasar o toque. Permita alarmes e lembretes exatos para Minhas Finanças.';
  }
  if (result.reason === 'permission') {
    return 'A permissão de notificação está negada. Ative nas configurações do aparelho.';
  }
  if (result.reason === 'web') {
    return 'A preferência ficou salva. O alarme no horário funciona no celular, não neste navegador.';
  }
  if (result.reason === 'empty') return 'Escolha ao menos um dia da semana.';
  return null;
}

type FinanceContextValue = {
  ready: boolean;
  error: string | null;
  entries: Entry[];
  profiles: LedgerProfile[];
  profile: LedgerProfile | null;
  alarm: AlarmSettings;
  alarmNotice: string | null;
  createProfile: (input: { name: string; kind: ProfileKind }) => Promise<void>;
  updateProfile: (profile: LedgerProfile) => Promise<void>;
  selectProfile: (id: string) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  saveEntry: (draft: EntryDraft) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  setAlarm: (alarm: AlarmSettings) => Promise<ScheduleResult>;
  refresh: () => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [profiles, setProfiles] = useState<LedgerProfile[]>([]);
  const [profile, setProfileState] = useState<LedgerProfile | null>(null);
  const [alarm, setAlarmState] = useState<AlarmSettings>(defaultAlarm());
  const [alarmNotice, setAlarmNotice] = useState<string | null>(null);

  const hydrate = useCallback(async (database: SQLiteDatabase) => {
    await materializeRecurrences(database, todayISO());
    const [nextProfiles, nextProfile, nextAlarm] = await Promise.all([
      loadProfiles(database),
      loadActiveProfile(database),
      loadAlarm(database),
    ]);
    const nextEntries = nextProfile ? await loadEntries(database, nextProfile.id) : [];
    setProfiles(nextProfiles);
    setProfileState(nextProfile);
    setEntries(nextEntries);
    setAlarmState(nextAlarm);
    return nextAlarm;
  }, []);

  useEffect(() => {
    let active = true;
    openFinanceDb()
      .then(async (database) => {
        if (!active) return;
        setDb(database);
        const nextAlarm = await hydrate(database);
        if (nextAlarm.enabled) {
          setAlarmNotice(noticeFor(await rescheduleAlarm(nextAlarm)));
        }
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setError('Não foi possível abrir os dados neste aparelho.');
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [hydrate]);

  const refresh = useCallback(async () => {
    if (!db) return;
    await hydrate(db);
  }, [db, hydrate]);

  const createProfile = useCallback(
    async (input: { name: string; kind: ProfileKind }) => {
      if (!db) return;
      await persistCreateProfile(db, input);
      await hydrate(db);
    },
    [db, hydrate],
  );

  const updateProfile = useCallback(
    async (next: LedgerProfile) => {
      if (!db) return;
      await persistUpdateProfile(db, next);
      await hydrate(db);
    },
    [db, hydrate],
  );

  const selectProfile = useCallback(
    async (id: string) => {
      if (!db) return;
      await persistSelectProfile(db, id);
      await hydrate(db);
    },
    [db, hydrate],
  );

  const removeProfile = useCallback(
    async (id: string) => {
      if (!db) return;
      await persistDeleteProfile(db, id);
      await hydrate(db);
    },
    [db, hydrate],
  );

  const saveEntry = useCallback(
    async (draft: EntryDraft) => {
      if (!db || !profile) return;
      await persistEntry(db, profile.id, draft);
      await hydrate(db);
    },
    [db, hydrate, profile],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (!db || !profile) return;
      await deleteEntry(db, profile.id, id);
      await hydrate(db);
    },
    [db, hydrate, profile],
  );

  const setAlarm = useCallback(
    async (next: AlarmSettings) => {
      if (!db) return { scheduled: false, reason: 'disabled' } as ScheduleResult;
      await persistAlarm(db, next);
      setAlarmState(next);
      const result = await rescheduleAlarm(next, true);
      setAlarmNotice(noticeFor(result));
      return result;
    },
    [db],
  );

  const value = useMemo(
    () => ({
      ready,
      error,
      entries,
      profiles,
      profile,
      alarm,
      alarmNotice,
      createProfile,
      updateProfile,
      selectProfile,
      removeProfile,
      saveEntry,
      removeEntry,
      setAlarm,
      refresh,
    }),
    [
      ready,
      error,
      entries,
      profiles,
      profile,
      alarm,
      alarmNotice,
      createProfile,
      updateProfile,
      selectProfile,
      removeProfile,
      saveEntry,
      removeEntry,
      setAlarm,
      refresh,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance precisa estar dentro de FinanceProvider');
  return value;
}
