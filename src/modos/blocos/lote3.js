// Terceiro lote: peças que encaixam umas nas outras e lógica mais funda.
//
// Aqui o aluno já sabe montar. O que se cobra é planejar: laço dentro de laço,
// condição que muda o rumo no meio, procedimento com parâmetro, e peça que
// termina combinada de verdade — com furo que atravessa e encaixe que serve.
// Como no lote 2, o enunciado não dá medida e a peça pronta aparece em 3D.

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
  engrenagem,
  mover,
  irPara,
  girar,
  apontar,
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
  travar,
  definirBloco,
  chamarBloco,
} from "./receita.js";

const perto = (tipo, alvo, quanto = 0.3) => ({
  tipo,
  alvo,
  folga: Math.max(4, Math.abs(alvo) * quanto * 0.45),
  limite: Math.max(14, Math.abs(alvo) * quanto),
});
const exato = (tipo, alvo) => ({ tipo, alvo });
const volume = (alvo, folga = 6, limite = 25) => ({ tipo: "volume", alvo, folga, limite });

export const DESAFIOS = [
  {
    id: "l3-01",
    nome: "O tijolo de encaixe",
    alien: "krux",
    fala: "Pino em cima, furo embaixo. Se o furo for do tamanho do pino, um tijolo senta no outro.",
    enunciado:
      "Um tijolo com um pino redondo em cima e um furo do mesmo tamanho embaixo, atravessando parte da peça. Tudo numa peça só.",
    dicas: [
      "O pino nasce em cima do tijolo; o furo é um cilindro negativo criado por baixo.",
      "O furo precisa ser um tiquinho maior que o pino para o encaixe entrar.",
    ],
    metas: [exato("pecas", 1), perto("largura", 40), perto("altura", 22), perto("profundidade", 24), volume(15.3, 2, 8)],
    gabarito: programa(
      fila(
        caixa(40, 16, 24),
        mover(0, 16, 0),
        cilindro(10, 6),
        irPara(0, -1, 0),
        cilindro(11, 7),
        negativa(),
        combinar(),
      ),
    ),
  },

  {
    id: "l3-02",
    nome: "A torre de tijolos",
    alien: "krux",
    fala: "O tijolo virou um bloco seu. Agora é só mandar quatro vezes, um em cima do outro.",
    enunciado:
      "Uma torre de tijolos iguais, um encaixado no outro. Cada tijolo é um corpo e um pino em cima. Faça o tijolo virar um bloco seu.",
    dicas: [
      'A gaveta "Meus blocos" cria o bloco do tijolo.',
      "Quem chama é quem escolhe a altura: o bloco do tijolo não precisa mover nada.",
    ],
    metas: [exato("pecas", 8), perto("largura", 40), perto("altura", 70), perto("profundidade", 24)],
    gabarito: programa(
      repetir(
        4,
        fila(chamarBloco("tijolo"), mover(0, 16, 0)),
      ),
      [definirBloco("tijolo", fila(caixa(40, 16, 24), mover(0, 16, 0), cilindro(10, 6), mover(0, -16, 0)))],
    ),
  },

  {
    id: "l3-03",
    nome: "A placa perfurada",
    alien: "nibla",
    fala: "Nove furos numa placa só. Um laço dentro do outro resolve, e o combinar fecha.",
    enunciado:
      "Uma placa quadrada com furos redondos em grade, todos do mesmo tamanho e igualmente espaçados, atravessando de cima a baixo. Uma peça só no fim.",
    dicas: [
      "Um repetir para as linhas e, dentro dele, outro para as colunas.",
      "Cada furo é um cilindro negativo; combine tudo só no fim.",
    ],
    metas: [exato("pecas", 1), perto("largura", 90), perto("altura", 10), volume(63, 6, 22)],
    gabarito: programa(
      fila(
        caixa(90, 10, 90),
        paraCada(
          "vl",
          n(1),
          n(3),
          n(1),
          paraCada(
            "vc",
            n(1),
            n(3),
            n(1),
            fila(
              {
                type: "bura_ir_para",
                inputs: {
                  X: conta(conta(pegar("vc"), "*", n(28)), "-", n(56)),
                  Y: n(-2),
                  Z: conta(conta(pegar("vl"), "*", n(28)), "-", n(56)),
                },
              },
              cilindro(16, 14),
              negativa(),
            ),
          ),
        ),
        combinar(),
      ),
      [],
      [
        { name: "linha", id: "vl" },
        { name: "coluna", id: "vc" },
      ],
    ),
  },

  {
    id: "l3-04",
    nome: "O favo",
    alien: "zorp",
    fala: "As fileiras do meio andam meio passo para o lado. É o que faz o favo fechar.",
    enunciado:
      "Prismas de seis lados lado a lado, em três fileiras. As fileiras não ficam alinhadas: uma delas anda meio passo para o lado.",
    dicas: [
      "Um laço para as fileiras, outro para as peças de cada fileira.",
      "Use uma condição para dar o meio passo só na fileira do meio.",
    ],
    metas: [exato("pecas", 12), perto("largura", 113), perto("profundidade", 78), perto("altura", 12)],
    gabarito: programa(
      paraCada(
        "vf",
        n(1),
        n(3),
        n(1),
        paraCada(
          "vp",
          n(1),
          n(4),
          n(1),
          fila(
            se(
              comparar(pegar("vf"), "=", n(2)),
              {
                type: "bura_ir_para",
                inputs: {
                  X: conta(conta(pegar("vp"), "*", n(26)), "-", n(52)),
                  Y: n(0),
                  Z: conta(conta(pegar("vf"), "*", n(26)), "-", n(52)),
                },
              },
              {
                type: "bura_ir_para",
                inputs: {
                  X: conta(conta(pegar("vp"), "*", n(26)), "-", n(65)),
                  Y: n(0),
                  Z: conta(conta(pegar("vf"), "*", n(26)), "-", n(52)),
                },
              },
            ),
            prisma(6, 26, 12),
          ),
        ),
      ),
      [],
      [
        { name: "fileira", id: "vf" },
        { name: "peca", id: "vp" },
      ],
    ),
  },

  {
    id: "l3-05",
    nome: "A escada em U",
    alien: "pip",
    fala: "Sobe de um lado, vira no patamar e sobe do outro. Tudo num programa só.",
    enunciado:
      "Uma escada que sobe de um lado, chega no alto e volta subindo do outro lado, como um U visto de cima. Todos os degraus iguais.",
    dicas: [
      "Na primeira metade o degrau anda para um lado; na segunda, para o outro.",
      "A altura cresce sempre, das duas vezes.",
    ],
    metas: [exato("pecas", 12), perto("altura", 96), perto("largura", 120), perto("profundidade", 80)],
    gabarito: programa(
      paraCada(
        "vi",
        n(1),
        n(12),
        n(1),
        fila(
          se(
            comparar(pegar("vi"), "<=", n(6)),
            {
              type: "bura_ir_para",
              inputs: {
                X: conta(conta(pegar("vi"), "*", n(20)), "-", n(70)),
                Y: conta(pegar("vi"), "*", n(8)),
                Z: n(-20),
              },
            },
            {
              type: "bura_ir_para",
              inputs: {
                X: conta(n(190), "-", conta(pegar("vi"), "*", n(20))),
                Y: conta(pegar("vi"), "*", n(8)),
                Z: n(20),
              },
            },
          ),
          caixa(20, 8, 40),
        ),
      ),
      [],
      [{ name: "i", id: "vi" }],
    ),
  },

  {
    id: "l3-06",
    nome: "O parafuso",
    alien: "krux",
    fala: "A rosca é só uma espiral de pecinhas em volta da haste. Devagar ela sobe.",
    enunciado:
      "Uma haste em pé e uma rosca em espiral em volta dela: pecinhas iguais que giram e sobem um pouco a cada passo, dando várias voltas.",
    dicas: [
      "O pivô gira, o ponteiro sobe e o avançar leva a peça até a borda da haste.",
      "Deite cada pecinha no rumo do pivô para a rosca ficar contínua.",
    ],
    metas: [exato("pecas", 25), perto("altura", 80), perto("largura", 36)],
    gabarito: programa(
      fila(
        cilindro(24, 80),
        repetir(
          24,
          fila(
            pivoGirar("y", 45),
            centro(),
            { type: "bura_mover", inputs: { X: n(0), Y: conta(contador(), "*", n(3)), Z: n(0) } },
            avancar(13),
            virarComoPivo(),
            caixa(10, 4, 6),
          ),
        ),
      ),
    ),
  },

  {
    id: "l3-07",
    nome: "A hélice",
    alien: "zorp",
    fala: "As pás não ficam deitadas: são inclinadas, senão não empurram ar nenhum.",
    enunciado:
      "Um cubo central e pás iguais saindo dele, espalhadas por igual em volta e todas inclinadas no mesmo ângulo.",
    dicas: [
      "Primeiro incline a peça com o bloco de apontar, depois gire o pivô e avance.",
      'O "deitar a peça no rumo do pivô" apaga a inclinação: use na ordem certa.',
    ],
    metas: [exato("pecas", 4), perto("largura", 95), perto("altura", 25)],
    gabarito: programa(
      fila(
        cilindro(24, 14),
        repetir(
          3,
          fila(
            pivoGirar("y", 120),
            centro(),
            avancar(32),
            virarComoPivo(),
            girar("x", 25),
            caixa(44, 6, 18),
          ),
        ),
      ),
    ),
  },

  {
    id: "l3-08",
    nome: "A treliça",
    alien: "pip",
    fala: "As diagonais trocam de lado a cada vão. É isso que segura a ponte.",
    enunciado:
      "Duas barras compridas, uma em cima da outra, e barras diagonais entre elas. As diagonais se inclinam para um lado e para o outro, alternando.",
    dicas: [
      "Uma condição decide o lado da inclinação a cada volta.",
      "Use o bloco de apontar para inclinar, com o mesmo ângulo trocando de sinal.",
    ],
    metas: [exato("pecas", 10), perto("largura", 160), perto("altura", 54)],
    gabarito: programa(
      fila(
        irPara(0, 0, 0),
        caixa(160, 8, 16),
        irPara(0, 46, 0),
        caixa(160, 8, 16),
        paraCada(
          "vi",
          n(1),
          n(8),
          n(1),
          fila(
            {
              type: "bura_ir_para",
              inputs: {
                X: conta(conta(pegar("vi"), "*", n(19)), "-", n(85)),
                Y: n(8),
                Z: n(0),
              },
            },
            se(
              comparar(conta(pegar("vi"), "%", n(2)), "=", n(0)),
              apontar("z", 24),
              apontar("z", -24),
            ),
            caixa(7, 42, 14),
          ),
        ),
      ),
      [],
      [{ name: "i", id: "vi" }],
    ),
  },

  {
    id: "l3-09",
    nome: "A caixa de compartimentos",
    alien: "nibla",
    fala: "Um chão, quatro paredes e as divisórias por dentro. Conte tudo.",
    enunciado:
      "Uma caixa rasa com as quatro paredes em volta e divisórias por dentro, separando o espaço em compartimentos iguais.",
    dicas: ["As paredes são peças fixas; as divisórias vêm de um laço.", "Todas as divisórias têm a mesma altura das paredes."],
    metas: [exato("pecas", 8), perto("largura", 120), perto("altura", 24), perto("profundidade", 80)],
    gabarito: programa(
      fila(
        caixa(120, 6, 80),
        irPara(-57, 6, 0),
        caixa(6, 18, 80),
        irPara(57, 6, 0),
        caixa(6, 18, 80),
        irPara(0, 6, -37),
        caixa(120, 18, 6),
        irPara(0, 6, 37),
        caixa(120, 18, 6),
        repetir(
          3,
          fila(
            {
              type: "bura_ir_para",
              inputs: { X: conta(conta(contador(), "*", n(28)), "-", n(56)), Y: n(6), Z: n(0) },
            },
            caixa(5, 18, 74),
          ),
        ),
      ),
    ),
  },

  {
    id: "l3-10",
    nome: "O domo",
    alien: "zorp",
    fala: "Cada anel mais alto é menor que o de baixo. Dois laços e sai uma cúpula.",
    enunciado:
      "Uma cúpula feita de bolinhas: anéis de bolinhas empilhados, cada anel mais alto e mais estreito que o de baixo.",
    dicas: [
      "Um laço para os andares e, dentro, outro para as bolinhas de cada anel.",
      "O raio de cada anel sai de uma conta com o número do andar.",
    ],
    metas: [exato("pecas", 24), perto("largura", 90), perto("altura", 50)],
    gabarito: programa(
      paraCada(
        "va",
        n(1),
        n(3),
        n(1),
        paraCada(
          "vb",
          n(1),
          n(8),
          n(1),
          fila(
            pivoGirar("y", 45),
            centro(),
            {
              type: "bura_mover",
              inputs: { X: n(0), Y: conta(conta(pegar("va"), "*", n(16)), "-", n(16)), Z: n(0) },
            },
            { type: "bura_avancar", inputs: { PASSOS: conta(n(48), "-", conta(pegar("va"), "*", n(12))) } },
            esfera(18),
          ),
        ),
      ),
      [],
      [
        { name: "andar", id: "va" },
        { name: "bolinha", id: "vb" },
      ],
    ),
  },

  {
    id: "l3-11",
    nome: "A pirâmide de blocos",
    alien: "pip",
    fala: "Cada andar é um quadrado de cubos, e o de cima tem sempre um a menos de cada lado.",
    enunciado:
      "Uma pirâmide feita de cubos iguais: o andar de baixo é um quadrado cheio de cubos e cada andar acima tem uma fileira a menos em cada direção.",
    dicas: [
      "São três laços: o andar, a linha e a coluna.",
      "O número de cubos por lado sai de uma conta com o número do andar.",
    ],
    metas: [exato("pecas", 29), perto("largura", 64), perto("altura", 48)],
    gabarito: programa(
      paraCada(
        "va",
        n(1),
        n(3),
        n(1),
        paraCada(
          "vl",
          n(1),
          conta(n(5), "-", pegar("va")),
          n(1),
          paraCada(
            "vc",
            n(1),
            conta(n(5), "-", pegar("va")),
            n(1),
            fila(
              {
                type: "bura_ir_para",
                inputs: {
                  X: conta(
                    conta(pegar("vc"), "*", n(16)),
                    "-",
                    conta(conta(n(6), "-", pegar("va")), "*", n(8)),
                  ),
                  Y: conta(conta(pegar("va"), "*", n(16)), "-", n(16)),
                  Z: conta(
                    conta(pegar("vl"), "*", n(16)),
                    "-",
                    conta(conta(n(6), "-", pegar("va")), "*", n(8)),
                  ),
                },
              },
              cubo(16),
            ),
          ),
        ),
      ),
      [],
      [
        { name: "andar", id: "va" },
        { name: "linha", id: "vl" },
        { name: "coluna", id: "vc" },
      ],
    ),
  },

  {
    id: "l3-12",
    nome: "As duas engrenagens",
    alien: "krux",
    fala: "Grande embaixo, pequena em cima, no mesmo eixo. É assim que se troca a força pela volta.",
    enunciado:
      "Duas engrenagens de tamanhos diferentes no mesmo eixo, uma em cima da outra, com um eixo atravessando as duas.",
    dicas: ["As duas nascem no mesmo lugar; o que muda é a altura e o diâmetro.", "O eixo é um cilindro fino e comprido."],
    metas: [exato("pecas", 3), perto("largura", 70), perto("altura", 56)],
    gabarito: programa(
      fila(engrenagem(16, 70, 10), mover(0, 10, 0), engrenagem(8, 36, 10), centro(), cilindro(10, 56)),
    ),
  },

  {
    id: "l3-13",
    nome: "A chave sextavada",
    alien: "krux",
    fala: "Uma barra comprida, uma curta, e um L no meio. Vira uma peça só.",
    enunciado:
      "Uma chave em L feita de duas barras sextavadas: uma comprida em pé e uma curta deitada, encostadas no canto. Uma peça só no fim.",
    dicas: ["A barra deitada precisa do bloco de apontar para virar de lado.", "Combine as duas no fim."],
    metas: [exato("pecas", 1), perto("altura", 70), perto("largura", 49)],
    gabarito: programa(
      fila(
        prisma(6, 14, 70),
        irPara(20, 3.5, 0),
        apontar("z", 90),
        prisma(6, 14, 46),
        combinar(),
      ),
    ),
  },

  {
    id: "l3-14",
    nome: "A medalha",
    alien: "nibla",
    fala: "Disco, estrela em cima e um furo para passar a fita. Peça única.",
    enunciado:
      "Uma medalha: um disco com uma estrela em relevo no meio e um furo redondo perto da borda, atravessando. Tudo numa peça só.",
    dicas: ["A estrela nasce em cima do disco.", "O furo é um cilindro negativo, afastado do centro."],
    metas: [exato("pecas", 1), perto("largura", 70), perto("altura", 13), volume(33.7, 5, 18)],
    gabarito: programa(
      fila(
        cilindro(70, 8),
        mover(0, 8, 0),
        { type: "bura_estrela", inputs: { N: n(5), L: n(46), A: n(5) } },
        irPara(28, -2, 0),
        cilindro(9, 16),
        negativa(),
        combinar(),
      ),
    ),
  },

  {
    id: "l3-15",
    nome: "O pente ritmado",
    alien: "pip",
    fala: "Alto, médio, baixo, e recomeça. O resto da divisão por três dá o ritmo.",
    enunciado:
      "Uma base comprida com dentes em pé, igualmente espaçados, mas com três alturas diferentes que se repetem em ciclo.",
    dicas: [
      'A conta "resto de" dividido por 3 dá 1, 2 ou 0 — três casos.',
      "Encaixe um se dentro do senão do outro para tratar os três.",
    ],
    metas: [exato("pecas", 10), perto("largura", 126), perto("altura", 48)],
    gabarito: programa(
      fila(
        caixa(126, 8, 24),
        paraCada(
          "vi",
          n(1),
          n(9),
          n(1),
          fila(
            {
              type: "bura_ir_para",
              inputs: { X: conta(conta(pegar("vi"), "*", n(14)), "-", n(70)), Y: n(8), Z: n(0) },
            },
            se(
              comparar(conta(pegar("vi"), "%", n(3)), "=", n(1)),
              caixa(8, 40, 24),
              se(
                comparar(conta(pegar("vi"), "%", n(3)), "=", n(2)),
                caixa(8, 26, 24),
                caixa(8, 14, 24),
              ),
            ),
          ),
        ),
      ),
      [],
      [{ name: "i", id: "vi" }],
    ),
  },

  {
    id: "l3-16",
    nome: "A escada caracol dupla",
    alien: "zorp",
    fala: "Duas escadas em volta do mesmo poste, sempre uma de frente para a outra.",
    enunciado:
      "Um poste no centro e duas escadas em caracol subindo ao mesmo tempo em volta dele, sempre em lados opostos.",
    dicas: [
      "A cada volta do laço, crie dois degraus: um de um lado e outro meia volta adiante.",
      "Os dois sobem juntos, na mesma altura.",
    ],
    metas: [exato("pecas", 17), perto("altura", 88), perto("largura", 92)],
    gabarito: programa(
      fila(
        cilindro(16, 88),
        repetir(
          8,
          fila(
            pivoGirar("y", 45),
            centro(),
            { type: "bura_mover", inputs: { X: n(0), Y: conta(contador(), "*", n(10)), Z: n(0) } },
            avancar(30),
            virarComoPivo(),
            caixa(32, 6, 14),
            pivoGirar("y", 180),
            centro(),
            { type: "bura_mover", inputs: { X: n(0), Y: conta(contador(), "*", n(10)), Z: n(0) } },
            avancar(30),
            virarComoPivo(),
            caixa(32, 6, 14),
            pivoGirar("y", 180),
          ),
        ),
      ),
    ),
  },

  {
    id: "l3-17",
    nome: "O relógio",
    alien: "nibla",
    fala: "Doze marcas em volta, mas as quatro principais são maiores. Repare bem.",
    enunciado:
      "Um disco com marcas em volta, igualmente espaçadas. As marcas das quatro posições principais são maiores que as outras.",
    dicas: [
      "Doze marcas em volta inteira dão o ângulo de cada uma.",
      "Uma condição com o resto da divisão separa as marcas grandes das pequenas.",
    ],
    metas: [exato("pecas", 13), perto("largura", 100), perto("altura", 12)],
    gabarito: programa(
      fila(
        cilindro(100, 8),
        paraCada(
          "vi",
          n(1),
          n(12),
          n(1),
          fila(
            pivoGirar("y", 30),
            centro(),
            mover(0, 8, 0),
            avancar(40),
            virarComoPivo(),
            se(
              comparar(conta(pegar("vi"), "%", n(3)), "=", n(0)),
              caixa(18, 4, 8),
              caixa(9, 4, 5),
            ),
          ),
        ),
      ),
      [],
      [{ name: "i", id: "vi" }],
    ),
  },

  {
    id: "l3-18",
    nome: "A árvore",
    alien: "pip",
    fala: "O galho é sempre o mesmo desenho, só que menor. Passe o tamanho para o bloco.",
    enunciado:
      "Um tronco e galhos saindo dele em vários andares. Os galhos de cima são menores que os de baixo. Faça o galho virar um bloco seu que recebe o tamanho.",
    dicas: [
      "Ao criar o bloco, some um parâmetro: é por ele que entra o tamanho.",
      "O laço chama o mesmo bloco com tamanhos cada vez menores.",
    ],
    metas: [exato("pecas", 13), perto("altura", 100), perto("largura", 88)],
    gabarito: programa(
      fila(
        cilindro(18, 100),
        paraCada(
          "va",
          n(1),
          n(3),
          n(1),
          fila(
            chamarBloco("coroa", [
              { nome: "tamanho", valor: conta(n(56), "-", conta(pegar("va"), "*", n(12))) },
            ]),
          ),
        ),
      ),
      [
        definirBloco(
          "coroa",
          repetir(
            4,
            fila(
              pivoGirar("y", 90),
              centro(),
              { type: "bura_mover", inputs: { X: n(0), Y: conta(pegar("va"), "*", n(26)), Z: n(0) } },
              { type: "bura_avancar", inputs: { PASSOS: conta(pegar("vt"), "*", n(0.5)) } },
              virarComoPivo(),
              { type: "bura_cone", inputs: { D: pegar("vt"), A: n(16) } },
            ),
          ),
          { params: [{ name: "tamanho", id: "vt" }] },
        ),
      ],
      [
        { name: "andar", id: "va" },
        { name: "tamanho", id: "vt" },
      ],
    ),
  },

  {
    id: "l3-19",
    nome: "O tabuleiro",
    alien: "krux",
    fala: "Só as casas escuras sobem. A conta é a soma da linha com a coluna.",
    enunciado:
      "Um tabuleiro quadrado onde só as casas de uma das cores ficam em relevo, formando o padrão xadrez. As casas são todas do mesmo tamanho.",
    dicas: [
      "Dois laços dão linha e coluna.",
      "Some linha com coluna e olhe o resto da divisão por 2: é o que diz se a casa sobe.",
    ],
    metas: [exato("pecas", 19), perto("largura", 120), perto("altura", 14)],
    gabarito: programa(
      fila(
        caixa(120, 6, 120),
        paraCada(
          "vl",
          n(1),
          n(6),
          n(1),
          paraCada(
            "vc",
            n(1),
            n(6),
            n(1),
            se(
              comparar(conta(conta(pegar("vl"), "+", pegar("vc")), "%", n(2)), "=", n(0)),
              fila(
                {
                  type: "bura_ir_para",
                  inputs: {
                    X: conta(conta(pegar("vc"), "*", n(20)), "-", n(70)),
                    Y: n(6),
                    Z: conta(conta(pegar("vl"), "*", n(20)), "-", n(70)),
                  },
                },
                caixa(18, 8, 18),
              ),
            ),
          ),
        ),
      ),
      [],
      [
        { name: "linha", id: "vl" },
        { name: "coluna", id: "vc" },
      ],
    ),
  },

  {
    id: "l3-20",
    nome: "A caixa e a tampa",
    alien: "zorp",
    fala: "Duas peças combinadas no mesmo programa. O segredo é fechar a primeira antes de começar a segunda.",
    enunciado:
      "Uma caixa oca, com paredes e fundo, e uma tampa separada que entra nela. As duas ficam prontas na base, cada uma como uma peça combinada.",
    dicas: [
      "A caixa é um bloco cheio com um bloco negativo menor por dentro.",
      'Depois de combinar a caixa, use "fechar esta peça e começar outra" antes de montar a tampa.',
    ],
    metas: [exato("pecas", 2), perto("largura", 90), perto("altura", 50), volume(197, 12, 60)],
    gabarito: programa(
      fila(
        caixa(90, 40, 70),
        mover(0, 8, 0),
        caixa(74, 40, 54),
        negativa(),
        combinar(),
        travar(),
        irPara(0, 42, 0),
        caixa(90, 8, 70),
        mover(0, -6, 0),
        caixa(72, 8, 52),
        combinar(),
      ),
    ),
  },
];

export const LOTE = {
  numero: 3,
  nome: "Lote 3 — Peças que encaixam",
  descricao:
    "Vinte missões de planejamento: laço dentro de laço, condição que muda o rumo, bloco seu com parâmetro e peça que termina combinada.",
  mostrarGabarito: true,
  desafios: DESAFIOS,
};
