// Os blocos da oficina, no visual do Scratch 3 (renderer zelos do Blockly).
// Cada bloco é só uma peça de encaixe: quem sabe o que fazer com ele é o
// interpretador, em interprete.js. Assim nada aqui gera nem executa código,
// e o "modo lento" consegue parar em cima de qualquer bloco.
//
// Os números não são campos fixos: são encaixes com um bloquinho de número
// por baixo (a "sombra"). Quem quiser só digitar, digita; quem quiser
// encaixar uma conta ou o contador da repetição, encaixa por cima.

export const CORES = {
  ponteiro: "#4C97FF",
  formas: "#9966FF",
  combinar: "#FFAB19",
  aparencia: "#CF63CF",
  controle: "#FFBF00",
  operadores: "#59C059",
};

// Atalho para descrever um encaixe numérico e sua sombra.
const encaixe = (nome) => ({ type: "input_value", name: nome, check: "Number" });
export const sombra = (valor) => ({ shadow: { type: "bura_numero", fields: { NUM: valor } } });

export const DEFINICOES = [
  // --- Controle ---
  {
    type: "bura_inicio",
    message0: "quando eu mandar montar",
    nextStatement: null,
    colour: CORES.controle,
    tooltip: "Começo do programa. Tudo que estiver embaixo é executado em ordem.",
  },
  {
    type: "bura_repetir",
    message0: "repetir %1 vezes",
    args0: [encaixe("N")],
    message1: "%1",
    args1: [{ type: "input_statement", name: "DENTRO" }],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.controle,
    inputsInline: true,
    tooltip: "Faz tudo que está dentro várias vezes seguidas.",
  },

  // --- Ponteiro ---
  {
    type: "bura_ir_para",
    message0: "ir para x %1 y %2 z %3",
    args0: [encaixe("X"), encaixe("Y"), encaixe("Z")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    inputsInline: true,
    tooltip: "Leva o ponteiro para um lugar exato, em milímetros, contando do centro da base.",
  },
  {
    type: "bura_mover",
    message0: "mover x %1 y %2 z %3",
    args0: [encaixe("X"), encaixe("Y"), encaixe("Z")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    inputsInline: true,
    tooltip: "Anda com o ponteiro a partir de onde ele está. Aceita número negativo.",
  },
  {
    type: "bura_girar",
    message0: "girar %1 em %2 graus",
    args0: [
      {
        type: "field_dropdown",
        name: "EIXO",
        options: [
          ["em pé (Y)", "y"],
          ["para frente (X)", "x"],
          ["de lado (Z)", "z"],
        ],
      },
      encaixe("ANGULO"),
    ],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    inputsInline: true,
    tooltip: "Gira as próximas peças que forem criadas.",
  },
  {
    type: "bura_centro",
    message0: "voltar ao centro da base",
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    tooltip: "Devolve o ponteiro ao meio da base e zera o giro.",
  },

  // --- Formas ---
  {
    type: "bura_cubo",
    message0: "cubo de lado %1",
    args0: [encaixe("LADO")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_cuboide",
    message0: "caixa larg %1 alt %2 prof %3",
    args0: [encaixe("L"), encaixe("A"), encaixe("P")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_esfera",
    message0: "esfera de diâmetro %1",
    args0: [encaixe("D")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_meia_esfera",
    message0: "meia esfera de raio %1",
    args0: [encaixe("R")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_cilindro",
    message0: "cilindro diâmetro %1 altura %2",
    args0: [encaixe("D"), encaixe("A")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_cone",
    message0: "cone base %1 altura %2",
    args0: [encaixe("D"), encaixe("A")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_prisma",
    message0: "prisma de %1 lados larg %2 alt %3",
    args0: [encaixe("N"), encaixe("L"), encaixe("A")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_piramide",
    message0: "pirâmide de %1 lados larg %2 alt %3",
    args0: [encaixe("N"), encaixe("L"), encaixe("A")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_torus",
    message0: "rosquinha diâmetro %1 grossura %2",
    args0: [encaixe("D"), encaixe("G")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_anel",
    message0: "anel externo %1 altura %2 furo %3",
    args0: [encaixe("D"), encaixe("A"), encaixe("F")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_estrela",
    message0: "estrela de %1 pontas larg %2 alt %3",
    args0: [encaixe("N"), encaixe("L"), encaixe("A")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },
  {
    type: "bura_engrenagem",
    message0: "engrenagem %1 dentes diâmetro %2 altura %3",
    args0: [encaixe("N"), encaixe("D"), encaixe("A")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.formas,
    inputsInline: true,
  },

  // --- Combinar ---
  {
    type: "bura_negativa",
    message0: "marcar a última peça como negativa",
    previousStatement: null,
    nextStatement: null,
    colour: CORES.combinar,
    tooltip: "Peça negativa abre buraco na hora de combinar.",
  },
  {
    type: "bura_combinar",
    message0: "combinar todas as peças",
    previousStatement: null,
    nextStatement: null,
    colour: CORES.combinar,
    tooltip: "Soma as peças normais e desconta as negativas.",
  },
  {
    type: "bura_pousar",
    message0: "pousar tudo na base",
    previousStatement: null,
    nextStatement: null,
    colour: CORES.combinar,
  },

  // --- Aparência ---
  {
    type: "bura_pintar",
    message0: "pintar a última peça de %1",
    args0: [{ type: "field_colour", name: "COR", colour: "#7fb3d5" }],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.aparencia,
    inputsInline: true,
  },
  {
    type: "bura_textura",
    message0: "dar acabamento %1 na última peça",
    args0: [
      {
        type: "field_dropdown",
        name: "TIPO",
        options: [
          ["liso", "nenhuma"],
          ["xadrez", "xadrez"],
          ["linhas", "linhas"],
          ["isopor", "isopor"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.aparencia,
    inputsInline: true,
  },

  // --- Operadores ---
  {
    type: "bura_numero",
    message0: "%1",
    args0: [{ type: "field_number", name: "NUM", value: 0 }],
    output: "Number",
    colour: CORES.operadores,
    tooltip: "Um número.",
  },
  {
    type: "bura_conta",
    message0: "%1 %2 %3",
    args0: [
      encaixe("A"),
      {
        type: "field_dropdown",
        name: "OP",
        options: [
          ["+", "+"],
          ["-", "-"],
          ["x", "*"],
          ["÷", "/"],
        ],
      },
      encaixe("B"),
    ],
    output: "Number",
    colour: CORES.operadores,
    inputsInline: true,
    tooltip: "Faz a conta e devolve o resultado.",
  },
  {
    type: "bura_contador",
    message0: "número da repetição",
    output: "Number",
    colour: CORES.operadores,
    tooltip: "Dentro de um repetir, vale 1 na primeira volta, 2 na segunda e assim por diante.",
  },
  {
    type: "bura_acaso",
    message0: "sorteio de %1 até %2",
    args0: [encaixe("A"), encaixe("B")],
    output: "Number",
    colour: CORES.operadores,
    inputsInline: true,
    tooltip: "Sorteia um número inteiro entre os dois valores.",
  },
];

// Caixa de blocos, agrupada por assunto.
export const CAIXA = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Controle",
      colour: CORES.controle,
      contents: [
        { kind: "block", type: "bura_inicio" },
        { kind: "block", type: "bura_repetir", inputs: { N: sombra(4) } },
      ],
    },
    {
      kind: "category",
      name: "Ponteiro",
      colour: CORES.ponteiro,
      contents: [
        { kind: "block", type: "bura_ir_para", inputs: { X: sombra(0), Y: sombra(0), Z: sombra(0) } },
        { kind: "block", type: "bura_mover", inputs: { X: sombra(20), Y: sombra(0), Z: sombra(0) } },
        { kind: "block", type: "bura_girar", inputs: { ANGULO: sombra(45) } },
        { kind: "block", type: "bura_centro" },
      ],
    },
    {
      kind: "category",
      name: "Formas",
      colour: CORES.formas,
      contents: [
        { kind: "block", type: "bura_cubo", inputs: { LADO: sombra(20) } },
        { kind: "block", type: "bura_cuboide", inputs: { L: sombra(40), A: sombra(20), P: sombra(20) } },
        { kind: "block", type: "bura_esfera", inputs: { D: sombra(24) } },
        { kind: "block", type: "bura_meia_esfera", inputs: { R: sombra(15) } },
        { kind: "block", type: "bura_cilindro", inputs: { D: sombra(20), A: sombra(30) } },
        { kind: "block", type: "bura_cone", inputs: { D: sombra(24), A: sombra(30) } },
        { kind: "block", type: "bura_prisma", inputs: { N: sombra(6), L: sombra(26), A: sombra(30) } },
        { kind: "block", type: "bura_piramide", inputs: { N: sombra(4), L: sombra(26), A: sombra(30) } },
        { kind: "block", type: "bura_torus", inputs: { D: sombra(30), G: sombra(8) } },
        { kind: "block", type: "bura_anel", inputs: { D: sombra(30), A: sombra(10), F: sombra(16) } },
        { kind: "block", type: "bura_estrela", inputs: { N: sombra(5), L: sombra(30), A: sombra(12) } },
        { kind: "block", type: "bura_engrenagem", inputs: { N: sombra(12), D: sombra(40), A: sombra(8) } },
      ],
    },
    {
      kind: "category",
      name: "Combinar",
      colour: CORES.combinar,
      contents: [
        { kind: "block", type: "bura_negativa" },
        { kind: "block", type: "bura_combinar" },
        { kind: "block", type: "bura_pousar" },
      ],
    },
    {
      kind: "category",
      name: "Aparência",
      colour: CORES.aparencia,
      contents: [
        { kind: "block", type: "bura_pintar" },
        { kind: "block", type: "bura_textura" },
      ],
    },
    {
      kind: "category",
      name: "Operadores",
      colour: CORES.operadores,
      contents: [
        { kind: "block", type: "bura_numero" },
        { kind: "block", type: "bura_conta", inputs: { A: sombra(10), B: sombra(2) } },
        { kind: "block", type: "bura_contador" },
        { kind: "block", type: "bura_acaso", inputs: { A: sombra(1), B: sombra(10) } },
      ],
    },
  ],
};

// Programa de partida, para a tela nunca abrir vazia: uma torre torcida,
// que já mostra o repetir e o giro trabalhando juntos.
const TORRE = {
  type: "bura_repetir",
  inputs: {
    N: sombra(6),
    DENTRO: {
      block: {
        type: "bura_girar",
        fields: { EIXO: "y" },
        inputs: { ANGULO: sombra(15) },
        next: {
          block: {
            type: "bura_mover",
            inputs: { X: sombra(0), Y: sombra(7), Z: sombra(0) },
            next: {
              block: {
                type: "bura_cuboide",
                inputs: { L: sombra(24), A: sombra(6), P: sombra(24) },
              },
            },
          },
        },
      },
    },
  },
};

export const PROGRAMA_INICIAL = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: "bura_inicio",
        x: 40,
        y: 40,
        next: {
          block: {
            type: "bura_cilindro",
            inputs: { D: sombra(60), A: sombra(6) },
            next: { block: TORRE },
          },
        },
      },
    ],
  },
};

export function registrar(Blockly) {
  Blockly.defineBlocksWithJsonArray(DEFINICOES);
}
