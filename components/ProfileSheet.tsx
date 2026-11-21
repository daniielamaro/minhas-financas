import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { usePalette } from '@/components/usePalette';
import { FieldError, FieldLabel } from '@/components/ui';
import { useFinance } from '@/src/db/FinanceContext';
import { PROFILE_HINT, PROFILE_LABEL, PROFILE_ORDER, type ProfileKind } from '@/src/domain/types';

export function ProfileSheet({
  visible,
  dismissable,
  onClose,
}: {
  visible: boolean;
  dismissable: boolean;
  onClose: () => void;
}) {
  const colors = usePalette();
  const { profiles, profile, createProfile, updateProfile, selectProfile, removeProfile } = useFinance();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ProfileKind | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setEditingId(null);
    setCreating(profiles.length === 0);
    setName('');
    setKind(null);
    setError('');
  }, [profiles.length, visible]);

  if (!visible) return null;

  const editing = profiles.find((item) => item.id === editingId) ?? null;
  const showForm = creating || editing !== null;

  function openCreate() {
    setEditingId(null);
    setCreating(true);
    setName('');
    setKind(null);
    setError('');
  }

  function openEdit(id: string) {
    const current = profiles.find((item) => item.id === id);
    if (!current) return;
    setCreating(false);
    setEditingId(id);
    setName(current.name);
    setKind(current.kind);
    setError('');
  }

  function backToList() {
    setCreating(false);
    setEditingId(null);
    setError('');
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Dê um nome ao perfil. Ex.: Vida pessoal ou Empresa.');
      return;
    }
    if (!kind) {
      setError('Escolha o tipo deste perfil.');
      return;
    }
    if (editing) {
      await updateProfile({ ...editing, name: trimmed, kind });
    } else {
      await createProfile({ name: trimmed, kind });
    }
    onClose();
  }

  function confirmDelete() {
    if (!editing) return;
    const message = `Excluir ${editing.name}? Os lançamentos deste perfil também saem.`;
    const run = () => {
      void removeProfile(editing.id).then(() => {
        if (profiles.length <= 1) return;
        backToList();
      });
    };
    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert('Excluir perfil', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: run },
    ]);
  }

  return (
    <View className="absolute inset-0 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dismissable ? 'Fechar perfis' : 'Crie um perfil para continuar'}
        onPress={dismissable && !showForm ? onClose : undefined}
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(16, 20, 19, 0.46)' }}
      />
      <View className="max-h-[88%] rounded-t-xl border border-outline-variant bg-surface-lowest px-4 pb-8 pt-4">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
          <Text className="font-display text-headline-sm text-on-surface">
            {showForm ? (editing ? 'Editar perfil' : 'Novo perfil') : 'Perfis'}
          </Text>
          <Text className="font-body text-body-sm text-on-surface-variant">
            {showForm
              ? 'O nome é seu. O tipo define a estimativa de imposto. Cada perfil guarda os próprios lançamentos.'
              : 'Troque de livro ou crie outro. Os dados de um perfil não entram no outro.'}
          </Text>

          {showForm ? (
            <View className="gap-3">
              <View className="gap-1">
                <FieldLabel>Nome</FieldLabel>
                <TextInput
                  accessibilityLabel="Nome do perfil"
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex.: Vida pessoal"
                  placeholderTextColor={colors.outline}
                  maxLength={40}
                  className="min-h-12 rounded-md border border-outline-variant bg-surface px-3 font-body text-body-md text-on-surface"
                />
                <FieldError>{error}</FieldError>
              </View>
              <View className="gap-2">
                <FieldLabel>Tipo</FieldLabel>
                {PROFILE_ORDER.map((item) => {
                  const selected = kind === item;
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setKind(item)}
                      className={`min-h-12 justify-center rounded-md border px-4 py-3 ${
                        selected ? 'border-primary bg-secondary-container' : 'border-outline-variant bg-surface-lowest'
                      }`}
                      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                      <Text className="font-title text-title-md text-on-surface">{PROFILE_LABEL[item]}</Text>
                      <Text className="font-body text-body-sm text-on-surface-variant">{PROFILE_HINT[item]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => void save()}
                className="min-h-12 items-center justify-center rounded-md bg-primary"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                <Text className="font-title text-label-lg text-on-primary">{editing ? 'Salvar perfil' : 'Criar perfil'}</Text>
              </Pressable>
              {editing ? (
                <Pressable accessibilityRole="button" onPress={confirmDelete} className="min-h-11 items-center justify-center">
                  <Text className="font-title text-label-md text-error">Excluir perfil</Text>
                </Pressable>
              ) : null}
              {profiles.length > 0 ? (
                <Pressable accessibilityRole="button" onPress={backToList} className="min-h-11 items-center justify-center">
                  <Text className="font-title text-label-md text-primary">Voltar</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View className="gap-2">
              {profiles.map((item) => {
                const selected = profile?.id === item.id;
                return (
                  <View
                    key={item.id}
                    className={`min-h-12 flex-row items-center gap-2 rounded-md border px-3 py-2 ${
                      selected ? 'border-primary bg-secondary-container' : 'border-outline-variant bg-surface-lowest'
                    }`}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${item.name}, ${PROFILE_LABEL[item.kind]}`}
                      onPress={() => {
                        void selectProfile(item.id).then(onClose);
                      }}
                      className="min-h-11 flex-1 justify-center"
                      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                      <Text className="font-title text-title-md text-on-surface">{item.name}</Text>
                      <Text className="font-body text-body-sm text-on-surface-variant">
                        {PROFILE_LABEL[item.kind]} · {PROFILE_HINT[item.kind]}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${item.name}`}
                      onPress={() => openEdit(item.id)}
                      className="min-h-11 items-center justify-center px-2">
                      <Text className="font-title text-label-md text-primary">Editar</Text>
                    </Pressable>
                  </View>
                );
              })}
              <Pressable
                accessibilityRole="button"
                onPress={openCreate}
                className="min-h-12 items-center justify-center rounded-md border border-outline-variant"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                <Text className="font-title text-label-lg text-primary">Novo perfil</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
