export const PILLS = [
  { tone: "blue", name: "Blue Pill", sub: "A ilusão", steps: "Passos 01–03", text: "Questionar os próprios condicionamentos." },
  { tone: "red", name: "Red Pill", sub: "O despertar", steps: "Passos 04–06", text: "Enfrentar a realidade e compreender as próprias reações." },
  { tone: "black", name: "Black Pill", sub: "A superação do abismo", steps: "Passos 07–08", text: "Reconhecer e superar o fatalismo e o ressentimento." },
  { tone: "white", name: "White Pill", sub: "A consciência soberana", steps: "Passos 09–12", text: "Desenvolver autodomínio, propósito e aprendizado contínuo." },
] as const;

export const WEEKS = [
  { n: 1, title: "A dúvida", tone: "blue" }, { n: 2, title: "O espelho", tone: "blue" }, { n: 3, title: "A ruptura", tone: "blue" },
  { n: 4, title: "A verdade", tone: "red" }, { n: 5, title: "A responsabilidade", tone: "red" }, { n: 6, title: "O fogo", tone: "red" },
  { n: 7, title: "O abismo", tone: "black" }, { n: 8, title: "A reconstrução", tone: "black" },
  { n: 9, title: "A disciplina", tone: "white" }, { n: 10, title: "A soberania", tone: "white" }, { n: 11, title: "O retorno à caverna", tone: "white" }, { n: 12, title: "A chama eterna", tone: "white" },
] as const;

export const PILLARS = [
  { name: "Consciência", text: "Enxergar além das sombras." },
  { name: "Disciplina", text: "Governar a si mesmo." },
  { name: "Conhecimento", text: "Aprender incessantemente." },
  { name: "Liberdade", text: "Viver com autonomia e propósito." },
] as const;

export const THINKERS = [
  ["Platão", "A República — Livro VII", "Questionamento da realidade"],
  ["Sócrates", "Apologia de Sócrates", "Humildade intelectual"],
  ["René Descartes", "Discurso do Método", "Dúvida metódica"],
  ["Friedrich Nietzsche", "Assim Falou Zaratustra", "Superação de si mesmo"],
  ["Marco Aurélio", "Meditações", "Autodomínio"],
  ["Epicteto", "Manual de Epicteto", "Controle das próprias ações"],
  ["Sêneca", "Cartas a Lucílio", "Sabedoria prática"],
  ["Viktor Frankl", "Em Busca de Sentido", "Propósito diante da adversidade"],
  ["Karl Popper", "Conjecturas e Refutações", "Revisão constante do conhecimento"],
] as const;

export const CYCLE = [
  { n: 1, name: "Questionar", how: "Escolha uma crença, hábito ou decisão e pergunte: por que eu acredito nisso? De onde veio? O que muda se estiver errada?" },
  { n: 2, name: "Estudar", how: "Procure fontes sérias sobre o tema, de lados diferentes. Anote o que confirma e o que contradiz o que você pensava." },
  { n: 3, name: "Aplicar", how: "Transforme o que aprendeu em uma ação concreta e pequena, com prazo. Sem aplicação, estudo vira só informação." },
  { n: 4, name: "Avaliar", how: "Olhe os resultados com honestidade: o que funcionou, o que não funcionou, o que você evitou olhar." },
  { n: 5, name: "Corrigir", how: "Ajuste a crença, o método ou a rotina. Aceite abandonar uma convicção quando a evidência mostrar que ela está errada." },
  { n: 6, name: "Compartilhar", how: "Ensine sem impor: conte o que aprendeu a alguém ou à comunidade. Explicar fixa o conhecimento e abre novas perguntas." },
] as const;

export const OATH = [
  "Não aceitarei a ignorância como conforto.",
  "Não confundirei revolta com liberdade.",
  "Não permitirei que o conhecimento se transforme em arrogância, nem que a dor se transforme em desprezo.",
  "Questionarei minhas certezas antes de questionar as dos outros.",
  "Transformarei a raiva em foco, o caos em disciplina, os erros em aprendizado e o conhecimento em liberdade.",
  "Buscarei compreender antes de julgar, construir antes de destruir e ensinar sem impor.",
  "Não serei escravo dos meus impulsos, dos meus medos ou da necessidade de aprovação.",
  "Reconhecerei que nenhuma conquista intelectual é definitiva.",
  "Minha consciência permanecerá aberta. Minha disciplina será constante. Meu aprendizado será eterno.",
] as const;
