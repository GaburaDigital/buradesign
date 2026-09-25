// Os blocos da oficina, no visual do Scratch 3 (renderer zelos do Blockly).
// Cada bloco é só uma peça de encaixe: quem sabe o que fazer com ele é o
// interpretador, em interprete.js. Assim nada aqui gera nem executa código,
// e o "modo lento" consegue parar em cima de qualquer bloco.
//
// Os números não são campos fixos: são encaixes com um bloquinho de número
// por baixo (a "sombra"). Quem quiser só digitar, digita; quem quiser
// encaixar uma conta, uma variável ou o contador da repetição, encaixa.
//
// Controle, lógica, variáveis e procedimentos são os blocos que já vêm no
// Blockly, em português. Não vale reinventá-los: eles trazem de graça o
// mutador do "senão se", o criador de variáveis e o editor de parâmetros.

export const CORES = {
  ponteiro: "#4C97FF",
  formas: "#9966FF",
  combinar: "#FFAB19",
  aparencia: "#CF63CF",
  controle: "#FFBF00",
  operadores: "#59C059",
  variaveis: "#FF8C1A",
  procedimentos: "#FF6680",
};

const encaixe = (nome, tipo = "Number") => ({ type: "input_value", name: nome, check: tipo });
export const sombra = (valor) => ({ shadow: { type: "bura_numero", fields: { NUM: valor } } });

const EIXOS = [
  ["em pé (Y)", "y"],
  ["para frente (X)", "x"],
  ["de lado (Z)", "z"],
];

