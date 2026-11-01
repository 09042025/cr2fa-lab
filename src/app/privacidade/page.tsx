import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata = { title: "Política de privacidade" };

const CONTATO = "engenharia.emerson@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6 flex justify-center"><Logo size="lg" /></div>
      <div className="card space-y-4 p-6 text-sm leading-relaxed text-muted">
        <h1 className="font-display text-2xl font-bold text-gold-soft">Política de privacidade</h1>
        <p>Esta política vale para o site nizainvest.com.br e para o aplicativo NIZA INVEST. Atualizada em outubro de 2026.</p>

        <h2 className="font-semibold text-white">Dados que coletamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-white">Conta:</strong> nome, e-mail e senha (guardada de forma criptografada).</li>
          <li><strong className="text-white">Plano e pagamento:</strong> o plano contratado e o histórico de assinatura. Dados de cartão são tratados pelo processador de pagamento e não ficam conosco.</li>
          <li><strong className="text-white">Comunidade:</strong> publicações, comentários, mensagens, áudios, fotos de perfil e imagens que você enviar.</li>
          <li><strong className="text-white">Portfólio:</strong> as posições e valores que você mesmo registrar ou importar. Não acessamos suas corretoras.</li>
          <li><strong className="text-white">Fotos:</strong> o app só acessa as imagens que você escolher enviar. Não lemos sua galeria.</li>
          <li><strong className="text-white">Dados técnicos:</strong> registros básicos de acesso, usados para segurança e para evitar abusos.</li>
        </ul>

        <h2 className="font-semibold text-white">Para que usamos</h2>
        <p>Para criar e proteger sua conta, liberar os recursos do seu plano, exibir a comunidade, enviar avisos importantes (como renovação) e moderar conteúdo. Não vendemos seus dados e não usamos publicidade de terceiros.</p>

        <h2 className="font-semibold text-white">Compartilhamento</h2>
        <p>Compartilhamos dados apenas com os serviços necessários para o funcionamento: hospedagem, envio de e-mails e processamento de pagamentos. Se você escolher outro idioma no site, o texto das páginas que você abre é enviado ao Google Tradutor para ser traduzido (nada é enviado enquanto você usar o português); as mensagens diretas ficam fora da tradução. Suas publicações na comunidade são visíveis aos outros membros conforme o seu plano.</p>

        <h2 className="font-semibold text-white">Seus direitos e exclusão da conta</h2>
        <p>Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento (LGPD). Para excluir sua conta e os dados ligados a ela, escreva para <a className="text-gold-soft underline" href={`mailto:${CONTATO}?subject=Excluir%20minha%20conta`}>{CONTATO}</a> pelo e-mail cadastrado. Atendemos em até 15 dias.</p>

        <h2 className="font-semibold text-white">Segurança e retenção</h2>
        <p>Usamos conexão segura (HTTPS) e guardamos os dados enquanto a conta existir. Após a exclusão, removemos os dados, salvo o que a lei exigir manter.</p>

        <h2 className="font-semibold text-white">Aviso</h2>
        <p>O conteúdo é educativo e não é recomendação de investimento.</p>

        <h2 className="font-semibold text-white">Contato</h2>
        <p>Dúvidas: <a className="text-gold-soft underline" href={`mailto:${CONTATO}`}>{CONTATO}</a>.</p>
        <p className="pt-2"><Link href="/" className="text-gold-soft underline">Voltar ao início</Link></p>
      </div>
    </main>
  );
}
