// Segundo lote de desafios: agora o enunciado não dá as medidas.
//
// A missão mostra a peça pronta em 3D — o aluno gira, olha e decide sozinho
// quantas peças usar, de que forma e de que tamanho. O que se confere é o
// número de peças (isso é a lógica, e é exato) e as medidas gerais, com folga
// larga: proporção parecida vale estrela.

import {
  n,
  fila,
  programa,
  cubo,
  caixa,
  cilindro,
  esfera,
  cone,
  prisma,
  anel,
  mover,
  irPara,
  girar,
  pivoGirar,
  avancar,
  virarComoPivo,
  centro,
  repetir,
  contador,
  conta,
  pegar,
  paraCada,
  se,
  comparar,
  negativa,
  combinar,
  definirBloco,
  chamarBloco,
} from "./receita.js";

// Medida com folga larga: o que importa é a proporção, não o milímetro.
const perto = (tipo, alvo, quanto = 0.3) => ({
  tipo,
  alvo,
  folga: Math.max(4, Math.abs(alvo) * quanto * 0.45),
  limite: Math.max(14, Math.abs(alvo) * quanto),
});
const exato = (tipo, alvo) => ({ tipo, alvo });

export const DESAFIOS = [
  {
    id: "l2-01",
    nome: "A escadinha",
    alien: "pip",
    fala: "Daqui para frente eu não digo mais os números. Olhe a peça e descubra.",
    enunciado:
      "Uma escada de degraus iguais. Cada degrau anda para o lado e sobe sempre o mesmo tanto. Conte quantos são na peça pronta.",
    dicas: ["Gire a peça pronta para contar os degraus.", "Um repetir dá conta: criar o degrau e andar."],
    metas: [exato("pecas", 6), perto("altura", 48), perto("largura", 108), perto("profundidade", 18)],
    gabarito: programa(repetir(6, fila(caixa(18, 8, 18), mover(18, 8, 0)))),
  },

  {
    id: "l2-02",
    nome: "A torre torcida",
    alien: "zorp",
    fala: "Cada andar um tiquinho mais torto que o de baixo. No fim dá meia volta.",
    enunciado:
      "Uma pilha de tábuas iguais. Cada uma sobe a própria altura e gira um pouco mais que a de baixo, até a torre completar meia volta.",
    dicas: [
      "Conte os andares na peça pronta e divida a meia volta por esse número.",
      "Girar, criar, subir — nessa ordem.",
    ],
    metas: [exato("pecas", 10), perto("altura", 60), perto("largura", 42)],
    gabarito: programa(repetir(10, fila(girar("y", 18), caixa(30, 6, 30), mover(0, 6, 0)))),
  },

  {
    id: "l2-03",
    nome: "O totem",
    alien: "nibla",
    fala: "Repare bem: não é tudo igual. Um sim, um não.",
    enunciado:
      "Uma pilha que alterna duas formas diferentes, todas do mesmo tamanho e encostadas uma na outra. Veja na peça pronta quais são as formas e quantas.",
    dicas: [
      "O bloco de contar dá o número da volta.",
      'Para saber se o número é par, use a conta "resto de" dividido por 2.',
    ],
    metas: [exato("pecas", 6), perto("altura", 120), perto("largura", 20)],
    gabarito: programa(
      paraCada(
        "vi",
        n(1),
        n(6),
        n(1),
        fila(
          se(comparar(conta(pegar("vi"), "%", n(2)), "=", n(0)), cubo(20), esfera(20)),
          mover(0, 20, 0),
        ),
      ),
      [],
      [{ name: "i", id: "vi" }],
    ),
  },

  {
    id: "l2-04",
    nome: "A ponte",
    alien: "krux",
    fala: "Duas pernas e um tampo. Simples de olhar, chato de acertar a altura.",
    enunciado:
      "Dois pilares iguais, afastados um do outro, e um tabuleiro apoiado em cima dos dois.",
    dicas: ["O tabuleiro tem que ser mais comprido que a distância entre os pilares.", "Ele fica na altura dos pilares."],
    metas: [exato("pecas", 3), perto("altura", 48), perto("largura", 100), perto("profundidade", 30)],
    gabarito: programa(
      fila(
        irPara(-35, 0, 0),
        caixa(16, 40, 24),
        irPara(35, 0, 0),
        caixa(16, 40, 24),
        irPara(0, 40, 0),
        caixa(100, 8, 30),
      ),
    ),
  },

  {
    id: "l2-05",
    nome: "A roda de peças",
    alien: "zorp",
    fala: "Sem seno nem cosseno: gire o pivô e mande avançar. O resto é a máquina que faz.",
    enunciado:
      "Um disco no meio e blocos iguais em volta dele, todos à mesma distância do centro e virados para fora. Conte os blocos na peça pronta.",
    dicas: [
      "Gire o pivô um pouco a cada volta e mande avançar: é o caminho até a borda.",
      'Antes de avançar, volte o ponteiro ao centro — o pivô não se desfaz com isso.',
      'Para o bloco virar junto, use "deitar a peça no rumo do pivô".',
    ],
    metas: [exato("pecas", 13), perto("largura", 78), perto("altura", 10)],
    gabarito: programa(
      fila(
        cilindro(50, 10),
        repetir(
          12,
          fila(pivoGirar("y", 30), centro(), avancar(34), virarComoPivo(), cubo(10)),
        ),
      ),
    ),
  },

  {
    id: "l2-06",
    nome: "O sol",
    alien: "pip",
    fala: "Raios saindo do meio. Todos do mesmo tamanho, todos igualmente espalhados.",
    enunciado:
      "Um disco baixo no centro e raios compridos saindo dele, espalhados por igual em volta. Conte os raios.",
    dicas: [
      "A volta inteira dividida pelo número de raios dá o ângulo de cada um.",
      "Cada raio nasce afastado do centro, deitado no rumo do pivô.",
    ],
    metas: [exato("pecas", 9), perto("largura", 124), perto("altura", 8)],
    gabarito: programa(
      fila(
        cilindro(50, 8),
        repetir(
          8,
          fila(pivoGirar("y", 45), centro(), avancar(42), virarComoPivo(), caixa(40, 6, 8)),
        ),
      ),
    ),
  },

  {
    id: "l2-07",
    nome: "A escada caracol",
    alien: "krux",
    fala: "Sobe girando em volta de um poste. Cada degrau um pouco mais alto e um pouco mais virado.",
    enunciado:
      "Um poste em pé no centro e degraus em volta dele, subindo em caracol até dar a volta completa. Conte os degraus.",
    dicas: [
      "A altura de cada degrau sai do número da repetição.",
      "O ponteiro volta ao centro, sobe, e só então avança na direção do pivô.",
    ],
    metas: [exato("pecas", 13), perto("altura", 84), perto("largura", 86)],
    gabarito: programa(
      fila(
        cilindro(14, 84),
        repetir(
          12,
          fila(
            pivoGirar("y", 30),
            centro(),
            { type: "bura_mover", inputs: { X: n(0), Y: conta(contador(), "*", n(6)), Z: n(0) } },
            avancar(28),
            virarComoPivo(),
            caixa(30, 5, 14),
          ),
        ),
      ),
    ),
  },

  {
    id: "l2-08",
    nome: "O pente",
    alien: "nibla",
    fala: "Dentes iguais, espaços iguais. Se um sair torto, todos saem.",
    enunciado:
      "Uma base comprida e deitada, com dentes iguais em pé, encaixados em cima dela e igualmente espaçados. Conte os dentes.",
    dicas: ["Os dentes nascem sobre a base, então comece pela altura dela.", "A conta do espaçamento sai do número da repetição."],
    metas: [exato("pecas", 8), perto("largura", 96), perto("altura", 38)],
    gabarito: programa(
      fila(
        caixa(96, 8, 20),
        repetir(
          7,
          fila(
            {
              type: "bura_ir_para",
              inputs: { X: conta(conta(contador(), "*", n(14)), "-", n(56)), Y: n(8), Z: n(0) },
            },
            caixa(6, 30, 20),
          ),
        ),
      ),
    ),
  },

  {
    id: "l2-09",
    nome: "A pirâmide",
    alien: "zorp",
    fala: "Cada andar menor que o de baixo. O de cima é bem pequeno.",
    enunciado:
      "Andares quadrados empilhados. Cada um é bem menor que o de baixo, e todos têm a mesma espessura. Conte os andares.",
    dicas: ["O tamanho do andar sai de uma conta com o número da repetição.", "Some a altura do andar antes do próximo."],
    metas: [exato("pecas", 5), perto("altura", 50), perto("largura", 70), perto("profundidade", 70)],
    gabarito: programa(
      repetir(
        5,
        fila(
          {
            type: "bura_cuboide",
            inputs: {
              L: conta(n(84), "-", conta(contador(), "*", n(14))),
              A: n(10),
              P: conta(n(84), "-", conta(contador(), "*", n(14))),
            },
          },
          mover(0, 10, 0),
        ),
      ),
    ),
  },

  {
    id: "l2-10",
    nome: "O alvo",
    alien: "pip",
    fala: "Argolas uma dentro da outra, sem encostar.",
    enunciado:
      "Argolas de tamanhos diferentes, uma dentro da outra, todas no mesmo plano e sem encostar. Conte as argolas.",
    dicas: ["A peça de argola já tem furo: escolha o diâmetro de fora e o do furo.", "O furo de uma tem que ser maior que a de dentro."],
    metas: [exato("pecas", 3), perto("largura", 90), perto("altura", 8)],
    gabarito: programa(fila(anel(90, 8, 74), anel(64, 8, 48), anel(38, 8, 22))),
  },

  {
    id: "l2-11",
    nome: "A porca grande",
    alien: "krux",
    fala: "Uma peça só no fim. O furo tem que atravessar de lado a lado.",
    enunciado:
      "Uma porca sextavada com um furo redondo bem no meio, atravessando de lado a lado. Tem que sair uma peça só, com o furo vazado de verdade.",
    dicas: ["O cilindro do furo precisa ser mais alto que a porca.", "Marque o furo como negativo antes de combinar."],
    metas: [exato("pecas", 1), perto("altura", 14), perto("largura", 35), { tipo: "volume", alvo: 11, folga: 2, limite: 7 }],
    gabarito: programa(
      fila(prisma(6, 40, 14), mover(0, -5, 0), cilindro(18, 26), negativa(), combinar()),
    ),
  },

  {
    id: "l2-12",
    nome: "O queijo",
    alien: "nibla",
    fala: "Os furos não encostam um no outro. Pense antes de mandar.",
    enunciado:
      "Um bloco com furos redondos atravessando de cima a baixo, espalhados por igual em volta do centro. No fim tem que ser uma peça só. Conte os furos.",
    dicas: [
      "Cada furo é um cilindro marcado como negativo.",
      "Use o pivô para espalhar os furos em volta do centro, sem fazer conta.",
    ],
    metas: [exato("pecas", 1), perto("largura", 60), perto("altura", 20), { tipo: "volume", alvo: 60, folga: 6, limite: 22 }],
    gabarito: programa(
      fila(
        caixa(60, 20, 60),
        repetir(
          4,
          fila(
            pivoGirar("y", 90),
            centro(),
            mover(0, -5, 0),
            avancar(18),
            cilindro(14, 32),
            negativa(),
          ),
        ),
        combinar(),
      ),
    ),
  },

  {
    id: "l2-13",
    nome: "O pinheiro",
    alien: "zorp",
    fala: "As saias vão diminuindo de baixo para cima.",
    enunciado:
      "Um tronco e, em cima dele, saias cônicas empilhadas, cada uma menor que a de baixo. Conte as saias.",
    dicas: ["O diâmetro de cada cone sai de uma conta com o número da repetição.", "Cada cone começa onde o de baixo termina."],
    metas: [exato("pecas", 5), perto("altura", 112), perto("largura", 70)],
    gabarito: programa(
      fila(
        cilindro(14, 20),
        mover(0, 20, 0),
        repetir(
          4,
          fila(
            {
              type: "bura_cone",
              inputs: { D: conta(n(84), "-", conta(contador(), "*", n(14))), A: n(26) },
            },
            mover(0, 22, 0),
          ),
        ),
      ),
    ),
  },

  {
    id: "l2-14",
    nome: "A ponte de degraus",
    alien: "pip",
    fala: "Sobe até o meio e desce do outro lado. O programa é um só.",
    enunciado:
      "Degraus iguais que sobem até o meio e descem do outro lado, formando um arco de escada. Conte os degraus.",
    dicas: [
      "Ande sempre para o lado; o que muda é a altura.",
      "Até o meio a altura cresce, depois diminui: uma condição resolve.",
    ],
    metas: [exato("pecas", 11), perto("altura", 60), perto("largura", 176)],
    gabarito: programa(
      paraCada(
        "vi",
        n(1),
        n(11),
        n(1),
        fila(
          se(
            comparar(pegar("vi"), "<=", n(6)),
            {
              type: "bura_ir_para",
              inputs: {
                X: conta(conta(pegar("vi"), "*", n(16)), "-", n(96)),
                Y: conta(pegar("vi"), "*", n(10)),
                Z: n(0),
              },
            },
            {
              type: "bura_ir_para",
              inputs: {
                X: conta(conta(pegar("vi"), "*", n(16)), "-", n(96)),
                Y: conta(n(120), "-", conta(pegar("vi"), "*", n(10))),
                Z: n(0),
              },
            },
          ),
          caixa(16, 10, 24),
        ),
      ),
      [],
      [{ name: "i", id: "vi" }],
    ),
  },

  {
    id: "l2-15",
    nome: "O banquinho",
    alien: "krux",
    fala: "Se você escreveu a perna mais de uma vez, tem um bloco seu esperando para nascer.",
    enunciado:
      "Um assento quadrado apoiado em pernas iguais, uma em cada canto. Faça a perna virar um bloco seu e use-o em cada canto.",
    dicas: ['A gaveta "Meus blocos" tem o botão de criar.', "O bloco da perna não move nada: quem escolhe o canto é quem chama."],
    metas: [exato("pecas", 5), perto("largura", 80), perto("altura", 54), perto("profundidade", 80)],
    gabarito: programa(
      fila(
        irPara(-26, 0, -26),
        chamarBloco("perna"),
        irPara(26, 0, -26),
        chamarBloco("perna"),
        irPara(26, 0, 26),
        chamarBloco("perna"),
        irPara(-26, 0, 26),
        chamarBloco("perna"),
        irPara(0, 44, 0),
        caixa(80, 10, 80),
      ),
      [definirBloco("perna", cilindro(12, 44))],
    ),
  },

  {
    id: "l2-16",
    nome: "A flor",
    alien: "nibla",
    fala: "Pétalas em volta de um miolo. Todas do mesmo tamanho, todas na mesma distância.",
    enunciado:
      "Um miolo redondo no centro e pétalas iguais em volta, encostando nele. Conte as pétalas.",
    dicas: ["O pivô espalha as pétalas sem nenhuma conta de ângulo.", "A distância do centro é sempre a mesma."],
    metas: [exato("pecas", 7), perto("largura", 96), perto("altura", 30)],
    gabarito: programa(
      fila(
        esfera(30),
        repetir(6, fila(pivoGirar("y", 60), centro(), avancar(33), esfera(30))),
      ),
    ),
  },

  {
    id: "l2-17",
    nome: "A mola",
    alien: "zorp",
    fala: "Pecinhas subindo em espiral. É a escada caracol sem os degraus.",
    enunciado:
      "Cubinhos iguais formando uma espiral que sobe, dando duas voltas completas: cada um gira um pouco mais e fica um pouco mais alto que o anterior. Conte os cubinhos.",
    dicas: [
      "Duas voltas inteiras divididas pelo número de peças dá o giro de cada uma.",
      "A altura sai do número da repetição.",
    ],
    metas: [exato("pecas", 20), perto("altura", 65), perto("largura", 58)],
    gabarito: programa(
      repetir(
        20,
        fila(
          pivoGirar("y", 36),
          centro(),
          { type: "bura_mover", inputs: { X: n(0), Y: conta(contador(), "*", n(3)), Z: n(0) } },
          avancar(25),
          cubo(8),
        ),
      ),
    ),
  },

  {
    id: "l2-18",
    nome: "O ábaco",
    alien: "pip",
    fala: "Uma haste, e em cada haste as contas. É um laço dentro do outro.",
    enunciado:
      "Uma base deitada, hastes em pé sobre ela e bolas enfiadas em cada haste, uma acima da outra. Conte as hastes e as bolas de cada uma.",
    dicas: [
      "Um repetir para as hastes e, dentro dele, outro para as bolas.",
      "A posição da haste serve para as bolas dela também.",
    ],
    metas: [exato("pecas", 16), perto("largura", 90), perto("altura", 72)],
    gabarito: programa(
      fila(
        caixa(90, 8, 30),
        paraCada(
          "vh",
          n(1),
          n(3),
          n(1),
          fila(
            {
              type: "bura_ir_para",
              inputs: { X: conta(conta(pegar("vh"), "*", n(28)), "-", n(56)), Y: n(8), Z: n(0) },
            },
            cilindro(6, 64),
            paraCada(
              "vc",
              n(1),
              n(4),
              n(1),
              {
                type: "bura_ir_para",
                inputs: {
                  X: conta(conta(pegar("vh"), "*", n(28)), "-", n(56)),
                  Y: conta(conta(pegar("vc"), "*", n(13)), "-", n(5)),
                  Z: n(0),
                },
                next: { block: esfera(14) },
              },
            ),
          ),
        ),
      ),
      [],
      [
        { name: "haste", id: "vh" },
        { name: "conta", id: "vc" },
      ],
    ),
  },

  {
    id: "l2-19",
    nome: "A estante",
    alien: "krux",
    fala: "Duas laterais e as prateleiras entre elas, todas iguais e igualmente separadas.",
    enunciado:
      "Duas laterais em pé e prateleiras entre elas, igualmente espaçadas de baixo para cima. Conte as prateleiras.",
    dicas: ["As laterais são duas peças fixas; as prateleiras vêm de um repetir.", "A altura de cada prateleira sai do número da volta."],
    metas: [exato("pecas", 6), perto("largura", 88), perto("altura", 100), perto("profundidade", 30)],
    gabarito: programa(
      fila(
        irPara(-40, 0, 0),
        caixa(8, 100, 30),
        irPara(40, 0, 0),
        caixa(8, 100, 30),
        repetir(
          4,
          fila(
            {
              type: "bura_ir_para",
              inputs: { X: n(0), Y: conta(conta(contador(), "*", n(24)), "-", n(18)), Z: n(0) },
            },
            caixa(72, 6, 30),
          ),
        ),
      ),
    ),
  },

  {
    id: "l2-20",
    nome: "A engrenagem de verdade",
    alien: "zorp",
    fala: "Último do lote. Dentes em volta, furo no meio, e tudo vira uma peça só.",
    enunciado:
      "Uma engrenagem feita do zero: um disco no meio, dentes iguais em volta e um furo redondo no centro atravessando. No fim, uma peça só. Conte os dentes.",
    dicas: [
      "Os dentes são blocos espalhados com o pivô, virados para fora.",
      "O furo é um cilindro negativo criado por último, antes de combinar.",
    ],
    metas: [exato("pecas", 1), perto("largura", 78), perto("altura", 12), { tipo: "volume", alvo: 44, folga: 6, limite: 20 }],
    gabarito: programa(
      fila(
        cilindro(60, 12),
        repetir(
          12,
          fila(pivoGirar("y", 30), centro(), avancar(32), virarComoPivo(), caixa(14, 12, 10)),
        ),
        centro(),
        mover(0, -4, 0),
        cilindro(16, 22),
        negativa(),
        combinar(),
      ),
    ),
  },
];

export const LOTE = {
  numero: 2,
  nome: "Lote 2 — Olhe e descubra",
  descricao:
    "Vinte missões sem medida dada. A peça pronta aparece na tela: conte, compare e descubra o programa.",
  mostrarGabarito: true,
  desafios: DESAFIOS,
};
