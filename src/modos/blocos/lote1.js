// Primeiro lote de desafios de programação: vinte missões, do primeiro cubo
// até um projeto que usa tudo junto.
//
// Cada desafio traz o "gabarito": um programa em blocos que resolve a missão.
// Ele prova no teste que as medidas pedidas são alcançáveis e nunca é
// comparado com o programa do aluno — quem é medido é a peça que saiu. Os
// atalhos de montagem moram em receita.js.

import {
  n,
  fila,
  programa,
  cubo,
  caixa,
  cilindro,
  mover,
  irPara,
  girar,
  apontar,
  repetir,
  contador,
  conta,
  pegar,
  negativa,
  combinar,
} from "./receita.js";

export const DESAFIOS = [
  {
    id: "l1-01",
    nome: "O primeiro cubo",
    alien: "nibla",
    fala: "Regra número um da oficina: o programa monta, você só manda. Comece pequeno.",
    enunciado: "Monte um cubo de 30 mm de lado.",
    dicas: ['Na gaveta Formas, pegue "cubo de lado" e encaixe embaixo do bloco de começo.'],
    metas: [
      { tipo: "largura", alvo: 30 },
      { tipo: "altura", alvo: 30 },
      { tipo: "profundidade", alvo: 30 },
      { tipo: "pecas", alvo: 1 },
    ],
    gabarito: programa(cubo(30)),
  },

  {
    id: "l1-02",
    nome: "A caixa da encomenda",
    alien: "zorp",
    fala: "Nem tudo é quadrado. Largura, altura e profundidade são três números diferentes.",
    enunciado: "Monte uma caixa de 60 mm de largura, 20 mm de altura e 40 mm de profundidade.",
    dicas: ["Largura é o X, altura é o Y, profundidade é o Z."],
    metas: [
      { tipo: "largura", alvo: 60 },
      { tipo: "altura", alvo: 20 },
      { tipo: "profundidade", alvo: 40 },
      { tipo: "pecas", alvo: 1 },
    ],
    gabarito: programa(caixa(60, 20, 40)),
  },

  {
    id: "l1-03",
    nome: "O pilar",
    alien: "zorp",
    fala: "Alto e fino. Se cair, é porque a base era estreita demais.",
    enunciado: "Monte um pilar: uma caixa de 20 mm de largura, 70 mm de altura e 20 mm de profundidade.",
    dicas: ["É a mesma caixa do desafio anterior, com outros números."],
    metas: [
      { tipo: "largura", alvo: 20 },
      { tipo: "altura", alvo: 70 },
      { tipo: "profundidade", alvo: 20 },
      { tipo: "pecas", alvo: 1 },
    ],
    gabarito: programa(caixa(20, 70, 20)),
  },

  {
    id: "l1-04",
    nome: "Dois postes",
    alien: "krux",
    fala: "O ponteiro é o seu lápis. Ele anda, e a próxima peça nasce onde ele parou.",
    enunciado:
      "Monte dois cilindros de 16 mm de diâmetro e 50 mm de altura. Entre um e outro, ande 60 mm no X.",
    dicas: ['O bloco "mover" anda a partir de onde o ponteiro está.', "A peça nasce onde o ponteiro estiver."],
    metas: [
      { tipo: "pecas", alvo: 2 },
      { tipo: "largura", alvo: 76 },
      { tipo: "altura", alvo: 50 },
      { tipo: "profundidade", alvo: 16 },
    ],
    gabarito: programa(fila(cilindro(16, 50), mover(60, 0, 0), cilindro(16, 50))),
  },

  {
    id: "l1-05",
    nome: "Pino com cabeça",
    alien: "krux",
    fala: "Subir também é andar. O Y é para cima.",
    enunciado:
      "Monte um cilindro de 30 mm de diâmetro e 6 mm de altura e, exatamente em cima dele, outro de 12 mm de diâmetro e 40 mm de altura.",
    dicas: ["Depois da primeira peça, mova 6 mm no Y — a altura da cabeça."],
    metas: [
      { tipo: "pecas", alvo: 2 },
      { tipo: "largura", alvo: 30 },
      { tipo: "altura", alvo: 46 },
      { tipo: "profundidade", alvo: 30 },
    ],
    gabarito: programa(fila(cilindro(30, 6), mover(0, 6, 0), cilindro(12, 40))),
  },

  {
    id: "l1-06",
    nome: "Torre de quatro",
    alien: "pip",
    fala: "Copiar bloco quatro vezes funciona. Mandar repetir quatro vezes é mais bonito.",
    enunciado: "Empilhe quatro cubos de 20 mm, um em cima do outro, usando o bloco de repetir.",
    dicas: ["Dentro do repetir: crie o cubo e depois suba 20 mm.", "A ordem importa."],
    metas: [
      { tipo: "pecas", alvo: 4 },
      { tipo: "largura", alvo: 20 },
      { tipo: "altura", alvo: 80 },
      { tipo: "profundidade", alvo: 20 },
    ],
    gabarito: programa(repetir(4, fila(cubo(20), mover(0, 20, 0)))),
  },

  {
    id: "l1-07",
    nome: "A escada",
    alien: "pip",
    fala: "Cada degrau anda para o lado e sobe um tanto. Sempre o mesmo tanto.",
    enunciado:
      "Faça cinco degraus com caixas de 20 mm de largura, 10 mm de altura e 20 mm de profundidade. Entre um degrau e o outro, ande 20 mm no X e 10 mm no Y.",
    dicas: ["Um repetir de cinco voltas resolve.", "Dentro dele vão a caixa e um mover só, com dois números."],
    metas: [
      { tipo: "pecas", alvo: 5 },
      { tipo: "largura", alvo: 100 },
      { tipo: "altura", alvo: 50 },
      { tipo: "profundidade", alvo: 20 },
    ],
    gabarito: programa(repetir(5, fila(caixa(20, 10, 20), mover(20, 10, 0)))),
  },

  {
    id: "l1-08",
    nome: "Pirâmide de andares",
    alien: "nibla",
    fala: 'O bloco "número da repetição" sabe em que volta você está. Use isso.',
    enunciado:
      "Empilhe cinco andares de 10 mm de altura. O de baixo tem 60 mm de lado e cada andar é 10 mm menor que o anterior.",
    dicas: [
      'Encaixe uma conta no tamanho da caixa: 70 menos o "número da repetição" vezes 10.',
      "Na primeira volta isso dá 60; na última, 20.",
    ],
    metas: [
      { tipo: "pecas", alvo: 5 },
      { tipo: "largura", alvo: 60 },
      { tipo: "altura", alvo: 50 },
      { tipo: "profundidade", alvo: 60 },
    ],
    gabarito: programa(
      repetir(
        5,
        fila(
          {
            type: "bura_cuboide",
            inputs: {
              L: conta(n(70), "-", conta(contador(), "*", n(10))),
              A: n(10),
              P: conta(n(70), "-", conta(contador(), "*", n(10))),
            },
          },
          mover(0, 10, 0),
        ),
      ),
    ),
  },

  {
    id: "l1-09",
    nome: "O cata-vento",
    alien: "zorp",
    fala: "Girar não move a peça de lugar: muda o jeito dela chegar.",
    enunciado:
      "Monte seis pás iguais saindo do mesmo ponto: caixas de 60 mm de largura, 4 mm de altura e 8 mm de profundidade, girando 30 graus em pé (Y) a cada volta.",
    dicas: ["Dentro do repetir: primeiro gire, depois crie a caixa.", "Não mova o ponteiro."],
    metas: [
      { tipo: "pecas", alvo: 6 },
      { tipo: "altura", alvo: 4 },
      { tipo: "largura", alvo: 60, limite: 8 },
      { tipo: "profundidade", alvo: 60, limite: 8 },
    ],
    gabarito: programa(repetir(6, fila(girar("y", 30), caixa(60, 4, 8)))),
  },

  {
    id: "l1-10",
    nome: "Torre em caracol",
    alien: "zorp",
    fala: "Sobe e torce, sobe e torce. É a mesma volta fazendo dois trabalhos.",
    enunciado:
      "Empilhe doze caixas de 30 mm de largura, 6 mm de altura e 30 mm de profundidade. A cada volta, gire 15 graus em pé (Y) e suba 6 mm.",
    dicas: ["Três blocos dentro do repetir: girar, criar e subir."],
    metas: [
      { tipo: "pecas", alvo: 12 },
      { tipo: "altura", alvo: 72 },
      { tipo: "largura", alvo: 42.4, limite: 6 },
    ],
    gabarito: programa(repetir(12, fila(girar("y", 15), caixa(30, 6, 30), mover(0, 6, 0)))),
  },

  {
    id: "l1-11",
    nome: "O anel",
    alien: "krux",
    fala: "Para fazer buraco, primeiro se faz uma peça. Depois se diz que ela é buraco.",
    enunciado:
      "Faça um disco de 40 mm de diâmetro e 12 mm de altura com um furo de 16 mm bem no meio, passando de lado a lado. Combine tudo numa peça só.",
    dicas: [
      "Crie o disco, desça 4 mm e crie o cilindro do furo mais alto que o disco.",
      'Marque a última peça como negativa e depois use "combinar".',
    ],
    metas: [
      { tipo: "pecas", alvo: 1 },
      { tipo: "largura", alvo: 40 },
      { tipo: "altura", alvo: 12 },
      { tipo: "volume", alvo: 12.6, limite: 2.5 },
    ],
    gabarito: programa(
      fila(cilindro(40, 12), mover(0, -4, 0), cilindro(16, 20), negativa(), combinar()),
    ),
  },

  {
    id: "l1-12",
    nome: "A porca sextavada",
    alien: "krux",
    fala: "Seis lados. Na oficina de verdade, é o que a chave de boca agarra.",
    enunciado:
      "Faça um prisma de 6 lados com 30 mm de largura e 12 mm de altura, com um furo de 14 mm passando pelo meio. Combine numa peça só.",
    dicas: [
      "Mesmo caminho do anel: peça, desce, furo, negativa, combinar.",
      "Num sextavado, a largura que você digita é de ponta a ponta: de lado a lado dá menos.",
    ],
    metas: [
      { tipo: "pecas", alvo: 1 },
      { tipo: "altura", alvo: 12 },
      { tipo: "largura", alvo: 26, rotulo: "Largura de lado a lado (X)", limite: 4 },
      { tipo: "profundidade", alvo: 30, rotulo: "Largura de ponta a ponta (Z)", limite: 4 },
      { tipo: "volume", alvo: 5.2, limite: 2 },
    ],
    gabarito: programa(
      fila(
        { type: "bura_prisma", inputs: { N: n(6), L: n(30), A: n(12) } },
        mover(0, -4, 0),
        cilindro(14, 20),
        negativa(),
        combinar(),
      ),
    ),
  },

  {
    id: "l1-13",
    nome: "A letra L",
    alien: "nibla",
    fala: 'O bloco "ir para" não anda: ele teleporta. Às vezes é o que você quer.',
    enunciado:
      "Monte um L deitado: uma base de 60 mm × 15 mm × 20 mm e, em pé na ponta esquerda dela, uma perna de 15 mm × 60 mm × 20 mm. Combine as duas.",
    dicas: [
      "A ponta esquerda da base fica em x = -30, então o centro da perna fica em x = -22,5.",
      "A perna começa em cima da base: y = 15.",
    ],
    metas: [
      { tipo: "pecas", alvo: 1 },
      { tipo: "largura", alvo: 60 },
      { tipo: "altura", alvo: 75 },
      { tipo: "profundidade", alvo: 20 },
    ],
    gabarito: programa(
      fila(caixa(60, 15, 20), irPara(-22.5, 15, 0), caixa(15, 60, 20), combinar()),
    ),
  },

  {
    id: "l1-14",
    nome: "Roda dentada",
    alien: "pip",
    fala: "Engrenagem de doze dentes é a que mais aparece nos projetos daqui.",
    enunciado:
      "Monte uma engrenagem de 12 dentes, 40 mm de diâmetro e 8 mm de altura, e depois um eixo: um cilindro de 8 mm de diâmetro e 30 mm de altura no centro dela.",
    dicas: [
      "A engrenagem já vem com furo no meio.",
      "O eixo é só um cilindro criado no mesmo lugar, sem mover o ponteiro.",
      "Os 40 mm de diâmetro já contam com os dentes.",
    ],
    metas: [
      { tipo: "pecas", alvo: 2 },
      { tipo: "altura", alvo: 30 },
      { tipo: "largura", alvo: 40, limite: 6 },
    ],
    gabarito: programa(
      fila({ type: "bura_engrenagem", inputs: { N: n(12), D: n(40), A: n(8) } }, cilindro(8, 30)),
    ),
  },

  {
    id: "l1-15",
    nome: "Cubos que crescem",
    alien: "nibla",
    fala: "Uma variável é uma caixinha com nome. Você guarda um número e pega depois.",
    enunciado:
      'Crie a variável "tamanho" e faça cinco cubos: 10, 20, 30, 40 e 50 mm. Entre um e outro, ande 60 mm no X.',
    dicas: [
      'Comece com "tamanho" valendo 0.',
      'Dentro do repetir: some 10 em "tamanho", crie o cubo desse tamanho e ande.',
    ],
    metas: [
      { tipo: "pecas", alvo: 5 },
      { tipo: "altura", alvo: 50 },
      { tipo: "volume", alvo: 225, limite: 30 },
    ],
    gabarito: programa(
      fila(
        { type: "variables_set", fields: { VAR: { id: "vtamanho" } }, inputs: { VALUE: n(0) } },
        repetir(
          5,
          fila(
            { type: "math_change", fields: { VAR: { id: "vtamanho" } }, inputs: { DELTA: n(10) } },
            { type: "bura_cubo", inputs: { LADO: pegar("vtamanho") } },
            mover(60, 0, 0),
          ),
        ),
      ),
      [],
      [{ name: "tamanho", id: "vtamanho" }],
    ),
  },

  {
    id: "l1-16",
    nome: "Escada de cilindros",
    alien: "pip",
    fala: 'O bloco "contar com i" já traz a caixinha pronta e vai enchendo ela sozinho.',
    enunciado:
      'Use o bloco "contar com i" de 1 até 6. A cada volta, faça um cilindro de altura 10 mm e diâmetro igual a i × 8, andando 40 mm no X entre um e outro.',
    dicas: ["O primeiro cilindro tem 8 mm de diâmetro; o último, 48 mm."],
    metas: [
      { tipo: "pecas", alvo: 6 },
      { tipo: "altura", alvo: 10 },
      { tipo: "volume", alvo: 45.6, limite: 8 },
    ],
    gabarito: programa(
      {
        type: "controls_for",
        fields: { VAR: { id: "vi" } },
        inputs: {
          FROM: n(1),
          TO: n(6),
          BY: n(1),
          DO: {
            block: fila(
              {
                type: "bura_cilindro",
                inputs: { D: conta(pegar("vi"), "*", n(8)), A: n(10) },
              },
              mover(40, 0, 0),
            ),
          },
        },
      },
      [],
      [{ name: "i", id: "vi" }],
    ),
  },

  {
    id: "l1-17",
    nome: "Par e ímpar",
    alien: "krux",
    fala: "O computador não sabe o que é par. Ele sabe dividir e olhar o resto.",
    enunciado:
      'Use "contar com i" de 1 até 8. Quando i for par, faça um cubo de 20 mm; quando for ímpar, um cilindro de 20 mm de diâmetro e 20 mm de altura. Ande 30 mm no X a cada volta.',
    dicas: [
      'Use a conta "resto de" para saber se i dividido por 2 sobra zero.',
      "Compare esse resto com 0 usando o bloco de comparação.",
    ],
    metas: [
      { tipo: "pecas", alvo: 8 },
      { tipo: "altura", alvo: 20 },
      { tipo: "largura", alvo: 230 },
    ],
    gabarito: programa(
      {
        type: "controls_for",
        fields: { VAR: { id: "vi" } },
        inputs: {
          FROM: n(1),
          TO: n(8),
          BY: n(1),
          DO: {
            block: fila(
              {
                type: "controls_if",
                extraState: { hasElse: true },
                inputs: {
                  IF0: {
                    block: {
                      type: "bura_comparar",
                      fields: { OP: "=" },
                      inputs: { A: conta(pegar("vi"), "%", n(2)), B: n(0) },
                    },
                  },
                  DO0: { block: cubo(20) },
                  ELSE: { block: cilindro(20, 20) },
                },
              },
              mover(30, 0, 0),
            ),
          },
        },
      },
      [],
      [{ name: "i", id: "vi" }],
    ),
  },

  {
    id: "l1-18",
    nome: "Meu bloco: a mesa",
    alien: "nibla",
    fala: "Quando um trecho se repete igualzinho, ele merece um nome. Vira um bloco seu.",
    enunciado:
      'Crie um bloco chamado "perna" que monta um cilindro de 12 mm de diâmetro e 40 mm de altura. Use-o nos quatro cantos de um quadrado de 60 mm (x e z valendo -30 e 30) e depois ponha o tampo: uma caixa de 80 mm × 8 mm × 80 mm apoiada em cima das pernas.',
    dicas: [
      'A gaveta "Meus blocos" tem o botão de criar.',
      "O bloco da perna não precisa mover nada: quem escolhe o lugar é quem chama.",
      "O tampo fica em y = 40.",
    ],
    metas: [
      { tipo: "pecas", alvo: 5 },
      { tipo: "largura", alvo: 80 },
      { tipo: "altura", alvo: 48 },
      { tipo: "profundidade", alvo: 80 },
    ],
    gabarito: programa(
      fila(
        irPara(-30, 0, -30),
        { type: "procedures_callnoreturn", extraState: { name: "perna", params: [] } },
        irPara(30, 0, -30),
        { type: "procedures_callnoreturn", extraState: { name: "perna", params: [] } },
        irPara(30, 0, 30),
        { type: "procedures_callnoreturn", extraState: { name: "perna", params: [] } },
        irPara(-30, 0, 30),
        { type: "procedures_callnoreturn", extraState: { name: "perna", params: [] } },
        irPara(0, 40, 0),
        caixa(80, 8, 80),
      ),
      [
        {
          type: "procedures_defnoreturn",
          x: 420,
          y: 40,
          fields: { NAME: "perna" },
          extraState: { params: [] },
          inputs: { STACK: { block: cilindro(12, 40) } },
        },
      ],
    ),
  },

  {
    id: "l1-19",
    nome: "Suporte de celular",
    alien: "pip",
    fala: "Agora é objeto de verdade: se der certo, imprime e usa na mesa.",
    enunciado:
      "Monte a base: uma caixa de 80 mm × 8 mm × 60 mm. Depois, no fundo dela, um encosto de 80 mm × 70 mm × 8 mm inclinado 20 graus para trás (aponte o eixo para frente, o X, em -20 graus).",
    dicas: [
      'Use "ir para" x 0, y 8, z -26 antes do encosto.',
      'O bloco "apontar" troca o giro inteiro, sem somar com o de antes.',
    ],
    metas: [
      { tipo: "pecas", alvo: 2 },
      { tipo: "largura", alvo: 80 },
      { tipo: "altura", alvo: 76.5, folga: 1.5, limite: 10 },
    ],
    gabarito: programa(
      fila(caixa(80, 8, 60), irPara(0, 8, -26), apontar("x", -20), caixa(80, 70, 8)),
    ),
  },

  {
    id: "l1-20",
    nome: "O carimbo da oficina",
    alien: "zorp",
    fala: "Último do lote. Junta tudo: forma, posição e combinar numa peça só.",
    enunciado:
      "Monte uma base de 60 mm × 10 mm × 60 mm e, em cima dela, uma estrela de 5 pontas com 40 mm de largura e 8 mm de altura. Combine as duas numa peça só.",
    dicas: ["A estrela fica em y = 10, que é a altura da base.", "Combinar deixa tudo com uma peça só."],
    metas: [
      { tipo: "pecas", alvo: 1 },
      { tipo: "largura", alvo: 60 },
      { tipo: "altura", alvo: 18 },
      { tipo: "profundidade", alvo: 60 },
    ],
    gabarito: programa(
      fila(
        caixa(60, 10, 60),
        mover(0, 10, 0),
        { type: "bura_estrela", inputs: { N: n(5), L: n(40), A: n(8) } },
        combinar(),
      ),
    ),
  },
];

export const LOTE = {
  numero: 1,
  nome: "Lote 1 — Primeiros comandos",
  descricao: "Vinte missões, do primeiro cubo até um projeto que usa tudo junto.",
  desafios: DESAFIOS,
};
