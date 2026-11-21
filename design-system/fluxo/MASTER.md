# Minhas Finanças — design system

Fonte visual: o Stitch em `stitch_gestor_financeiro_pessoal_inteligente`. As paletas genéricas da skill (ouro/roxo e glassmorphism) não se aplicam.

## Cor

Tema claro e escuro, por tokens semânticos. O claro é o padrão do Stitch; o escuro usa os tokens `dark-*` do mesmo arquivo, com âmbar mais claro para o aviso continuar legível.

- Primária clara `#005444`, sobre primária `#FFFFFF`
- Primária escura `#84D6BF`, sobre primária `#00382D`
- Superfície clara `#F7FAF7`, cartão `#FFFFFF`
- Superfície escura `#101413`, cartão `#0B0F0E`
- Erro claro `#BA1A1A`, erro escuro `#FFB4AB`
- Aviso claro `#92400E` sobre `#FEF3C7`

## Tipo

- Títulos: Red Hat Display
- Texto e rótulos: Commissioner
- Valores: Spline Sans Mono, números tabulares

## Espaço e forma

Ritmo de 4, 8, 12, 16, 24 e 32. Raios de 6, 10, 12, 16 e 24. Margem de página de 16.

## Ícones

Material Icons, um estilo por nível. Sem emoji. Alvo de toque mínimo de 44 pt, com `hitSlop` nos ícones do header.

## Movimento

Opacidade no toque, entre 120 e 220 ms. Sem escala que desloque o layout. Sem animação obrigatória.

## Gráficos

Barras agrupadas para ganhos e perdas. Barra proporcional para fixo e variável. Cada mês é um botão com o valor também em texto.
