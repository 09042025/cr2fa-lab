// Texto oficial da White Flame Society (Protocolo, Jornada, Biblioteca, Radar, Doutrina). Edite aqui para ajustar.

export const INTRO = [
  "O White Flame Protocol é uma metodologia filosófica e educacional de desenvolvimento individual, fundamentada no pensamento crítico, no autoconhecimento, na disciplina, na autonomia e no aprendizado permanente.",
  "Seu objetivo não é determinar o que as pessoas devem pensar, mas desenvolver a capacidade de pensar por si mesmas.",
  "Vivemos em cavernas modernas. Muitas vezes, confundimos conforto com liberdade, informação com conhecimento e opinião com verdade.",
  "O despertar começa quando questionamos nossas próprias certezas. Entretanto, despertar não é suficiente. É necessário aprender a lidar com a realidade, superar o ressentimento, governar as próprias emoções e transformar conhecimento em ação.",
  "A jornada da consciência não é linear. É uma espiral de evolução permanente.",
  "Não buscamos indivíduos que possuam todas as respostas. Buscamos indivíduos que jamais percam a coragem de questioná-las.",
] as const;

export const PHASES = [
  { tone: "blue", name: "Blue Pill", sub: "A ilusão", steps: "Passos 01 a 03", body: [
    "Representa o conforto da ignorância, a aceitação automática das narrativas e a ausência de questionamento.",
    "O indivíduo vive condicionado por hábitos, crenças e influências que nem sempre escolheu conscientemente.",
  ], goal: "reconhecer a própria caverna, questionar os condicionamentos e abandonar o piloto automático." },
  { tone: "red", name: "Red Pill", sub: "O despertar", steps: "Passos 04 a 06", body: [
    "Representa o confronto com a realidade e a descoberta das contradições existentes na sociedade e em nós mesmos.",
    "Tyler Durden representa a revolta contra o mundo.",
    "Arthur Fleck representa a dor que se transforma em caos.",
    "Ambos simbolizam o perigo de despertar sem desenvolver equilíbrio emocional e direção construtiva.",
  ], goal: "desenvolver pensamento crítico, assumir responsabilidades e transformar a revolta em energia produtiva." },
  { tone: "black", name: "Black Pill", sub: "O abismo", steps: "Passos 07 e 08", body: [
    "Representa a armadilha do fatalismo, do ressentimento e da perda de esperança.",
    "O Agente Smith conhece a Matrix, mas se torna prisioneiro do próprio desprezo.",
    "O conhecimento que não evolui para sabedoria pode se transformar em arrogância, paralisia e destruição.",
    "A Black Pill não é uma passagem obrigatória, mas um risco que precisa ser compreendido e superado.",
  ], goal: "reconhecer a própria escuridão, superar o fatalismo e reconstruir um propósito." },
  { tone: "white", name: "White Pill", sub: "A lucidez", steps: "Passos 09 a 12", body: [
    "Representa a consciência que sobrevive ao despertar.",
    "É a capacidade de compreender a realidade sem se tornar escravo dela.",
    "Na alegoria da caverna de Platão, representa a saída consciente da escuridão, a contemplação da realidade exterior e a responsabilidade de compartilhar o conhecimento adquirido.",
  ], goal: "desenvolver autodisciplina, autonomia, propósito, contribuição coletiva e aprendizado permanente." },
] as const;

export const PILLARS_FULL = [
  { n: "I", name: "Consciência", tag: "Enxergar além das sombras.", text: "Desenvolver pensamento crítico, autoconhecimento e capacidade de compreender a realidade." },
  { n: "II", name: "Disciplina", tag: "Governar a si mesmo.", text: "Transformar intenções em ações consistentes e administrar os próprios impulsos." },
  { n: "III", name: "Conhecimento", tag: "Aprender incessantemente.", text: "Buscar evidências, desenvolver competências e manter a humildade intelectual." },
  { n: "IV", name: "Liberdade", tag: "Viver com autonomia e propósito.", text: "Construir independência intelectual, emocional, profissional e financeira, respeitando a liberdade dos demais." },
] as const;

