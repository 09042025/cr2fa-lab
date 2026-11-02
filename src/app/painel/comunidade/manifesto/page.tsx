import "@fontsource/unifrakturmaguntia/latin-400.css";
import "@fontsource/cinzel/latin-500.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/eb-garamond/latin-400.css";
import "@fontsource/eb-garamond/latin-400-italic.css";
import "@fontsource/eb-garamond/latin-500.css";
import "./manifesto.css";
import hero from "@/assets/wfs/hero.webp";
import tile from "@/assets/wfs/tile.webp";
import dawn from "@/assets/wfs/dawn.webp";
import pills from "@/assets/wfs/pills.webp";

export const metadata = { title: "Manifesto | White Flame Society" };

const Q = ({ children }: { children: React.ReactNode }) => <div className="wfm-quote">{children}</div>;
const Shout = ({ children }: { children: React.ReactNode }) => <p className="wfm-shout">{children}</p>;
const Orn = () => <div className="wfm-orn" aria-hidden>✦</div>;
function Pill({ tone, title, sub, children }: { tone: "blue" | "red" | "black" | "white"; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className={`wfm-pill wfm-pill-${tone}`}>
      <h2 className="wfm-goth"><span className="wfm-cap" aria-hidden />{title}</h2>
      <h3>{sub}</h3>
      <div className="wfm-body !px-0 !pt-0 !pb-0 !text-[#d7dcea]">{children}</div>
    </section>
  );
}

