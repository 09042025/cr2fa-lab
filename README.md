# CR2FA Lab

Painel de dados e organização de carteira baseado no **Protocolo CR2FA**: cinco blocos de 20% com diversificação em duas camadas.

| Bloco | Divisão interna |
|---|---|
| Criptomoedas (20%) | 60% Bitcoin, 10% Ethereum, 30% stablecoins rendendo (Aave ou Kamino) |
| Fundos imobiliários (20%) | 30% galpões, 30% shoppings, 30% outros de tijolo, 10% papel |
| Ações (20%) | 50% Brasil (energia, bancos, saneamento, telecom, seguros, 20% cada) e 50% internacionais |
| Renda fixa (20%) | 30% Tesouro Selic, 30% CDBs, 40% LCI/LCA |
| Reserva para oportunidades (20%) | 50% CDB com liquidez diária, 50% Tesouro Selic |

Antes dos cinco blocos vem a reserva de emergência (12 meses de salário), separada da carteira.

> Conteúdo educativo, baseado em dados públicos. Não é recomendação de investimento.

## O que tem

- Cripto (mercado) e pools DeFi com TVL e APY, filtros por rede, ativo e TVL
- Ações e FIIs da B3 organizados pelos setores do Protocolo
- Renda fixa: taxas do Banco Central e comparador líquido (CDB x LCI/LCA x Tesouro Selic, com IR regressivo)
- Calculadora do Protocolo e de juros compostos
- Portfólio com rebalanceamento para os 20% de cada bloco (Pró)
- Login com e-mail e senha, usuário **admin** e painel administrativo
- Planos **Grátis** e **Pró**
- Pagamento por **Pix e cartão de crédito** (Mercado Pago) e por **Bitcoin**, com verificação direta na blockchain (o código também suporta redes EVM e Solana, ativadas só se o endereço for configurado)

## Rodando localmente

Requisitos: Node.js 22+.

```bash
git clone <URL-DO-SEU-REPOSITORIO> cr2fa-lab
cd cr2fa-lab
npm install
cp .env.example .env        # edite SESSION_SECRET e demais variáveis
npm run seed                # cria o admin e mostra a senha inicial UMA vez
npm run dev                 # http://localhost:3000
```

O `seed` usa `ADMIN_EMAIL` (padrão `admin@exemplo.com`). Se `ADMIN_INITIAL_PASSWORD` estiver vazio, gera uma senha aleatória e a exibe uma única vez no terminal. **No primeiro login o sistema obriga a troca da senha.** Para gerar outra senha inicial: `npm run seed -- --reset`.

Gere o `SESSION_SECRET` com `openssl rand -base64 48`.

## Docker

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec app npm run seed
```

Os dados ficam no volume `cr2fa-data` (SQLite). Faça backup desse volume.

## Publicar na Railway

1. Crie uma conta em <https://railway.com> e escolha **New Project → Deploy from GitHub repo**, selecionando este repositório. A Railway detecta o `Dockerfile` e faz o build.
2. No serviço, aba **Variables**, crie (copie os nomes de `.env.example`):
   - `SESSION_SECRET` (gere com `openssl rand -base64 48`)
   - `APP_URL` com o endereço final, por exemplo `https://app.seudominio.com.br`
   - `DATABASE_PATH` = `/app/data/cr2fa.db`
   - `PORT` = `3000`
   - `RAILWAY_RUN_UID` = `0` (permite gravar no disco da Railway)
   - `ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD` (mínimo de 10 caracteres)
   - as chaves do Mercado Pago e os endereços de cripto que for usar
3. Crie um **Volume** e monte em `/app/data`. Sem ele, os dados (usuários e pedidos) se perdem a cada deploy. A Railway permite 1 volume por serviço e não permite réplicas com volume.
4. Em **Settings → Networking**, gere o domínio público e, depois, adicione o seu domínio próprio seguindo as instruções de DNS mostradas.
5. No primeiro start o servidor **cria o administrador automaticamente** (se ainda não houver um), com `ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD`. Se a senha ficar vazia, uma senha aleatória aparece **uma única vez** nos logs do deploy. A troca é obrigatória no primeiro login. Depois de trocar, apague `ADMIN_INITIAL_PASSWORD` das variáveis.

## Recuperação de senha

