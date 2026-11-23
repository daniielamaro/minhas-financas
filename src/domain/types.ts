export type ProfileKind = 'PF' | 'PJ' | 'MEI' | 'AUTONOMO' | 'FREELANCER';

export type MeiActivity = 'servicos' | 'comercio' | 'ambos';

export type EntryType = 'ganho' | 'perda';

export type EntryNature = 'fixo' | 'variavel';

export type ProfileSettings = {
  kind: ProfileKind;
  onboarded: boolean;
  meiActivity: MeiActivity;
  issRate: number;
  inssEnabled: boolean;
  reserveRate: number;
  pjRate: number;
};

export type LedgerProfile = {
  id: string;
  name: string;
  kind: ProfileKind;
  meiActivity: MeiActivity;
  issRate: number;
  inssEnabled: boolean;
  reserveRate: number;
  pjRate: number;
};

export type AlarmSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
  days: number[];
  sound: boolean;
};

export type Entry = {
  id: string;
  type: EntryType;
  nature: EntryNature;
  amountCents: number;
  description: string;
  category: string;
  date: string;
  deductible: boolean;
  recurrenceId: string | null;
  installmentGroup: string | null;
  installmentIndex: number | null;
  installmentCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type EntryDraft = {
  id?: string;
  type: EntryType;
  nature: EntryNature;
  amountCents: number;
  description: string;
  category: string;
  date: string;
  deductible: boolean;
  installments: number;
};

export const CATEGORIES = [
  'Serviços',
  'Salário',
  'Moradia',
  'Ferramentas',
  'Alimentação',
  'Transporte',
  'Impostos',
  'Outros',
] as const;

export const PROFILE_ORDER: ProfileKind[] = ['PF', 'AUTONOMO', 'MEI', 'FREELANCER', 'PJ'];

export const PROFILE_LABEL: Record<ProfileKind, string> = {
  PF: 'PF',
  PJ: 'PJ',
  MEI: 'MEI',
  AUTONOMO: 'Autônomo',
  FREELANCER: 'Freelancer',
};

export const PROFILE_HINT: Record<ProfileKind, string> = {
  PF: 'Carnê-Leão sobre os ganhos',
  AUTONOMO: 'INSS, ISS e Carnê-Leão',
  MEI: 'DAS fixo mensal',
  FREELANCER: 'Mesma conta da PF, com reserva à parte',
  PJ: 'Alíquota sobre o ganho bruto',
};

export function suggestedProfileName(kind: ProfileKind): string {
  if (kind === 'PF') return 'Pessoa física';
  if (kind === 'PJ') return 'Empresa';
  return PROFILE_LABEL[kind];
}

export function defaultProfile(kind: ProfileKind = 'MEI'): ProfileSettings {
  return {
    kind,
    onboarded: false,
    meiActivity: 'servicos',
    issRate: 0.03,
    inssEnabled: true,
    reserveRate: 0.09,
    pjRate: 0.06,
  };
}

export function defaultAlarm(): AlarmSettings {
  return {
    enabled: false,
    hour: 20,
    minute: 0,
    days: [1, 2, 3, 4, 5],
    sound: true,
  };
}