export const SCHEDULE = [
  ["01", "A Dúvida", "Questionamento"], ["02", "O Espelho", "Autoconhecimento"], ["03", "A Ruptura", "Mudança comportamental"],
  ["04", "A Verdade", "Pensamento crítico"], ["05", "A Responsabilidade", "Protagonismo"], ["06", "O Fogo", "Regulação emocional"],
  ["07", "O Abismo", "Superação do fatalismo"], ["08", "A Reconstrução", "Propósito"], ["09", "A Disciplina", "Autodomínio"],
  ["10", "A Soberania", "Autonomia"], ["11", "O Retorno à Caverna", "Contribuição coletiva"], ["12", "A Chama Eterna", "Aprendizado permanente"],
] as const;

export const MONTHLY_METHOD = [
  ["Semana 1", "Compreensão filosófica e introdução aos conceitos."],
  ["Semana 2", "Leitura, aprofundamento teórico e análise de referências."],
  ["Semana 3", "Exercícios práticos e aplicação na vida cotidiana."],
  ["Semana 4", "Avaliação, reflexão, correção e compartilhamento na comunidade."],
] as const;

export const DAILY_ROUTINE = [
  "20 minutos de leitura filosófica.",
  "15 minutos de estudo complementar.",
  "10 minutos de reflexão e anotações.",
  "15 minutos de planejamento e aplicação prática.",
] as const;

export const CORE_BOOKS = [
  "Discurso do Método — René Descartes.",
  "Rápido e Devagar: Duas Formas de Pensar — Daniel Kahneman.",
  "Hábitos Atômicos — James Clear.",
  "O Mundo Assombrado pelos Demônios — Carl Sagan.",
  "Manual de Epicteto — Epicteto.",
  "O Homem Revoltado — Albert Camus.",
  "O Mito de Sísifo — Albert Camus.",
  "Em Busca de Sentido — Viktor Frankl.",
  "Meditações — Marco Aurélio.",
  "A Psicologia Financeira — Morgan Housel.",
  "A República — Livro VII — Platão.",
  "Conjecturas e Refutações — Karl Popper.",
] as const;

export const EXTRA_BOOKS = [
  "Apologia de Sócrates — Platão.",
  "Assim Falou Zaratustra — Friedrich Nietzsche.",
  "Genealogia da Moral — Friedrich Nietzsche.",
  "Além do Bem e do Mal — Friedrich Nietzsche.",
  "Cartas a Lucílio — Sêneca.",
  "Sobre a Brevidade da Vida — Sêneca.",
  "O Mundo como Vontade e Representação — Arthur Schopenhauer.",
  "Resposta à Pergunta: O Que É o Esclarecimento? — Immanuel Kant.",
  "Comunicação Não Violenta — Marshall Rosenberg.",
  "Antifrágil — Nassim Nicholas Taleb.",
  "A Lógica da Pesquisa Científica — Karl Popper.",
  "O Andar do Bêbado — Leonard Mlodinow.",
] as const;

export const FILMS = [
  ["Matrix", "A percepção da realidade, os condicionamentos, a escolha e a liberdade intelectual."],
  ["Clube da Luta", "A alienação, o consumismo, a crise de identidade e os perigos da revolta destrutiva."],
  ["Coringa", "O sofrimento, a exclusão, o ressentimento e os perigos de transformar a dor em identidade."],
  ["O Show de Truman", "O questionamento da realidade construída e a coragem de abandonar o conhecido."],
  ["Sociedade dos Poetas Mortos", "A autonomia intelectual, o pensamento independente e o sentido da existência."],
  ["À Procura da Felicidade", "A perseverança, a responsabilidade e a construção de possibilidades diante das adversidades."],
  ["Um Sonho de Liberdade", "A esperança, a paciência, o planejamento e a preservação da liberdade interior."],
] as const;

