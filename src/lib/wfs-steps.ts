// Texto oficial do White Flame Protocol (12 passos). Edite aqui para ajustar.
export type Block = { t: "p"; text: string } | { t: "ul" | "ol"; items: string[] };
export interface Step { n: number; title: string; sub: string; phase: "blue" | "red" | "black" | "white"; principle: Block[]; philosophy: Block[]; study: Block[]; reading: Block[]; exercise: Block[]; challenge: Block[]; question: Block[]; criterion: Block[]; phrase: Block[] }

export const STEPS: Step[] = [
 {
  "n": 1,
  "title": "A dúvida",
  "sub": "Questionar as sombras.",
  "phase": "blue",
  "challenge": [
   {
    "t": "p",
    "text": "Identificar pelo menos uma crença pessoal que precisa ser revista."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Conseguir questionar uma crença pessoal sem interpretar esse questionamento como uma ameaça à própria identidade."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Escreva dez crenças importantes sobre dinheiro, sucesso, felicidade, sociedade e liberdade."
   },
   {
    "t": "p",
    "text": "Investigue:"
   },
   {
    "t": "ul",
    "items": [
     "De onde vieram essas crenças?",
     "Quais evidências as sustentam?",
     "Existem argumentos contrários?",
     "O que poderia demonstrar que estão erradas?"
    ]
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "Desde o nascimento, recebemos informações da família, da escola, da cultura, da sociedade e dos meios de comunicação."
   },
   {
    "t": "p",
    "text": "Parte dessas informações se transforma em crenças que carregamos durante toda a vida, muitas vezes sem examinar sua validade."
   },
   {
    "t": "p",
    "text": "Na alegoria da caverna de Platão, os prisioneiros acreditavam que as sombras eram a realidade porque nunca haviam conhecido outra coisa."
   },
   {
    "t": "p",
    "text": "A dúvida é o primeiro movimento em direção à liberdade intelectual."
   },
   {
    "t": "p",
    "text": "Questionar tudo não significa rejeitar tudo. Significa exigir fundamentos antes de aceitar uma afirmação como verdadeira."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "A primeira corrente que precisa ser rompida é aquela que você ainda não percebeu que carrega."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "Nem tudo aquilo em que acredito foi escolhido conscientemente por mim."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Quantas das minhas convicções foram realmente construídas por mim?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "Discurso do Método — René Descartes."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Alegoria da Caverna de Platão.",
     "Método socrático de questionamento.",
     "Dúvida metódica de René Descartes.",
     "Viés de confirmação.",
     "Diferença entre crença, opinião, conhecimento e evidência."
    ]
   }
  ]
 },
 {
  "n": 2,
  "title": "O espelho",
  "sub": "Conhecer a si mesmo.",
  "phase": "blue",
  "challenge": [
   {
    "t": "p",
    "text": "Reconhecer três comportamentos automáticos que prejudicam sua evolução."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Reconhecer os próprios padrões emocionais antes que eles determinem automaticamente seu comportamento."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Durante sete dias, mantenha um diário de decisões e emoções."
   },
   {
    "t": "p",
    "text": "Registre:"
   },
   {
    "t": "ul",
    "items": [
     "O acontecimento.",
     "Sua interpretação.",
     "A emoção experimentada.",
     "Sua reação.",
     "As consequências.",
     "Como poderia ter reagido de maneira diferente."
    ]
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "Duas pessoas podem observar exatamente a mesma situação e interpretá-la de maneiras completamente diferentes."
   },
   {
    "t": "p",
    "text": "Nossas experiências, expectativas, emoções e preconceitos influenciam nossa percepção."
   },
   {
    "t": "p",
    "text": "O autoconhecimento permite identificar esses filtros."
   },
   {
    "t": "p",
    "text": "Quem desconhece suas próprias vulnerabilidades pode ser mais facilmente influenciado pelo medo, pela necessidade de aprovação, pela publicidade, pela pressão social e pelos impulsos emocionais."
   },
   {
    "t": "p",
    "text": "Antes de compreender o mundo, é necessário compreender quem o observa."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "O adversário mais difícil de compreender é aquele que aparece diante do espelho."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "Não é possível governar aquilo que não se conhece."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Sou eu quem toma minhas decisões ou são meus medos e impulsos?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "Rápido e Devagar: Duas Formas de Pensar — Daniel Kahneman."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Autoconhecimento na filosofia socrática.",
     "Metacognição.",
     "Mecanismos de defesa psicológica.",
     "Dissonância cognitiva.",
     "Inteligência emocional.",
     "Vieses cognitivos."
    ]
   }
  ]
 },
 {
  "n": 3,
  "title": "A ruptura",
  "sub": "Abandonar o piloto automático.",
  "phase": "blue",
  "challenge": [
   {
    "t": "p",
    "text": "Executar uma nova rotina durante 21 dias, utilizando esse período como experiência inicial, não como garantia de consolidação de um hábito."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Executar mudanças concretas na rotina, em vez de apenas desejar mudar."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Identifique três hábitos prejudiciais e substitua gradualmente cada um deles por um comportamento construtivo."
   },
   {
    "t": "p",
    "text": "Exemplos:"
   },
   {
    "t": "ul",
    "items": [
     "Consumo excessivo de redes sociais por leitura.",
     "Sedentarismo por atividade física.",
     "Compras impulsivas por planejamento financeiro.",
     "Entretenimento excessivo por desenvolvimento de competências."
    ]
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "É possível reconhecer intelectualmente que um hábito é prejudicial e continuar praticando-o."
   },
   {
    "t": "p",
    "text": "O conhecimento, sozinho, não transforma o comportamento."
   },
   {
    "t": "p",
    "text": "Nesta etapa, o indivíduo começa a substituir comportamentos automáticos por escolhas deliberadas."
   },
   {
    "t": "p",
    "text": "Isso exige compreender como os hábitos são formados, como o ambiente influencia nossas decisões e por que buscamos recompensas imediatas."
   },
   {
    "t": "p",
    "text": "A liberdade começa a adquirir uma dimensão prática."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "Quem não escolhe conscientemente sua rotina permite que outros fatores escolham seu destino."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "Conforto não é necessariamente liberdade."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Minha rotina foi construída para alcançar meus objetivos ou apenas para satisfazer meus impulsos?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "Hábitos Atômicos — James Clear."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Formação de hábitos.",
     "Gratificação imediata.",
     "Autocontrole.",
     "Economia da atenção.",
     "Procrastinação.",
     "Influência do ambiente sobre o comportamento."
    ]
   }
  ]
 },
 {
  "n": 4,
  "title": "A verdade",
  "sub": "Desenvolver pensamento crítico.",
  "phase": "red",
  "challenge": [
   {
    "t": "p",
    "text": "Conseguir explicar uma posição contrária à sua sem distorcê-la."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Conseguir mudar de opinião diante de evidências melhores, sem considerar isso uma derrota."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Escolha uma notícia econômica, uma tese de investimento ou uma questão social."
   },
   {
    "t": "p",
    "text": "Analise:"
   },
   {
    "t": "ul",
    "items": [
     "Fontes independentes.",
     "Dados verificáveis.",
     "Interesses envolvidos.",
     "Argumentos favoráveis.",
     "Argumentos contrários.",
     "Limitações das evidências."
    ]
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "O pensamento crítico exige aceitar a possibilidade de estar errado."
   },
   {
    "t": "p",
    "text": "Não basta abandonar uma narrativa dominante para adotar automaticamente uma narrativa contrária."
   },
   {
    "t": "p",
    "text": "Isso pode representar apenas a substituição de uma caverna por outra."
   },
   {
    "t": "p",
    "text": "Uma pessoa verdadeiramente crítica aplica o mesmo rigor às ideias com as quais concorda e àquelas das quais discorda."
   },
   {
    "t": "p",
    "text": "O conhecimento deve permanecer aberto à revisão."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "Trocar uma mentira confortável por outra conveniente não é despertar."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "A verdade não precisa agradar às minhas convicções."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Estou buscando a verdade ou apenas informações que confirmem aquilo em que já acredito?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "O Mundo Assombrado pelos Demônios — Carl Sagan."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Lógica e argumentação.",
     "Falácias argumentativas.",
     "Método científico.",
     "Falseabilidade de Karl Popper.",
     "Probabilidade e estatística.",
     "Avaliação de evidências.",
     "Correlação versus causalidade."
    ]
   }
  ]
 },
 {
  "n": 5,
  "title": "A responsabilidade",
  "sub": "Recuperar o protagonismo.",
  "phase": "red",
  "challenge": [
   {
    "t": "p",
    "text": "Resolver um problema concreto que vem sendo adiado."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Reduzir reações improdutivas e aumentar ações deliberadas diante dos problemas."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Divida seus problemas em três categorias:"
   },
   {
    "t": "ol",
    "items": [
     "Aquilo que posso controlar diretamente.",
     "Aquilo que posso influenciar parcialmente.",
     "Aquilo que está fora do meu controle."
    ]
   },
   {
    "t": "p",
    "text": "Concentre seus esforços nas duas primeiras categorias."
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "O estoicismo distingue aquilo que depende de nossas escolhas daquilo que está fora do nosso controle direto."
   },
   {
    "t": "p",
    "text": "Não controlamos a economia, os mercados, o passado, as decisões governamentais ou o comportamento de outras pessoas."
   },
   {
    "t": "p",
    "text": "Mas podemos trabalhar nossa preparação, nossos hábitos, nossa exposição ao risco e nossas respostas diante das circunstâncias."
   },
   {
    "t": "p",
    "text": "Responsabilidade não significa assumir culpa por tudo que acontece."
   },
   {
    "t": "p",
    "text": "Significa reconhecer a própria capacidade de agir dentro das limitações existentes."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "Você não controla todas as cartas que recebe, mas pode aprender a jogar melhor com elas."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "Não controlo todas as circunstâncias, mas posso escolher como agir diante delas."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Quanto da minha energia estou desperdiçando com situações que não posso controlar?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "Manual de Epicteto — Epicteto."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Dicotomia do controle de Epicteto.",
     "Estoicismo aplicado.",
     "Responsabilidade individual.",
     "Tomada de decisão sob incerteza.",
     "Resiliência diante de adversidades."
    ]
   }
  ]
 },
 {
  "n": 6,
  "title": "O fogo",
  "sub": "Transformar a revolta.",
  "phase": "red",
  "challenge": [
   {
    "t": "p",
    "text": "Substituir uma reação impulsiva por uma resposta racional e deliberada."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Experimentar emoções intensas sem permitir que elas determinem todas as suas ações."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Identifique situações que despertam raiva, ressentimento ou frustração."
   },
   {
    "t": "p",
    "text": "Registre a origem dessas emoções e desenvolva alternativas construtivas para lidar com elas."
   },
   {
    "t": "p",
    "text": "Evite decisões irreversíveis enquanto estiver emocionalmente alterado."
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "Tyler Durden e Arthur Fleck representam dois perigos do despertar, dentro da interpretação simbólica do manifesto."
   },
   {
    "t": "p",
    "text": "Tyler identifica contradições da sociedade, mas transforma sua revolta em destruição e controle."
   },
   {
    "t": "p",
    "text": "Arthur experimenta rejeição e sofrimento, mas permite que essas experiências se transformem em uma identidade destrutiva."
   },
   {
    "t": "p",
    "text": "A lição não é eliminar a raiva."
   },
   {
    "t": "p",
    "text": "É aprender a reconhecer sua origem e direcioná-la de maneira construtiva."
   },
   {
    "t": "p",
    "text": "A emoção pode fornecer energia. A razão deve orientar sua utilização."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "O mesmo fogo que destrói também pode forjar. A diferença está em quem o governa."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "A raiva pode revelar um problema, mas não deve governar a solução."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Estou combatendo um problema real ou apenas tentando descarregar minha própria frustração?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "O Homem Revoltado — Albert Camus."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Regulação emocional.",
     "Ressentimento na filosofia de Nietzsche.",
     "Filosofia do absurdo e da revolta de Albert Camus.",
     "Impulsividade.",
     "Comunicação assertiva.",
     "Tomada de decisão sob pressão."
    ]
   }
  ]
 },
 {
  "n": 7,
  "title": "O abismo",
  "sub": "Reconhecer a própria escuridão.",
  "phase": "black",
  "challenge": [
   {
    "t": "p",
    "text": "Encontrar possibilidades de ação onde antes enxergava apenas impossibilidades."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Reconhecer dificuldades reais sem concluir automaticamente que toda ação é inútil."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Identifique cinco pensamentos fatalistas sobre sua vida ou sobre o mundo."
   },
   {
    "t": "p",
    "text": "Examine:"
   },
   {
    "t": "ul",
    "items": [
     "Quais evidências os sustentam?",
     "Existem exceções?",
     "Estou generalizando experiências negativas?",
     "Existe alguma possibilidade concreta de ação?"
    ]
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "O Agente Smith representa a consciência que se transforma em desprezo."
   },
   {
    "t": "p",
    "text": "Ele conhece a estrutura da Matrix, mas seu conhecimento não produz uma relação construtiva com a existência."
   },
   {
    "t": "p",
    "text": "Na interpretação da White Flame Society, a Black Pill surge quando o indivíduo passa a acreditar que toda tentativa de transformação é inútil, que toda esperança é ingenuidade e que não existe possibilidade de construir algo melhor."
   },
   {
    "t": "p",
    "text": "É importante distinguir o niilismo filosófico, que possui diferentes interpretações, do fatalismo e do pessimismo absoluto."
   },
   {
    "t": "p",
    "text": "O desafio é compreender a realidade sem abandonar a capacidade de agir."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "Conhecer o abismo não significa entregar-se a ele."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "Compreender a crueldade do mundo não exige tornar-se cruel."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Minha visão pessimista representa uma conclusão fundamentada ou uma defesa contra novas frustrações?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "O Mito de Sísifo — Albert Camus."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Niilismo na filosofia de Nietzsche.",
     "Pessimismo filosófico de Schopenhauer.",
     "Absurdo existencial de Albert Camus.",
     "Desamparo aprendido.",
     "Cinismo e fatalismo.",
     "Generalizações cognitivas."
    ]
   }
  ]
 },
 {
  "n": 8,
  "title": "A reconstrução",
  "sub": "Escolher um propósito.",
  "phase": "black",
  "challenge": [
   {
    "t": "p",
    "text": "Iniciar um projeto concreto alinhado à sua visão de futuro."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Possuir uma direção pessoal que se traduza em projetos e ações concretas."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Elabore uma visão pessoal para os próximos cinco anos, contemplando:"
   },
   {
    "t": "ul",
    "items": [
     "Saúde física e mental.",
     "Conhecimento.",
     "Família e relacionamentos.",
     "Carreira.",
     "Patrimônio.",
     "Liberdade.",
     "Contribuição à sociedade."
    ]
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "O ser humano precisa de direção para organizar seus esforços."
   },
   {
    "t": "p",
    "text": "Depois de questionar antigas crenças, existe o risco de permanecer em um vazio de significado."
   },
   {
    "t": "p",
    "text": "A reconstrução consiste em desenvolver valores, objetivos e compromissos que orientem a existência."
   },
   {
    "t": "p",
    "text": "Viktor Frankl defende a importância da busca por sentido, inclusive diante de circunstâncias adversas."
   },
   {
    "t": "p",
    "text": "O propósito não precisa ser grandioso."
   },
   {
    "t": "p",
    "text": "Pode estar na construção de uma família, no desenvolvimento intelectual, no trabalho, na criação de um negócio ou na contribuição para outras pessoas."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "Depois de compreender aquilo que precisa mudar, decida aquilo que deseja construir."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "Conhecer o problema não basta. É necessário construir uma resposta."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Se eu deixar de lutar contra aquilo que desprezo, o que realmente desejo construir?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "Em Busca de Sentido — Viktor Frankl."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Existencialismo.",
     "Logoterapia de Viktor Frankl.",
     "Construção de valores pessoais.",
     "Motivação intrínseca.",
     "Planejamento estratégico individual.",
     "Desenvolvimento de objetivos."
    ]
   }
  ]
 },
 {
  "n": 9,
  "title": "A disciplina",
  "sub": "Governar a própria mente.",
  "phase": "white",
  "challenge": [
   {
    "t": "p",
    "text": "Manter os compromissos assumidos consigo mesmo, registrando os resultados e realizando ajustes quando necessário."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Manter consistência mesmo quando a motivação diminui."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Construa uma rotina sustentável contemplando:"
   },
   {
    "t": "ul",
    "items": [
     "Estudos.",
     "Atividade física.",
     "Organização financeira.",
     "Desenvolvimento profissional.",
     "Descanso.",
     "Reflexão individual."
    ]
   },
   {
    "t": "p",
    "text": "Acompanhe sua execução durante 30 dias."
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "A disciplina permite transformar conhecimento em comportamento consistente."
   },
   {
    "t": "p",
    "text": "Não basta compreender a importância de estudar, investir, cuidar da saúde ou desenvolver competências."
   },
   {
    "t": "p",
    "text": "É necessário executar essas ações repetidamente."
   },
   {
    "t": "p",
    "text": "Marco Aurélio compreendia a filosofia como uma prática cotidiana, não apenas como um exercício intelectual."
   },
   {
    "t": "p",
    "text": "A disciplina também exige equilíbrio."
   },
   {
    "t": "p",
    "text": "Não significa ignorar o descanso, eliminar emoções ou buscar produtividade a qualquer custo."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "A motivação inicia a caminhada. A disciplina sustenta a jornada."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "Liberdade sem autodisciplina pode se transformar em outra forma de escravidão."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Consigo cumprir os compromissos que assumo comigo mesmo?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "Meditações — Marco Aurélio."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Estoicismo de Marco Aurélio.",
     "Autodisciplina.",
     "Autorregulação.",
     "Funções executivas.",
     "Gestão do tempo.",
     "Sistemas de produtividade.",
     "Melhoria contínua."
    ]
   }
  ]
 },
 {
  "n": 10,
  "title": "A soberania",
  "sub": "Construir autonomia.",
  "phase": "white",
  "challenge": [
   {
    "t": "p",
    "text": "Construir uma estratégia pessoal de longo prazo e iniciar sua execução."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Tomar decisões fundamentadas, reconhecer quando precisa de ajuda e assumir responsabilidade pelos resultados."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Construa um plano de autonomia pessoal, identificando:"
   },
   {
    "t": "ul",
    "items": [
     "Dependências desnecessárias.",
     "Vulnerabilidades financeiras.",
     "Competências necessárias.",
     "Fontes de renda.",
     "Objetivos patrimoniais.",
     "Riscos profissionais.",
     "Riscos digitais."
    ]
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "A soberania individual possui diversas dimensões:"
   },
   {
    "t": "ul",
    "items": [
     "Intelectual.",
     "Emocional.",
     "Financeira.",
     "Profissional.",
     "Digital."
    ]
   },
   {
    "t": "p",
    "text": "Uma pessoa pode possuir muito patrimônio e continuar dependente da aprovação alheia."
   },
   {
    "t": "p",
    "text": "Também pode possuir grande conhecimento e ser incapaz de administrar suas emoções."
   },
   {
    "t": "p",
    "text": "A autonomia exige desenvolvimento equilibrado."
   },
   {
    "t": "p",
    "text": "No universo dos investimentos, isso significa compreender os ativos, os riscos e as consequências das próprias decisões, em vez de simplesmente reproduzir recomendações."
   },
   {
    "t": "p",
    "text": "É neste ponto que o White Flame Protocol se conecta diretamente ao Protocolo CR2FA."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "A verdadeira riqueza começa quando você amplia sua capacidade de escolher o próprio caminho."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "Quanto maior a capacidade de tomar decisões conscientes, maior a autonomia."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Minhas escolhas são fundamentadas em conhecimento ou na dependência da opinião de terceiros?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "A Psicologia Financeira — Morgan Housel."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Autonomia na filosofia de Immanuel Kant.",
     "Educação financeira.",
     "Gestão patrimonial.",
     "Gestão de riscos.",
     "Segurança digital e privacidade.",
     "Negociação.",
     "Desenvolvimento profissional.",
     "Psicologia comportamental aplicada aos investimentos."
    ]
   }
  ]
 },
 {
  "n": 11,
  "title": "O retorno à caverna",
  "sub": "Compartilhar a luz.",
  "phase": "white",
  "challenge": [
   {
    "t": "p",
    "text": "Contribuir efetivamente para o desenvolvimento de outra pessoa."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Conseguir ensinar, ouvir críticas e aprender com aqueles a quem ensina."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Escolha um conhecimento adquirido durante a jornada e produza:"
   },
   {
    "t": "ul",
    "items": [
     "Uma aula.",
     "Um artigo.",
     "Uma publicação na comunidade.",
     "Um vídeo educacional.",
     "Uma discussão fundamentada."
    ]
   },
   {
    "t": "p",
    "text": "Utilize linguagem acessível e fontes verificáveis."
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "Na alegoria de Platão, o prisioneiro que contempla a realidade exterior retorna à caverna."
   },
   {
    "t": "p",
    "text": "Esse retorno simboliza a responsabilidade de compartilhar o conhecimento adquirido."
   },
   {
    "t": "p",
    "text": "Entretanto, ensinar não significa obrigar outras pessoas a aceitar nossa interpretação da realidade."
   },
   {
    "t": "p",
    "text": "A imposição de uma verdade pode reproduzir exatamente os mecanismos de controle que o manifesto questiona."
   },
   {
    "t": "p",
    "text": "A White Flame Society deve ser uma comunidade de investigação, não de obediência intelectual."
   },
   {
    "t": "p",
    "text": "Compartilhar conhecimento exige humildade, respeito e responsabilidade."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "A chama que ilumina outra chama não perde sua própria luz."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "O conhecimento ganha outra dimensão quando contribui para a evolução de outras pessoas."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "Compartilho conhecimento para ajudar outras pessoas ou para demonstrar superioridade?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "A República — Livro VII — Platão."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Livro VII de A República, de Platão.",
     "Ética do conhecimento.",
     "Comunicação não violenta.",
     "Método socrático de ensino.",
     "Aprendizagem colaborativa.",
     "Técnica de Feynman."
    ]
   }
  ]
 },
 {
  "n": 12,
  "title": "A chama eterna",
  "sub": "Aprender até o último dia.",
  "phase": "white",
  "challenge": [
   {
    "t": "p",
    "text": "Ser capaz de abandonar uma convicção quando novas evidências demonstrarem que ela está errada."
   }
  ],
  "criterion": [
   {
    "t": "p",
    "text": "Compreender que não existe conclusão definitiva para esta etapa."
   }
  ],
  "exercise": [
   {
    "t": "p",
    "text": "Realize uma revisão mensal das suas:"
   },
   {
    "t": "ul",
    "items": [
     "Crenças.",
     "Decisões.",
     "Conquistas.",
     "Erros.",
     "Metas.",
     "Estratégias.",
     "Novas competências.",
     "Convicções que precisaram ser modificadas."
    ]
   }
  ],
  "philosophy": [
   {
    "t": "p",
    "text": "O último estágio representa a consciência de que todo conhecimento humano é limitado."
   },
   {
    "t": "p",
    "text": "Novas informações surgem. Tecnologias evoluem. Circunstâncias mudam. Ideias anteriormente consideradas corretas podem precisar de revisão."
   },
   {
    "t": "p",
    "text": "Aquele que acredita ter alcançado uma verdade definitiva corre o risco de construir uma nova caverna ao redor das próprias convicções."
   },
   {
    "t": "p",
    "text": "A chama branca representa a manutenção permanente da curiosidade, da disciplina e da humildade intelectual."
   },
   {
    "t": "p",
    "text": "O verdadeiro despertar não possui linha de chegada."
   }
  ],
  "phrase": [
   {
    "t": "p",
    "text": "O verdadeiro White Flame Wolf não é aquele que possui todas as respostas. É aquele que nunca perde a coragem de questioná-las."
   }
  ],
  "principle": [
   {
    "t": "p",
    "text": "Aquele que acredita saber tudo começa a retornar à caverna."
   }
  ],
  "question": [
   {
    "t": "p",
    "text": "O que acredito saber hoje que poderá precisar ser corrigido amanhã?"
   }
  ],
  "reading": [
   {
    "t": "p",
    "text": "Conjecturas e Refutações — Karl Popper."
   }
  ],
  "study": [
   {
    "t": "ul",
    "items": [
     "Epistemologia.",
     "Falibilismo.",
     "Aprendizagem ao longo da vida.",
     "Pensamento probabilístico.",
     "Melhoria contínua.",
     "PDCA e Kaizen.",
     "Pensamento sistêmico."
    ]
   }
  ]
 }
];
