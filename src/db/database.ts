import * as SQLite from 'expo-sqlite';

import { clampDay, createId, monthKey, monthsInclusive, todayISO } from '@/src/domain/dates';
import {
    defaultAlarm,
    defaultProfile,
    PROFILE_LABEL,
    type AlarmSettings,
    type Entry,
    type EntryDraft,
    type LedgerProfile,
    type MeiActivity,
    type ProfileKind,
    type ProfileSettings,
} from '@/src/domain/types';

type EntryRow = {
  id: string;
  type: Entry['type'];
  nature: Entry['nature'];
  amount_cents: number;
  description: string;
  category: string;
  date: string;
  deductible: number;
  recurrence_id: string | null;
  created_at: string;
  updated_at: string;
};

type SettingRow = { key: string; value: string };

type ProfileRow = {
  id: string;
  name: string;
  kind: string;
  mei_activity: string;
  iss_rate: number;
  inss_enabled: number;
  reserve_rate: number;
  pj_rate: number;
};

const PROFILE_KINDS: ProfileKind[] = ['PF', 'PJ', 'MEI', 'AUTONOMO', 'FREELANCER'];
const MEI_ACTIVITIES: MeiActivity[] = ['servicos', 'comercio', 'ambos'];

export async function openFinanceDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('minhasfinancas.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      nature TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      deductible INTEGER NOT NULL DEFAULT 0,
      recurrence_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
    CREATE TABLE IF NOT EXISTS recurrences (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      deductible INTEGER NOT NULL DEFAULT 0,
      day_of_month INTEGER NOT NULL,
      start_month TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recurrence_skips (
      recurrence_id TEXT NOT NULL,
      month TEXT NOT NULL,
      PRIMARY KEY (recurrence_id, month)
    );
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      mei_activity TEXT NOT NULL,
      iss_rate REAL NOT NULL,
      inss_enabled INTEGER NOT NULL,
      reserve_rate REAL NOT NULL,
      pj_rate REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await ensureColumn(db, 'entries', 'profile_id', 'TEXT');
  await ensureColumn(db, 'recurrences', 'profile_id', 'TEXT');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_entries_profile_date ON entries(profile_id, date);');
  await materializeRecurrences(db, todayISO());
  return db;
}

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: 'entries' | 'recurrences',
  column: 'profile_id',
  definition: string,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (columns.some((item) => item.name === column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function mapEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    type: row.type,
    nature: row.nature,
    amountCents: row.amount_cents,
    description: row.description,
    category: row.category,
    date: row.date,
    deductible: row.deductible === 1,
    recurrenceId: row.recurrence_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isProfileKind(value: unknown): value is ProfileKind {
  return typeof value === 'string' && PROFILE_KINDS.includes(value as ProfileKind);
}

function isMeiActivity(value: unknown): value is MeiActivity {
  return typeof value === 'string' && MEI_ACTIVITIES.includes(value as MeiActivity);
}

export function sanitizeProfile(value: unknown): ProfileSettings {
  const base = defaultProfile();
  if (!value || typeof value !== 'object') return base;
  const record = value as Partial<ProfileSettings>;
  return {
    kind: isProfileKind(record.kind) ? record.kind : base.kind,
    onboarded: record.onboarded === true,
    meiActivity: isMeiActivity(record.meiActivity) ? record.meiActivity : base.meiActivity,
    issRate: clampRate(record.issRate, base.issRate),
    inssEnabled: record.inssEnabled !== false,
    reserveRate: clampRate(record.reserveRate, base.reserveRate),
    pjRate: clampRate(record.pjRate, base.pjRate),
  };
}

export function sanitizeAlarm(value: unknown): AlarmSettings {
  const base = defaultAlarm();
  if (!value || typeof value !== 'object') return base;
  const record = value as Partial<AlarmSettings>;
  const hour = Number(record.hour);
  const minute = Number(record.minute);
  const days = Array.isArray(record.days)
    ? [...new Set(record.days.map(Number).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b)
    : base.days;
  return {
    enabled: record.enabled === true,
    hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : base.hour,
    minute: Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : base.minute,
    days,
    sound: record.sound !== false,
  };
}

function clampRate(value: unknown, fallback: number): number {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) return fallback;
  return rate;
}

async function readSetting(db: SQLite.SQLiteDatabase, key: string): Promise<unknown> {
  const row = await db.getFirstAsync<SettingRow>('SELECT value FROM settings WHERE key = ?', key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

async function writeSetting(db: SQLite.SQLiteDatabase, key: string, value: unknown): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}

function mapProfile(row: ProfileRow): LedgerProfile {
  const settings = sanitizeProfile({
    kind: row.kind,
    onboarded: true,
    meiActivity: row.mei_activity,
    issRate: row.iss_rate,
    inssEnabled: row.inss_enabled === 1,
    reserveRate: row.reserve_rate,
    pjRate: row.pj_rate,
  });
  const name = row.name.trim().slice(0, 40);
  return {
    id: row.id,
    name: name || PROFILE_LABEL[settings.kind],
    kind: settings.kind,
    meiActivity: settings.meiActivity,
    issRate: settings.issRate,
    inssEnabled: settings.inssEnabled,
    reserveRate: settings.reserveRate,
    pjRate: settings.pjRate,
  };
}

async function insertProfile(db: SQLite.SQLiteDatabase, profile: LedgerProfile): Promise<void> {
  await db.runAsync(
    `INSERT INTO profiles (
      id, name, kind, mei_activity, iss_rate, inss_enabled, reserve_rate, pj_rate, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    profile.id,
    profile.name,
    profile.kind,
    profile.meiActivity,
    profile.issRate,
    profile.inssEnabled ? 1 : 0,
    profile.reserveRate,
    profile.pjRate,
    new Date().toISOString(),
  );
}

export async function loadEntries(db: SQLite.SQLiteDatabase, profileId: string): Promise<Entry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries WHERE profile_id = ? ORDER BY date DESC, created_at DESC',
    profileId,
  );
  return rows.map(mapEntry);
}

export async function loadProfiles(db: SQLite.SQLiteDatabase): Promise<LedgerProfile[]> {
  const rows = await db.getAllAsync<ProfileRow>('SELECT * FROM profiles ORDER BY created_at ASC');
  return rows.map(mapProfile);
}

export async function loadActiveProfile(db: SQLite.SQLiteDatabase): Promise<LedgerProfile | null> {
  const profiles = await loadProfiles(db);
  if (profiles.length === 0) return null;
  const activeId = await readSetting(db, 'activeProfileId');
  const selected = profiles.find((item) => item.id === activeId) ?? profiles[0];
  if (selected.id !== activeId) await writeSetting(db, 'activeProfileId', selected.id);
  return selected;
}

export async function createProfile(
  db: SQLite.SQLiteDatabase,
  input: { name: string; kind: ProfileKind },
): Promise<LedgerProfile> {
  const existing = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM profiles');
  const settings = defaultProfile(input.kind);
  const profile: LedgerProfile = {
    id: createId(),
    name: input.name.trim().slice(0, 40),
    kind: input.kind,
    meiActivity: settings.meiActivity,
    issRate: settings.issRate,
    inssEnabled: settings.inssEnabled,
    reserveRate: settings.reserveRate,
    pjRate: settings.pjRate,
  };
  await insertProfile(db, profile);
  if ((existing?.n ?? 0) === 0) {
    await db.runAsync('UPDATE entries SET profile_id = ? WHERE profile_id IS NULL', profile.id);
    await db.runAsync('UPDATE recurrences SET profile_id = ? WHERE profile_id IS NULL', profile.id);
  }
  await writeSetting(db, 'activeProfileId', profile.id);
  return profile;
}

export async function updateProfile(db: SQLite.SQLiteDatabase, profile: LedgerProfile): Promise<void> {
  const name = profile.name.trim().slice(0, 40);
  await db.runAsync(
    `UPDATE profiles
     SET name = ?, kind = ?, mei_activity = ?, iss_rate = ?, inss_enabled = ?, reserve_rate = ?, pj_rate = ?
     WHERE id = ?`,
    name || PROFILE_LABEL[profile.kind],
    profile.kind,
    profile.meiActivity,
    profile.issRate,
    profile.inssEnabled ? 1 : 0,
    profile.reserveRate,
    profile.pjRate,
    profile.id,
  );
}

export async function selectProfile(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await writeSetting(db, 'activeProfileId', id);
}

export async function deleteProfile(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  const recurrences = await db.getAllAsync<{ id: string }>('SELECT id FROM recurrences WHERE profile_id = ?', id);
  await db.withTransactionAsync(async () => {
    for (const rule of recurrences) {
      await db.runAsync('DELETE FROM recurrence_skips WHERE recurrence_id = ?', rule.id);
    }
    await db.runAsync('DELETE FROM entries WHERE profile_id = ?', id);
    await db.runAsync('DELETE FROM recurrences WHERE profile_id = ?', id);
    await db.runAsync('DELETE FROM profiles WHERE id = ?', id);
    const activeId = await readSetting(db, 'activeProfileId');
    if (activeId !== id) return;
    const next = await db.getFirstAsync<{ id: string }>('SELECT id FROM profiles ORDER BY created_at ASC');
    if (next) await writeSetting(db, 'activeProfileId', next.id);
    else await db.runAsync('DELETE FROM settings WHERE key = ?', 'activeProfileId');
  });
}

export async function loadAlarm(db: SQLite.SQLiteDatabase): Promise<AlarmSettings> {
  return sanitizeAlarm(await readSetting(db, 'alarm'));
}

export async function saveAlarm(db: SQLite.SQLiteDatabase, alarm: AlarmSettings): Promise<void> {
  await writeSetting(db, 'alarm', sanitizeAlarm(alarm));
}

async function insertEntry(db: SQLite.SQLiteDatabase, profileId: string, entry: Entry): Promise<void> {
  await db.runAsync(
    `INSERT INTO entries (
      id, profile_id, type, nature, amount_cents, description, category, date, deductible, recurrence_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    profileId,
    entry.type,
    entry.nature,
    entry.amountCents,
    entry.description,
    entry.category,
    entry.date,
    entry.deductible ? 1 : 0,
    entry.recurrenceId,
    entry.createdAt,
    entry.updatedAt,
  );
}

export async function materializeRecurrences(db: SQLite.SQLiteDatabase, today: string): Promise<void> {
  const rules = await db.getAllAsync<{
    id: string;
    profile_id: string | null;
    type: Entry['type'];
    amount_cents: number;
    description: string;
    category: string;
    deductible: number;
    day_of_month: number;
    start_month: string;
  }>('SELECT * FROM recurrences WHERE active = 1');
  const through = monthKey(today);
  const now = new Date().toISOString();

  for (const rule of rules) {
    if (!rule.profile_id) continue;
    for (const month of monthsInclusive(rule.start_month, through)) {
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM entries WHERE recurrence_id = ? AND substr(date, 1, 7) = ?',
        rule.id,
        month,
      );
      if (existing) continue;
      const skipped = await db.getFirstAsync<{ month: string }>(
        'SELECT month FROM recurrence_skips WHERE recurrence_id = ? AND month = ?',
        rule.id,
        month,
      );
      if (skipped) continue;
      await insertEntry(db, rule.profile_id, {
        id: createId(),
        type: rule.type,
        nature: 'fixo',
        amountCents: rule.amount_cents,
        description: rule.description,
        category: rule.category,
        date: clampDay(month, rule.day_of_month),
        deductible: rule.deductible === 1,
        recurrenceId: rule.id,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

export async function saveEntry(db: SQLite.SQLiteDatabase, profileId: string, draft: EntryDraft): Promise<void> {
  const now = new Date().toISOString();
  const description = draft.description.trim();
  const deductible = draft.type === 'perda' ? draft.deductible : false;
  const repeat = draft.repeat && draft.nature === 'fixo';

  await db.withTransactionAsync(async () => {
    if (draft.id) {
      const current = await db.getFirstAsync<EntryRow>(
        'SELECT * FROM entries WHERE id = ? AND profile_id = ?',
        draft.id,
        profileId,
      );
      if (!current) return;
      let recurrenceId = current.recurrence_id;
      if (repeat && !recurrenceId) {
        recurrenceId = createId();
        await db.runAsync(
          `INSERT INTO recurrences (
            id, profile_id, type, amount_cents, description, category, deductible, day_of_month, start_month, active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          recurrenceId,
          profileId,
          draft.type,
          draft.amountCents,
          description,
          draft.category,
          deductible ? 1 : 0,
          Number(draft.date.slice(8, 10)),
          monthKey(draft.date),
          now,
        );
      } else if (!repeat && recurrenceId) {
        await db.runAsync('UPDATE recurrences SET active = 0 WHERE id = ?', recurrenceId);
        recurrenceId = null;
      }
      await db.runAsync(
        `UPDATE entries
         SET type = ?, nature = ?, amount_cents = ?, description = ?, category = ?, date = ?, deductible = ?, recurrence_id = ?, updated_at = ?
         WHERE id = ?`,
        draft.type,
        draft.nature,
        draft.amountCents,
        description,
        draft.category,
        draft.date,
        deductible ? 1 : 0,
        recurrenceId,
        now,
        draft.id,
      );
    } else {
      let recurrenceId: string | null = null;
      if (repeat) {
        recurrenceId = createId();
        await db.runAsync(
          `INSERT INTO recurrences (
            id, profile_id, type, amount_cents, description, category, deductible, day_of_month, start_month, active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          recurrenceId,
          profileId,
          draft.type,
          draft.amountCents,
          description,
          draft.category,
          deductible ? 1 : 0,
          Number(draft.date.slice(8, 10)),
          monthKey(draft.date),
          now,
        );
      }
      await insertEntry(db, profileId, {
        id: createId(),
        type: draft.type,
        nature: draft.nature,
        amountCents: draft.amountCents,
        description,
        category: draft.category,
        date: draft.date,
        deductible,
        recurrenceId,
        createdAt: now,
        updatedAt: now,
      });
    }
    await materializeRecurrences(db, todayISO());
  });
}

export async function deleteEntry(db: SQLite.SQLiteDatabase, profileId: string, id: string): Promise<void> {
  const current = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ? AND profile_id = ?', id, profileId);
  if (!current) return;
  await db.withTransactionAsync(async () => {
    if (current.recurrence_id) {
      await db.runAsync(
        'INSERT INTO recurrence_skips (recurrence_id, month) VALUES (?, ?) ON CONFLICT(recurrence_id, month) DO NOTHING',
        current.recurrence_id,
        monthKey(current.date),
      );
    }
    await db.runAsync('DELETE FROM entries WHERE id = ?', id);
  });
}
