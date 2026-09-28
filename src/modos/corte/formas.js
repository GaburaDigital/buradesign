// As caixas prontas que não são caixas: prisma, pirâmide e dodecaedro.
//
// A caixa de quatro paredes se resolve sozinha, porque todo encontro dela é
// de 90 graus e o detector de juntas dá conta. Aqui não: as paredes de um
// hexágono se encontram a 120 graus, e as de uma pirâmide nem isso — o
// ângulo depende da altura. Dente reto não encaixa em parede torta.
//
// Então quem monta a forma é quem entrega os encaixes prontos, porque só ela
// sabe qual borda casa com qual. São dois jeitos, à escolha do aluno:
//
//   paredes soltas — cada parede é uma peça, presa no fundo (e na tampa) por
//     abas que atravessam rasgos. Serve para MDF e acrílico, que não dobram.
//
//   planificado com vinco — a lateral inteira sai numa tira só, com linhas de
//     dobra gravadas. Serve para papelão e EVA, e é o mais fácil de montar:
//     não tem canto para alinhar, a tira já vem no ângulo certo.
//
// Toda parede inclinada nasce em pé e depois **dobra em volta da aresta da
// base**. Compor giros de X, Y e Z na mão para achar o ângulo de uma face de
// pirâmide dá errado; dobrar em volta da aresta sai certo sempre, e é o
// mesmo movimento que o aluno faz no papelão.

import { novaChapa, medirForma, dobrarEmVoltaDaAresta, girarChapas } from "./chapas.js";

const GRAU = Math.PI / 180;
let contadorDeTiras = 0;

// Polígono regular de n lados, com o lado 0 virado para o +x. Assim a parede
// 0 fica de frente para quem olha a mesa.
export function poligono(lados, raio) {
  const pontos = [];
  for (let i = 0; i < lados; i += 1) {
    const angulo = ((i + 0.5) * 2 * Math.PI) / lados;
    pontos.push([raio * Math.cos(angulo), raio * Math.sin(angulo)]);
  }
  return pontos;
}

// Encosta a forma no zero, que é onde a chapa espera encontrar o contorno.
function encostarNoZero(pontos) {
  let minU = Infinity;
  let minV = Infinity;
  for (const [u, v] of pontos) {
    minU = Math.min(minU, u);
    minV = Math.min(minV, v);
  }
  const movidos = pontos.map(([u, v]) => [u - minU, v - minV]);
  return { pontos: movidos, ...medirForma(movidos), minU, minV };
}

// Quantas abas cabem numa borda e onde. O que importa é sobrar material nas
// pontas: aba colada na quina rasga o canto na hora de montar.
export function abasNaBorda(comprimento, dedo = 12, espessura = 3) {
  const margem = Math.max(espessura * 1.5, 3);
  const util = comprimento - 2 * margem;
  if (util <= dedo * 0.6) {
    const largura = Math.max(2, Math.min(dedo, comprimento * 0.4));
    const meio = comprimento / 2;
    return [{ de: meio - largura / 2, ate: meio + largura / 2, tipo: "aba" }];
  }
  const quantas = Math.max(2, Math.min(6, Math.round(util / (dedo * 2))));
  const largura = Math.min(dedo, util / (quantas * 1.6));
  const passo = util / quantas;
  const abas = [];
  for (let i = 0; i < quantas; i += 1) {
    const meio = margem + passo * (i + 0.5);
    abas.push({ de: meio - largura / 2, ate: meio + largura / 2, tipo: "aba" });
  }
  return abas;
}

// O rasgo que recebe a aba. Ele acompanha o ângulo da parede, e não os eixos
// da chapa — num hexágono nenhuma parede é paralela a nada.
function rasgoDaAba(centro, direcao, comprimento, espessura) {
  const nx = -direcao[1];
  const nz = direcao[0];
  const meioC = comprimento / 2;
  const meioE = espessura / 2;
  return [
    [centro[0] - direcao[0] * meioC - nx * meioE, centro[1] - direcao[1] * meioC - nz * meioE],
    [centro[0] + direcao[0] * meioC - nx * meioE, centro[1] + direcao[1] * meioC - nz * meioE],
    [centro[0] + direcao[0] * meioC + nx * meioE, centro[1] + direcao[1] * meioC + nz * meioE],
    [centro[0] - direcao[0] * meioC + nx * meioE, centro[1] - direcao[1] * meioC + nz * meioE],
  ];
}