Na tela de login há o link **Esqueci minha senha**. O usuário informa o e-mail e recebe um link (válido por 1 hora, uso único) para criar uma nova senha. Para enviar o e-mail, o app usa o [Resend](https://resend.com):

1. Crie a conta no Resend e verifique o domínio (registros DNS indicados por ele).
2. Gere uma chave de API e defina na Railway `RESEND_API_KEY` e `MAIL_FROM` (endereço do domínio verificado).
3. Confirme que `APP_URL` está com o endereço público (HTTPS), pois o link do e-mail é montado com ele.

Sem essas variáveis, o pedido não envia e-mail e o servidor registra um aviso no log.

## Configurações e administração

No painel, o botão **Configurações** (na lateral, também no celular) abre a página com **perfil** (nome e e-mail; trocar o e-mail exige a senha atual), **alterar senha**, plano e sair. O administrador vê também o atalho para **Administração**, onde pode dar ou tirar o Pró e **excluir contas comuns**: é preciso digitar o e-mail da conta para confirmar, a exclusão apaga também o portfólio e o histórico de pedidos dela, e contas de administrador não podem ser excluídas por ali.

## Teste grátis do Pró

Contas do plano Grátis que nunca assinaram podem iniciar **30 dias de Pró sem cartão**, pelo botão em `/planos`, pelo aviso no painel ou pelo botão da página inicial. Cada conta tem direito a um teste. No fim, a conta volta para o Grátis, sem cobrança. Se a pessoa assinar durante o teste, o plano soma ao tempo que resta. Os lembretes de 7 e 1 dia avisam que o teste está acabando. A duração vem de `TRIAL_DAYS` (padrão 30). Há limite de 3 testes por dia por endereço de IP; como o cadastro ainda não confirma o e-mail, não há como impedir de vez quem cria várias contas.

## Lembrete de renovação

Como os pagamentos são avulsos (Pró por 31 ou 366 dias), o servidor envia e-mails de lembrete para quem tem o Pró perto de vencer: um **7 dias antes** e outro **1 dia antes**, com botão para renovar em `/planos`. A renovação soma ao tempo que resta. Cada etapa sai uma vez por vencimento, e o ciclo recomeça quando o usuário renova. A verificação roda ao iniciar e a cada 6 horas, e exige as mesmas variáveis do e-mail (`RESEND_API_KEY` e `MAIL_FROM`). Administradores não recebem.

## Pagamentos

### Pix e cartão (Mercado Pago)

1. Crie uma aplicação em <https://www.mercadopago.com.br/developers> e copie o **Access Token** para `MERCADOPAGO_ACCESS_TOKEN`.
2. No painel de Webhooks, cadastre `https://SEU-DOMINIO/api/webhooks/mercadopago`, marque o evento **Pagamentos** e copie a assinatura secreta para `MERCADOPAGO_WEBHOOK_SECRET`.
3. Defina `APP_URL` com o domínio público (HTTPS).

O app cria uma preferência do Checkout Pro (Pix e cartão). O webhook tem a **assinatura validada** e o status e o valor são **reconsultados na API** do Mercado Pago antes de liberar o Pró. Teste primeiro com credenciais de teste.

### Cripto

Defina apenas os endereços que quiser aceitar (redes sem endereço ficam desativadas):

| Variável | Redes |
|---|---|
| `CRYPTO_EVM_ADDRESS` | Ethereum, Arbitrum, Base, Polygon, Optimism (ETH, USDC, USDT conforme a rede) |
| `CRYPTO_SOL_ADDRESS` | Solana (SOL, USDC, USDT) |
| `CRYPTO_BTC_ADDRESS` | Bitcoin |

Como funciona: o usuário escolhe rede e ativo, o app converte o preço em BRL pela cotação do momento e gera um **valor exato único** (com casas extras que identificam o pedido), válido por 30 minutos. Depois de enviar, o usuário informa o hash e o servidor consulta a rede (RPC) e confere destinatário, ativo/contrato, **valor exato**, confirmações e que a transação é posterior ao pedido. Cada hash só vale uma vez.

Use endereços **só de recebimento** e carteiras sob seu controle. Não há chaves privadas no app.

Antes de produção, **confira os endereços dos contratos** de USDC/USDT em `src/lib/crypto.ts` nas fontes oficiais (Circle e Tether) e use RPCs próprios para estabilidade.

## Dados de mercado

| Dado | Fonte | Observação |
|---|---|---|
| Cripto | CoinGecko | chave opcional (`COINGECKO_API_KEY`) |
| Pools DeFi | DefiLlama (yields) | |
| Ações e FIIs | brapi.dev | `BRAPI_TOKEN` recomendado |
| Selic, CDI, IPCA | Banco Central (SGS) | |

Há cache em SQLite. Se uma fonte falhar, o painel mostra o último dado salvo com aviso, ou a mensagem de indisponível. O app nunca inventa números.

Os tickers de ações e FIIs listados em `src/lib/market.ts` são exemplos de cada setor para ilustrar a estrutura e podem ser editados.

## Segurança

- Senhas com bcrypt, sessão em cookie `httpOnly` assinado (JWT), `SameSite=Lax`, checagem de origem nas rotas que alteram estado
- Limite de tentativas de login e de verificações de pagamento
- Troca de senha obrigatória do admin inicial
- Exportação CSV com proteção contra injeção de fórmulas
- Em produção, rode atrás de HTTPS e defina `SESSION_SECRET` forte

## Desenvolvimento

```bash
npm run typecheck
npm test
npm run build
```

## Estrutura

```
src/app          páginas e rotas de API (Next.js App Router)
src/lib          protocolo, renda fixa, mercado, pagamentos, auth, banco
src/components   componentes de interface
scripts          seed do admin
tests            testes (node:test)
```

## Licença

MIT. Veja [LICENSE](LICENSE).
