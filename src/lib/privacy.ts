/** Texto único da política de privacidade: usado pela página do site e pela tela nativa do app (via /api/privacy). */
export const PRIVACY_CONTACT = "engenharia.emerson@gmail.com";
export const PRIVACY_UPDATED = "7 de novembro de 2026";

export interface PrivacyBlock { h: string; p?: string[]; ul?: { b: string; t: string }[] }

export const PRIVACY_INTRO = `Esta política vale para o site nizainvest.com.br e para o aplicativo NIZA INVEST. Atualizada em ${PRIVACY_UPDATED}. Responsável pelo tratamento dos dados: Emerson Niza (NIZA INVEST), contato abaixo.`;

export const PRIVACY: PrivacyBlock[] = [
  {
    h: "Dados que coletamos",
    ul: [
      { b: "Conta", t: "nome, e-mail e senha (guardada de forma criptografada)." },
      { b: "Plano e pagamento", t: "o plano contratado e o histórico de assinatura. Dados de cartão são tratados pelo processador de pagamento e não ficam conosco." },
      { b: "Comunidade", t: "publicações, comentários, mensagens, áudios, fotos de perfil e imagens que você enviar." },
      { b: "Portfólio", t: "as posições e valores que você mesmo registrar ou importar. Não acessamos suas corretoras." },
      { b: "Fotos", t: "o app só acessa as imagens que você escolher enviar. Não lemos sua galeria." },
      { b: "Câmera e microfone", t: "usados somente quando você grava um vídeo (Cashpills e stories) ou um áudio. A gravação só começa quando você toca para gravar e só é enviada se você publicar." },
      { b: "Stories e vídeos", t: "as fotos e vídeos que você publicar ficam visíveis aos outros membros e os stories expiram após 24 horas." },
      { b: "Dados técnicos", t: "registros básicos de acesso, usados para segurança e para evitar abusos." },
    ],
  },
  { h: "Para que usamos", p: ["Para criar e proteger sua conta, liberar os recursos do seu plano, exibir a comunidade, enviar avisos importantes (como renovação) e moderar conteúdo. Não vendemos seus dados e não usamos publicidade de terceiros."] },
  { h: "Compartilhamento", p: ["Compartilhamos dados apenas com os serviços necessários para o funcionamento: hospedagem, envio de e-mails e processamento de pagamentos. Gráficos de mercado (como o do TradingView) são carregados dos servidores dos respectivos provedores, que podem registrar o acesso. Se você escolher outro idioma no site, o texto das páginas que você abre é enviado ao Google Tradutor para ser traduzido (nada é enviado enquanto você usar o português); as mensagens diretas ficam fora da tradução. Suas publicações na comunidade são visíveis aos outros membros conforme o seu plano."] },
  { h: "Seus direitos e exclusão da conta", p: [`Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento (LGPD). Para excluir sua conta e os dados ligados a ela, a forma mais rápida é pelo próprio app ou site: Configurações › Excluir minha conta (no site: nizainvest.com.br/painel/configuracoes, depois de entrar). Se preferir, escreva para ${PRIVACY_CONTACT} pelo e-mail cadastrado. Atendemos em até 15 dias.`] },
  { h: "Segurança e retenção", p: ["Usamos conexão segura (HTTPS) e guardamos os dados enquanto a conta existir. Após a exclusão, removemos os dados, salvo o que a lei exigir manter."] },
  { h: "Aviso", p: ["O conteúdo é educativo e não é recomendação de investimento."] },
  { h: "Contato", p: [`Dúvidas: ${PRIVACY_CONTACT}.`] },
];