// O prato de fundo (ou de tampa): o polígono com os rasgos já abertos.
// O raio dos rasgos muda conforme a parede é reta (prisma) ou inclinada
// (pirâmide), por isso ele chega de fora.
function pratoPoligonal({
  lados,
  raio,
  espessura,
  dedo,
  ladoDoPoligono,
  raioDosRasgos,
  nome,
  y,
  grupo,
}) {
  const volta = poligono(lados, raio);
  const { pontos, largura, altura, minU, minV } = encostarNoZero(volta);
  const paraLocal = ([x, z]) => [x - minU, z - minV];

  const rasgos = [];
  if (raioDosRasgos > 0) {
    for (let i = 0; i < lados; i += 1) {
      const anguloDaFace = (i * 2 * Math.PI) / lados;
      const dir = [-Math.sin(anguloDaFace), Math.cos(anguloDaFace)];
      const meioDaParede = [
        raioDosRasgos * Math.cos(anguloDaFace),
        raioDosRasgos * Math.sin(anguloDaFace),
      ];
      for (const aba of abasNaBorda(ladoDoPoligono, dedo, espessura)) {
        const desvio = (aba.de + aba.ate) / 2 - ladoDoPoligono / 2;
        const centro = [meioDaParede[0] + dir[0] * desvio, meioDaParede[1] + dir[1] * desvio];
        rasgos.push(rasgoDaAba(centro, dir, aba.ate - aba.de, espessura).map(paraLocal));
      }
    }
  }

  return novaChapa({
    nome,
    plano: "XZ",
    largura,
    altura,
    forma: pontos,
    furosFixos: rasgos,
    centro: { x: 0, y, z: 0 },
    grupo,
    semJuntaAutomatica: true,
  });
}

// Uma parede em pé na aresta i do polígono, com a espessura dela virada para
// fora. É daqui que sai tanto a parede reta do prisma quanto, depois de uma
// dobra, a face inclinada da pirâmide.
function paredeEmPe({ anguloDaFace, raioDoMeio, largura, altura, baseY, forma, ...resto }) {
  return novaChapa({
    plano: "XY",
    largura,
    altura,
    forma,
    // O quadro da chapa nasce com a espessura virada para o +z; girar
    // 90 menos o ângulo da face põe ela virada para fora.
    giro: { x: 0, y: 90 - anguloDaFace / GRAU, z: 0 },
    centro: {
      x: raioDoMeio * Math.cos(anguloDaFace),
      y: baseY + altura / 2,
      z: raioDoMeio * Math.sin(anguloDaFace),
    },
    semJuntaAutomatica: true,
    ...resto,
  });
}

// --- Prisma --------------------------------------------------------------

export function montarPrisma({
  diametro = 100,
  altura = 70,
  lados = 6,
  espessura = 3,
  dedo = 12,
  comTampa = false,
  modo = "vinco",
  grupo = null,
} = {}) {
  const n = Math.max(3, Math.round(lados));
  const raio = Math.max(espessura * 4, diametro / 2);
  const alto = Math.max(espessura * 3, altura);
  const lado = 2 * raio * Math.sin(Math.PI / n);
  const apotema = raio * Math.cos(Math.PI / n);
  // A parede fica com a face de fora rente à aresta do polígono, então o meio
  // dela recua meia espessura.
  const raioDoMeio = apotema - espessura / 2;
  const chapas = [];

  chapas.push(
    pratoPoligonal({
      lados: n,
      raio,
      espessura,
      dedo,
      ladoDoPoligono: lado,
      raioDosRasgos: raioDoMeio,
      nome: "Fundo",
      y: espessura / 2,
      grupo,
    }),
  );
  if (comTampa) {
    chapas.push(
      pratoPoligonal({
        lados: n,
        raio,
        espessura,
        dedo,
        ladoDoPoligono: lado,
        raioDosRasgos: raioDoMeio,
        nome: "Tampa",
        y: espessura + alto + espessura / 2,
        grupo,
      }),
    );
  }

  const naTira = modo === "vinco";
  contadorDeTiras += 1;
  const nomeDaTira = naTira ? `tira${contadorDeTiras}` : null;
  for (let i = 0; i < n; i += 1) {
    const encaixes = { u0: [], u1: [], v0: abasNaBorda(lado, dedo, espessura), v1: [] };
    if (comTampa) encaixes.v1 = abasNaBorda(lado, dedo, espessura);
    chapas.push(
      paredeEmPe({
        anguloDaFace: (i * 2 * Math.PI) / n,
        raioDoMeio,
        largura: lado,
        altura: alto,
        // A parede pousa em cima do prato: as abas descem pelos rasgos dele.
        baseY: espessura,
        nome: naTira ? `Lado ${i + 1} da tira` : `Parede ${i + 1}`,
        encaixesFixos: encaixes,
        grupo,
        tira: nomeDaTira,
        ordemNaTira: i,
      }),
    );
  }
  return chapas;
}