export const RADAR_DIMS = [
  { key: "Pensamento crítico", short: "Pensamento" },
  { key: "Autoconhecimento", short: "Autoconhecimento" },
  { key: "Regulação emocional", short: "Emoções" },
  { key: "Disciplina", short: "Disciplina" },
  { key: "Autonomia intelectual", short: "Autonomia" },
  { key: "Autonomia financeira", short: "Finanças" },
  { key: "Clareza de propósito", short: "Propósito" },
  { key: "Humildade intelectual", short: "Humildade" },
  { key: "Aprendizado contínuo", short: "Aprendizado" },
  { key: "Contribuição coletiva", short: "Contribuição" },
] as const;

export const RADAR_SCALE = [
  ["0 a 2", "Competência pouco desenvolvida."],
  ["3 a 4", "Reconhecimento inicial."],
  ["5 a 6", "Desenvolvimento em andamento."],
  ["7 a 8", "Aplicação consistente."],
  ["9 a 10", "Aplicação avançada, sujeita a aperfeiçoamento permanente."],
] as const;

export const PRINCIPLES = [
  ["I", "Nenhuma crença está acima do questionamento."],
  ["II", "Nenhuma emoção deve governar todas as nossas decisões."],
  ["III", "Nenhum conhecimento justifica a arrogância."],
  ["IV", "Nenhuma adversidade elimina necessariamente nossa capacidade de agir."],
  ["V", "Nenhuma liberdade se sustenta sem responsabilidade."],
  ["VI", "Nenhuma evolução intelectual é definitiva."],
] as const;

export const CR2FA_TABLE = [
  ["Gestão da própria mente", "Gestão do patrimônio"],
  ["Pensamento crítico", "Diversificação"],
  ["Gestão das emoções", "Gestão de riscos"],
  ["Revisão de convicções", "Rebalanceamento"],
  ["Acumulação de conhecimento", "Acumulação patrimonial"],
  ["Autonomia intelectual", "Autonomia financeira"],
  ["Disciplina comportamental", "Disciplina financeira"],
  ["Visão de longo prazo", "Planejamento patrimonial"],
] as const;

export const ECOSYSTEM = [
  ["White Flame Manifest", "A filosofia central da comunidade."],
  ["White Flame Protocol", "A metodologia dos 12 passos para a soberania da mente."],
  ["White Flame Journey", "A jornada prática de estudos, exercícios e desenvolvimento individual."],
  ["White Flame Radar", "A ferramenta de autoavaliação e acompanhamento da evolução pessoal."],
  ["White Flame Infinite Cycle", "O ciclo permanente de aprendizado, aplicação, avaliação e aperfeiçoamento."],
  ["White Flame Library", "A biblioteca de referências filosóficas, psicológicas, científicas, financeiras e cinematográficas."],
  ["Protocolo CR2FA", "A metodologia de organização e construção patrimonial integrada ao ecossistema Niza Invest."],
] as const;

export const SYMBOLS = [
  ["O Lobo", "Representa a autonomia, a coragem, a capacidade de observação, a disciplina e a importância da cooperação."],
  ["A Chama Branca", "Representa a lucidez, o conhecimento, a transformação e o aprendizado permanente."],
  ["A Caverna de Platão", "Representa os condicionamentos, as limitações da percepção e a necessidade de questionar aquilo que consideramos realidade."],
  ["A Lua", "Representa a reflexão, a contemplação e a busca pelo conhecimento além das aparências."],
  ["Os Raios", "Representam o despertar, a ruptura intelectual e a energia da transformação."],
  ["As Quatro Pílulas", "Representam estados simbólicos de percepção e comportamento, não classificações de superioridade entre seres humanos."],
] as const;

export const FINAL_NOTES = [
  "A White Flame Society não busca criar seguidores de uma verdade absoluta.",
  "Busca reunir pessoas comprometidas com o conhecimento, a liberdade intelectual, a disciplina e a evolução permanente.",
  "A comunidade deve ser um espaço de investigação, debate respeitoso, compartilhamento de experiências e construção coletiva.",
] as const;

export const DISCLAIMER = "O White Flame Protocol constitui uma proposta filosófica e educacional autoral, inspirada em diferentes tradições filosóficas e conhecimentos psicológicos. Não representa uma teoria científica estabelecida, não substitui acompanhamento psicológico ou médico e não estabelece uma hierarquia de valor entre indivíduos.";