// Paleta de pintura. O Blockly 11 tirou o campo de cor do núcleo — era por
// isso que o bloco de pintar aparecia sem onde escolher a cor. Uma lista de
// cores com nome resolve, funciona no toque e ainda ensina o nome da cor.
export const TINTAS = [
  ["azul", "#7fb3d5"],
  ["verde", "#8fd19e"],
  ["amarelo", "#f2d06b"],
  ["salmão", "#e8a598"],
  ["roxo", "#c5a6e0"],
  ["água", "#9fd8d2"],
  ["cinza", "#d9d9d9"],
  ["vermelho", "#e06c6c"],
  ["laranja", "#f0a860"],
  ["preto", "#3a3f44"],
  ["branco", "#f4f6f8"],
];

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
    args0: [{ type: "field_dropdown", name: "EIXO", options: EIXOS }, encaixe("ANGULO")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    inputsInline: true,
    tooltip: "Soma graus ao giro que já estava valendo.",
  },
  {
    type: "bura_apontar",
    message0: "apontar %1 para %2 graus",
    args0: [{ type: "field_dropdown", name: "EIXO", options: EIXOS }, encaixe("ANGULO")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    inputsInline: true,
    tooltip: "Giro absoluto: esquece o giro anterior e vai direto para esse ângulo.",
  },
  {
    type: "bura_pivo_girar",
    message0: "girar o pivô %1 em %2 graus",
    args0: [{ type: "field_dropdown", name: "EIXO", options: EIXOS }, encaixe("ANGULO")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    inputsInline: true,
    tooltip: "O pivô é a direção do 'avançar'. Girar o pivô não mexe na peça, muda o caminho.",
  },
  {
    type: "bura_pivo_apontar",
    message0: "apontar o pivô %1 para %2 graus",
    args0: [{ type: "field_dropdown", name: "EIXO", options: EIXOS }, encaixe("ANGULO")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    inputsInline: true,
    tooltip: "Direção exata para o pivô, sem somar com o giro anterior.",
  },
  {
    type: "bura_pivo_zerar",
    message0: "endireitar o pivô",
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    tooltip: "Devolve o pivô para a direita, que é onde ele começa.",
  },
  {
    type: "bura_avancar",
    message0: "avançar %1",
    args0: [encaixe("PASSOS")],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    inputsInline: true,
    tooltip: "Anda esse tanto de milímetros na direção em que o pivô está apontando.",
  },
  {
    type: "bura_virar_como_pivo",
    message0: "deitar a peça no rumo do pivô",
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    tooltip: "As próximas peças nascem viradas para o mesmo lado do pivô.",
  },
  {
    type: "bura_centro",
    message0: "voltar ao centro da base",
    previousStatement: null,
    nextStatement: null,
    colour: CORES.ponteiro,
    tooltip: "Devolve o ponteiro ao meio da base e zera o giro das peças. O pivô continua como está.",
  },
  {
    type: "bura_posicao",
    message0: "posição %1",
    args0: [
      {
        type: "field_dropdown",
        name: "EIXO",
        options: [
          ["x", "x"],
          ["y", "y"],
          ["z", "z"],
        ],
      },
    ],
    output: "Number",
    colour: CORES.ponteiro,
    tooltip: "Diz onde o ponteiro está nesse eixo, em milímetros.",
  },
  {
    type: "bura_pivo",
    message0: "pivô %1",
    args0: [
      {
        type: "field_dropdown",
        name: "EIXO",
        options: [
          ["x", "x"],
          ["y", "y"],
          ["z", "z"],
        ],
      },
    ],
    output: "Number",
    colour: CORES.ponteiro,
    tooltip: "Diz quantos graus o pivô está girado nesse eixo.",
  },
  {
    type: "bura_rotacao",
    message0: "rotação %1",
    args0: [
      {
        type: "field_dropdown",
        name: "EIXO",
        options: [
          ["x", "x"],
          ["y", "y"],
          ["z", "z"],
        ],
      },
    ],
    output: "Number",
    colour: CORES.ponteiro,
    tooltip: "Diz quantos graus o ponteiro está girado nesse eixo.",
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
    type: "bura_travar",
    message0: "fechar esta peça e começar outra",
    previousStatement: null,
    nextStatement: null,
    colour: CORES.combinar,
    tooltip:
      "O que já está montado fica pronto na base: o próximo combinar não mexe mais nele. Serve para montar duas peças separadas no mesmo programa.",
  },
  {
    type: "bura_pousar",
    message0: "pousar tudo na base",
    previousStatement: null,
    nextStatement: null,
    colour: CORES.combinar,
  },
  {
    type: "bura_quantas",
    message0: "quantas peças tem",
    output: "Number",
    colour: CORES.combinar,
    tooltip: "Diz quantas peças o programa já criou.",
  },

  // --- Aparência ---
  {
    type: "bura_pintar",
    message0: "pintar a última peça de %1",
    args0: [{ type: "field_dropdown", name: "COR", options: TINTAS }],
    previousStatement: null,
    nextStatement: null,
    colour: CORES.aparencia,
    inputsInline: true,
    tooltip: "Troca a cor da peça criada por último.",
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
          ["resto de", "%"],
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
    type: "bura_comparar",
    message0: "%1 %2 %3",
    args0: [
      encaixe("A"),
      {
        type: "field_dropdown",
        name: "OP",
        options: [
          ["=", "="],
          [">", ">"],
          ["<", "<"],
          ["≥", ">="],
          ["≤", "<="],
          ["≠", "!="],
        ],
      },
      encaixe("B"),
    ],
    output: "Boolean",
    colour: CORES.operadores,
    inputsInline: true,
    tooltip: "Compara dois números e responde sim ou não.",
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
        {
          kind: "block",
          type: "controls_for",
          fields: { VAR: { name: "i" } },
          inputs: { FROM: sombra(1), TO: sombra(6), BY: sombra(1) },
        },
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "controls_if", extraState: { elseIfCount: 0, hasElse: true } },
        { kind: "block", type: "controls_whileUntil" },
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
        { kind: "block", type: "bura_apontar", inputs: { ANGULO: sombra(90) } },
        { kind: "block", type: "bura_centro" },
        { kind: "block", type: "bura_pivo_girar", inputs: { ANGULO: sombra(30) } },
        { kind: "block", type: "bura_pivo_apontar", inputs: { ANGULO: sombra(90) } },
        { kind: "block", type: "bura_pivo_zerar" },
        { kind: "block", type: "bura_avancar", inputs: { PASSOS: sombra(40) } },
        { kind: "block", type: "bura_virar_como_pivo" },
        { kind: "block", type: "bura_posicao" },
        { kind: "block", type: "bura_rotacao" },
        { kind: "block", type: "bura_pivo" },
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
        { kind: "block", type: "bura_travar" },
        { kind: "block", type: "bura_pousar" },
        { kind: "block", type: "bura_quantas" },
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
        { kind: "block", type: "bura_comparar", inputs: { A: sombra(1), B: sombra(1) } },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
        { kind: "block", type: "bura_contador" },
        { kind: "block", type: "bura_acaso", inputs: { A: sombra(1), B: sombra(10) } },
      ],
    },
    { kind: "sep" },
    {
      kind: "category",
      name: "Variáveis",
      colour: CORES.variaveis,
      custom: "VARIABLE",
    },
    {
      kind: "category",
      name: "Meus blocos",
      colour: CORES.procedimentos,
      custom: "PROCEDURE",
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

// Os blocos que vêm no Blockly chegam com a cor da categoria dele: o "contar"
// e o "repetir enquanto" verdes (laços), o "se" e o "e/ou/não" azuis (lógica).
// Na nossa caixa eles moram em Controle e Operadores, então precisam da cor
// daqui — senão o aluno não acha o bloco pela cor da gaveta.
const RECOLORIR = [
  ["controls_if", CORES.controle],
  ["controls_for", CORES.controle],
  ["controls_whileUntil", CORES.controle],
  ["controls_repeat_ext", CORES.controle],
  ["logic_compare", CORES.operadores],
  ["logic_operation", CORES.operadores],
  ["logic_negate", CORES.operadores],
  ["logic_boolean", CORES.operadores],
  ["math_number", CORES.operadores],
  ["math_arithmetic", CORES.operadores],
  ["math_random_int", CORES.operadores],
];

export function registrar(Blockly) {
  Blockly.defineBlocksWithJsonArray(DEFINICOES);

  for (const [tipo, cor] of RECOLORIR) {
    const definicao = Blockly.Blocks[tipo];
    if (!definicao || definicao.buraRecolorido) continue;
    const antigo = definicao.init;
    definicao.init = function iniciar() {
      antigo.call(this);
      this.setColour(cor);
    };
    definicao.buraRecolorido = true;
  }
}