// --- Pirâmide ------------------------------------------------------------

export function montarPiramide({
  diametro = 100,
  altura = 80,
  lados = 4,
  espessura = 3,
  dedo = 12,
  grupo = null,
} = {}) {
  const n = Math.max(3, Math.round(lados));
  const raio = Math.max(espessura * 4, diametro / 2);
  const alto = Math.max(espessura * 3, altura);
  const lado = 2 * raio * Math.sin(Math.PI / n);
  const apotema = raio * Math.cos(Math.PI / n);
  // A altura da face triangular não é a altura da pirâmide: é a hipotenusa
  // entre a altura e o apótema. É o erro clássico de quem monta na mão, e
  // rende uma boa conversa com a turma.
  const alturaDaFace = Math.hypot(alto, apotema);
  const inclinacao = Math.atan2(alto, apotema) / GRAU;

  const chapas = [
    pratoPoligonal({
      lados: n,
      raio,
      espessura,
      dedo,
      ladoDoPoligono: lado,
      raioDosRasgos: apotema,
      nome: "Base",
      y: espessura / 2,
      grupo,
    }),
  ];

  for (let i = 0; i < n; i += 1) {
    const anguloDaFace = (i * 2 * Math.PI) / n;
    const face = paredeEmPe({
      anguloDaFace,
      raioDoMeio: apotema,
      largura: lado,
      altura: alturaDaFace,
      baseY: espessura,
      // Triângulo isósceles: a base embaixo, o bico em cima.
      forma: [
        [0, 0],
        [lado, 0],
        [lado / 2, alturaDaFace],
      ],
      nome: `Face ${i + 1}`,
      encaixesFixos: { u0: [], u1: [], v0: abasNaBorda(lado, dedo, espessura), v1: [] },
      grupo,
    });
    // Agora a dobra: a face nasceu em pé e deita até a inclinação da pirâmide,
    // girando em volta da própria aresta da base.
    const aresta = [-Math.sin(anguloDaFace), 0, Math.cos(anguloDaFace)];
    const ponto = {
      x: apotema * Math.cos(anguloDaFace),
      y: espessura,
      z: apotema * Math.sin(anguloDaFace),
    };
    // O sinal importa: girar em volta da tangente pela regra da mão direita
    // leva a face para dentro. Com o sinal trocado a pirâmide abria para fora
    // e o bico ia parar longe do eixo.
    dobrarEmVoltaDaAresta([face], ponto, aresta, 90 - inclinacao);
    chapas.push(face);
  }
  return chapas;
}

// --- Dodecaedro ----------------------------------------------------------

// O ângulo entre duas faces vizinhas de um dodecaedro. A pétala sai do plano
// da flor por 180 menos isso.
const DIEDRO = 116.56505;

