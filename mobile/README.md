# App NIZA INVEST (Android primeiro, iPhone depois)

App nativo feito com Expo (React Native). Esta é a **Etapa 1: só as telas e a navegação**, com dados de exemplo.
Login real, dados reais e assinatura pelo Google Play vêm nas próximas etapas.

## Como testar no seu celular Android

1. Instale o **Node.js 20 ou mais novo** no computador (nodejs.org).
2. No celular, instale o app **Expo Go** na Play Store.
3. No terminal, dentro da pasta do projeto:
   ```
   cd mobile
   npm install
   npx expo start
   ```
4. Vai aparecer um **QR code**. Abra o Expo Go e use "Scan QR code".
   (Celular e computador precisam estar na mesma rede Wi-Fi. Se não conectar, rode `npx expo start --tunnel`.)
5. Na tela inicial, toque em **Entrar como plano Grátis** e depois em **Entrar como plano Pró**
   (em Perfil → "Modo de teste" você troca de plano sem sair) e confira as telas bloqueadas com o selo PRÓ.

## O que está liberado em cada plano (igual ao site)

| | Grátis | Pró |
|---|---|---|
| Início, Mercado, Feed, Notícias, chat-geral | sim | sim |
| Portfólio (Consolidador e Carteiras) | bloqueado | sim |
| Demais canais do Chat e Lives VIP | bloqueados | sim |
| Cursos | só introdução | completo |