export default function ManifestoPage() {
  return (
    <article
      className="wfm"
      style={{ backgroundColor: "#05070f", backgroundImage: `linear-gradient(rgba(4,6,14,0.8), rgba(4,6,14,0.88)), url(${tile.src})`, backgroundSize: "100% 100%, 100% auto", backgroundRepeat: "no-repeat, repeat-y" }}
    >
      <header className="wfm-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero.src} alt="O lobo da chama branca e a caverna de Platão" />
        <div className="wfm-title">
          <p className="wfm-kicker wfm-cin wfm-gold">MANIFEST</p>
          <h1 className="wfm-goth wfm-silver">White Flame Society</h1>
          <Orn />
          <p className="wfm-sub">A maior luta é a mente</p>
          <p className="wfm-cin mt-3 text-xs tracking-[0.3em] text-[#c7a24a] sm:text-sm">O DESPERTAR, O ABISMO E A LIBERDADE</p>
        </div>
      </header>

      <div className="wfm-body">
        <p className="wfm-drop">Vivemos em cavernas modernas. Chamamos de rotina o que é prisão. De conforto o que é anestesia. De liberdade o que muitas vezes é apenas a ilusão de escolher entre caminhos previamente determinados.</p>
        <p>Seguimos olhando para sombras projetadas por outros, acreditando que são a realidade.</p>
        <p>Consumimos para preencher vazios. Buscamos aprovação para sustentar identidades. Repetimos pensamentos que nunca questionamos.</p>
        <p>E confundimos estar vivos com estar verdadeiramente conscientes.</p>
        <p>Mas chega um momento em que algo dentro de nós desperta.</p>
        <p>Uma inquietação. Uma dúvida. Uma ruptura.</p>
        <p className="wfm-big">É o momento da escolha.</p>
      </div>

      <div className="wfm-pills">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pills.src} alt="As quatro pílulas: Blue Pill, a ilusão; Red Pill, o despertar; Black Pill, o abismo; White Pill, a lucidez" />
          <figcaption className="wfm-cin">A EVOLUÇÃO DA CONSCIÊNCIA</figcaption>
        </figure>
      </div>

      <Pill tone="blue" title="Blue Pill" sub="A ILUSÃO DO CONFORTO">
        <p>A pílula azul oferece o sono tranquilo da ignorância.</p>
        <p>É continuar vivendo sem questionar. Aceitar as regras sem compreender quem as escreveu. Confundir segurança com liberdade e conformismo com paz.</p>
        <p>Não existem correntes visíveis, porque a prisão mais eficiente é aquela que convence seus prisioneiros de que são livres.</p>
        <Q>A mente adormecida não percebe a própria escravidão.</Q>
      </Pill>

      <Pill tone="red" title="Red Pill" sub="O DESPERTAR PELA DOR">
        <p>A pílula vermelha rompe a ilusão.</p>
        <p>É enxergar aquilo que antes permanecia oculto. Perceber as manipulações, as contradições e as estruturas que condicionam nossos pensamentos.</p>
        <p>Mas despertar não significa estar livre.</p>
        <p>Tyler Durden enxergou a prisão do consumismo, da identidade fabricada e da obediência social.</p>
        <p>Decidiu destruir aquilo que o aprisionava.</p>
        <p>Mas, ao combater o sistema, criou seu próprio sistema de controle.</p>
        <p>Arthur Fleck enxergou a indiferença de um mundo que o rejeitava.</p>
        <p>Sua dor transformou-se em revolta. Sua revolta, em identidade. Sua identidade, em caos.</p>
        <p>Tyler lutava contra o mundo.</p>
        <p>Arthur lutava contra si mesmo.</p>
        <p>Ambos romperam a ilusão, mas foram consumidos pela própria reação.</p>
        <p>Porque existe uma verdade que poucos compreendem:</p>
        <Q>DESPERTAR NÃO É O MESMO QUE DOMINAR.</Q>
        <p>A raiva pode abrir os olhos, mas não pode ser o guia.</p>
        <p>A dor pode revelar a verdade, mas não deve se tornar o propósito.</p>
        <p>E quando o despertar acontece sem disciplina, consciência e direção, surge um abismo ainda mais profundo.</p>
      </Pill>

      <Pill tone="black" title="Black Pill" sub="O ABISMO DA CONSCIÊNCIA">
        <p>Existe algo mais perigoso do que viver na ilusão.</p>
        <p>É enxergar a realidade e concluir que nada pode ser transformado.</p>
        <p>A Black Pill representa o momento em que a consciência deixa de ser instrumento de libertação e se transforma em uma sentença.</p>
        <p>É o fatalismo. O niilismo. A convicção de que toda esperança é ingenuidade, toda luta é inútil e toda liberdade é uma mentira.</p>
        <Shout>O AGENTE SMITH CONHECIA A MATRIX.</Shout>
        <p>Ele compreendia sua estrutura, suas regras e suas limitações.</p>
        <p>Mas seu conhecimento não produziu sabedoria.</p>
        <p>Produziu desprezo.</p>
        <p>Smith passou a enxergar a humanidade como uma doença, a existência como um erro e a destruição como solução.</p>
        <p>Ele conhecia a prisão, mas também estava aprisionado.</p>
        <p>Não pelas ilusões da Matrix.</p>
        <p>Mas pela própria incapacidade de enxergar algo além delas.</p>
        <p>Tyler queria destruir o sistema.</p>
        <p>Arthur queria fazer o mundo sentir sua dor.</p>
        <p>Smith queria eliminar aquilo que desprezava.</p>
        <p>Três manifestações diferentes de uma mesma tragédia:</p>
        <Q>A CONSCIÊNCIA SEM AUTODOMÍNIO PODE SE TRANSFORMAR EM UMA NOVA FORMA DE ESCRAVIDÃO.</Q>
        <p>A Black Pill não é necessariamente o estágio mais elevado do despertar.</p>
        <p>Pode ser o seu maior fracasso.</p>
        <p>Porque aquele que acredita que nada pode mudar já entregou sua liberdade antes mesmo de lutar.</p>
        <p>O verdadeiro abismo não é descobrir que o mundo pode ser cruel.</p>
        <p>É permitir que essa crueldade determine quem você se tornará.</p>
      </Pill>

      <Pill tone="white" title="White Pill" sub="A SUPREMACIA DA CONSCIÊNCIA">
        <p>Mas existe um caminho além da ilusão, da revolta e do desespero.</p>
        <p>A White Pill.</p>
        <p>A pílula branca não oferece o conforto da ignorância.</p>
        <p>Não nega a dor revelada pela vermelha.</p>
        <p>E não se rende ao vazio anunciado pela preta.</p>
        <Q>ELA REPRESENTA A LUCIDEZ QUE SOBREVIVE AO DESPERTAR.</Q>
        <p>É compreender a realidade sem ser destruído por ela.</p>
        <p>É reconhecer as injustiças sem transformar o ódio em identidade.</p>
        <p>É aceitar aquilo que não podemos controlar, sem abandonar a responsabilidade de transformar aquilo que podemos.</p>
        <p>É converter:</p>
        <div className="wfm-shout wfm-lines">
          <p>RAIVA EM FOCO.</p><p>DOR EM APRENDIZADO.</p><p>CAOS EM DISCIPLINA.</p><p>SILÊNCIO EM SABEDORIA.</p><p>CONHECIMENTO EM LIBERDADE.</p>
        </div>
        <p>Tyler enxergou as correntes e tentou incendiar a prisão.</p>
        <p>Arthur enxergou sua dor e permitiu que ela o consumisse.</p>
        <p>Smith compreendeu o sistema e tornou-se prisioneiro do próprio desprezo.</p>
        <Q>O WHITE FLAME WOLF ENXERGA AS CORRENTES, COMPREENDE A PRISÃO E DECIDE NÃO SER DOMINADO POR NENHUMA DELAS.</Q>
        <p>Ele não precisa destruir o mundo para provar que é livre.</p>
        <p>Não precisa da aprovação dos outros para reconhecer seu valor.</p>
        <p>Não precisa negar a escuridão para preservar sua própria luz.</p>
        <p>Porque descobriu que o verdadeiro poder não está em controlar todas as circunstâncias.</p>
        <Q>ESTÁ EM NÃO PERMITIR QUE AS CIRCUNSTÂNCIAS CONTROLEM SUA MENTE.</Q>
      </Pill>

      <section className="wfm-pill" style={{ color: "#f1e3b4" }}>
        <h2 className="wfm-goth wfm-gold" style={{ justifyContent: "center", textAlign: "center" }}>A Filosofia do Lobo da Chama Branca</h2>
        <Orn />
        <div className="wfm-body !px-0 !pt-0 !pb-0">
          <p>Platão nos ensinou a desconfiar das sombras.</p>
          <p>Marco Aurélio nos ensinou a governar nossos julgamentos.</p>
          <p>Sêneca nos lembrou que podemos sofrer mais na imaginação do que na realidade.</p>
          <p>E a própria existência nos ensina que não existe liberdade verdadeira sem responsabilidade sobre nossas escolhas.</p>
          <p>O lobo da chama branca não é aquele que nunca sentiu medo.</p>
          <p>É aquele que aprendeu a caminhar apesar dele.</p>
          <p>Não é aquele que nunca conheceu a raiva.</p>
          <p>É aquele que se recusa a ser governado por ela.</p>
          <p>Não é aquele que nunca contemplou o abismo.</p>
          <p>É aquele que contemplou o abismo sem permitir que o abismo se tornasse sua identidade.</p>
          <p>Sua chama é branca porque não representa a fúria descontrolada.</p>
          <p>Representa a consciência refinada pela experiência, pela disciplina e pela razão.</p>
          <p>Ele não busca dominar os outros.</p>
          <Q>BUSCA DOMINAR A SI MESMO.</Q>
          <p>Não deseja fugir da realidade.</p>
          <p>Deseja compreendê-la e agir sobre ela com propósito.</p>
          <p>Não confunde serenidade com fraqueza.</p>
          <p>Porque sabe que permanecer lúcido diante do caos exige mais força do que simplesmente reagir.</p>
        </div>
      </section>

      <section className="wfm-pill wfm-final">
        <h2 className="wfm-goth wfm-silver" style={{ justifyContent: "center", textAlign: "center" }}>O Manifesto Final</h2>
        <Orn />
        <div className="wfm-body !px-0 !pt-0 !pb-0">
          <p className="l wfm-pill-blue">A PÍLULA AZUL TE MANTÉM ADORMECIDO.</p>
          <p className="l wfm-pill-red">A PÍLULA VERMELHA TE MOSTRA AS CORRENTES.</p>
          <p className="l wfm-pill-black">A PÍLULA PRETA TE CONVENCE DE QUE ELAS SÃO ETERNAS.</p>
          <p className="l wfm-pill-white">A PÍLULA BRANCA TE ENSINA A NÃO SER DEFINIDO POR ELAS.</p>
          <div className="mt-8 text-left">
            <p>A verdadeira revolução não começa nas ruas.</p>
            <p>Começa no pensamento.</p>
            <p>A maior vitória não é sobre o sistema, sobre os outros ou sobre o mundo.</p>
            <p>É sobre a mente indisciplinada, reativa e manipulável que existe dentro de nós.</p>
            <p>Porque, quando você vence a própria mente, o mundo pode continuar impondo obstáculos, mas deixa de determinar quem você é.</p>
            <p>A Matrix deixa de ser uma verdade absoluta e passa a ser uma realidade que você consegue questionar, compreender e enfrentar.</p>
            <Q>A LIBERDADE COMEÇA QUANDO VOCÊ VÊ ALÉM DAS SOMBRAS.</Q>
            <p>Mas só se completa quando você aprende a viver sob a luz da própria consciência.</p>
            <Shout>NÃO SEJA TYLER, PRISIONEIRO DA REVOLTA.</Shout>
            <Shout>NÃO SEJA ARTHUR, PRISIONEIRO DA DOR.</Shout>
            <Shout>NÃO SEJA SMITH, PRISIONEIRO DO DESPREZO.</Shout>
            <Q>SEJA AQUELE QUE DESPERTOU, ENFRENTOU O ABISMO E ESCOLHEU A LUCIDEZ.</Q>
            <p>Essa é a filosofia do White Flame Wolf.</p>
            <div className="wfm-shout wfm-lines">
              <p>NÃO DE CONFORMISMO.</p><p>NÃO DE REVOLTA CEGA.</p><p>NÃO DE DESESPERO.</p>
            </div>
            <Q>MAS DE CONSCIÊNCIA, DISCIPLINA E LIBERDADE.</Q>
            <p className="wfm-big">A maior luta é a mente. A maior conquista é governá-la.</p>
          </div>
        </div>
      </section>

      <footer className="wfm-dawn">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dawn.src} alt="" />
        <div className="wfm-dawn-text">
          <p>
            A LIBERDADE NÃO É FUGIR DA MATRIX, É NÃO PERMITIR QUE ELA CONTROLE SUA MENTE.
          </p>
        </div>
      </footer>
      <div className="wfm-seal">
        <p className="wfm-goth wfm-silver">White Flame Society</p>
        <p className="wfm-cin mt-1 text-xs tracking-[0.4em] text-[#c7a24a]">BEYOND THE MATRIX</p>
      </div>
    </article>
  );
}