// Doze pentágonos. Não tem fundo nem parede: são duas flores de seis, cada
// uma numa peça só com as dobras gravadas, que se fecham uma na outra. É o
// jeito de papel de sempre, e o único que um aluno monta sem enlouquecer.
export function montarDodecaedro({ diametro = 100, espessura = 3, grupo = null } = {}) {
  const raioDaEsfera = Math.max(espessura * 6, diametro / 2);
  // Relação conhecida: o raio da esfera que passa pelos vértices vale
  // (√3/4)(1+√5) vezes o lado do pentágono.
  const lado = raioDaEsfera / ((Math.sqrt(3) / 4) * (1 + Math.sqrt(5)));
  const raioDoPentagono = lado / (2 * Math.sin(Math.PI / 5));
  // Distância do centro do sólido até o meio de uma face. Duas dessas é a
  // altura do dodecaedro pousado numa face — e é exatamente onde a flor de
  // cima tem que ficar para as duas metades se fecharem.
  const ateAFace = (lado / 2) * Math.sqrt((25 + 11 * Math.sqrt(5)) / 10);
  const chapas = [];

  for (const metade of [0, 1]) {
    const central = poligono(5, raioDoPentagono);
    const daFlor = encostarNoZero(central);
    // Os cinco vincos ficam nos lados do pentágono do meio: é por ali que as
    // pétalas dobram para cima.
    const vincos = [];
    for (let i = 0; i < 5; i += 1) {
      vincos.push([daFlor.pontos[i], daFlor.pontos[(i + 1) % 5]]);
    }
    const alturaDaFlor = espessura / 2 + (metade === 0 ? 0 : 2 * ateAFace);
    const nomeDaFlor = metade === 0 ? "Flor de baixo" : "Flor de cima";
    const daMetade = [];
    daMetade.push(
      novaChapa({
        nome: nomeDaFlor,
        plano: "XZ",
        largura: daFlor.largura,
        altura: daFlor.altura,
        forma: daFlor.pontos,
        vincos,
        centro: { x: 0, y: alturaDaFlor, z: 0 },
        grupo,
        semJuntaAutomatica: true,
      }),
    );

    for (let i = 0; i < 5; i += 1) {
      // A pétala é o pentágono do meio refletido pelo meio da aresta i: dois
      // pentágonos regulares que dividem uma aresta, deitados no mesmo plano.
      const um = central[i];
      const outro = central[(i + 1) % 5];
      const meio = [(um[0] + outro[0]) / 2, (um[1] + outro[1]) / 2];
      const refletida = central.map(([x, z]) => [2 * meio[0] - x, 2 * meio[1] - z]);
      const daPetala = encostarNoZero(refletida);
      const petala = novaChapa({
        nome: `Pétala ${metade === 0 ? "de baixo" : "de cima"} ${i + 1}`,
        plano: "XZ",
        largura: daPetala.largura,
        altura: daPetala.altura,
        forma: daPetala.pontos,
        centro: {
          x: daPetala.minU + daPetala.largura / 2,
          y: alturaDaFlor,
          z: daPetala.minV + daPetala.altura / 2,
        },
        grupo,
        semJuntaAutomatica: true,
      });
      // Dobra em volta da aresta que ela divide com a flor.
      const direcao = [outro[0] - um[0], 0, outro[1] - um[1]];
      const sinal = metade === 0 ? 1 : -1;
      dobrarEmVoltaDaAresta(
        [petala],
        { x: meio[0], y: alturaDaFlor, z: meio[1] },
        direcao,
        sinal * (180 - DIEDRO),
      );
      daMetade.push(petala);
    }

    // As duas metades de um dodecaedro não ficam alinhadas: a de cima é a de
    // baixo virada em 36 graus. Sem isso as pétalas batem de bico em vez de
    // se encaixarem.
    if (metade === 1) {
      girarChapas(daMetade, "y", 36, { x: 0, y: alturaDaFlor, z: 0 });
    }
    chapas.push(...daMetade);
  }
  return chapas;
}

export const FORMAS = [
  { id: "caixa", nome: "Caixa de quatro paredes" },
  { id: "prisma", nome: "Prisma" },
  { id: "piramide", nome: "Pirâmide" },
  { id: "dodecaedro", nome: "Dodecaedro" },
];

export const LADOS_DO_PRISMA = [3, 5, 6];
export const LADOS_DA_PIRAMIDE = [3, 4];
