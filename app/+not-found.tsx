import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <Text className="font-display text-headline-sm text-on-surface">Essa tela não existe.</Text>
        <Link href="/" className="font-title text-label-lg text-primary">
          Voltar ao painel
        </Link>
      </View>
    </>
  );
}
