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
import { abaPassante } from "./angulo.js";

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

// O prato de fundo (ou de tampa): o polígono liso. Os rasgos chegam depois,
// quando as paredes forem presas nele.
// O raio dos rasgos muda conforme a parede é reta (prisma) ou inclinada
// (pirâmide), por isso ele chega de fora.
function pratoPoligonal({ lados, raio, nome, y, grupo }) {
  const volta = poligono(lados, raio);
  const { pontos, largura, altura, minU, minV } = encostarNoZero(volta);
  return novaChapa({
    nome,
    plano: "XZ",
    largura,
    altura,
    forma: pontos,
    furosFixos: [],
    // O centro da chapa é o meio da caixa que envolve a forma, e num polígono
    // de lados ímpares esse meio não é o centro do polígono: num triângulo dá
    // 12 mm de diferença. Sem descontar, o prato saía deslocado das paredes.
    centro: { x: minU + largura / 2, y, z: minV + altura / 2 },
    grupo,
    semJuntaAutomatica: true,
  });
}

// Prende a parede no prato: a aba sai da borda dela e o rasgo nasce no prato,
// no lugar exato onde a aba vai passar. Quem faz a conta é o módulo do
// ângulo, então isto vale igual para a parede reta do prisma e para a face
// deitada da pirâmide — é o mesmo encaixe, só muda o ângulo.
function prenderNoPrato({ parede, prato, borda, comprimentoDaBorda, espessura, dedo, folga }) {
  const abas = abasNaBorda(comprimentoDaBorda, dedo, espessura);
  const encaixe = abaPassante(parede, prato, borda, espessura, abas, { folga });
  if (!encaixe) return;
  if (!parede.encaixesFixos) parede.encaixesFixos = { u0: [], u1: [], v0: [], v1: [] };
  parede.encaixesFixos[borda] = abas.map((aba) => ({
    ...aba,
    tipo: "aba",
    profundidade: encaixe.profundidade,
  }));
  prato.furosFixos.push(...encaixe.rasgos);
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
  folga = 0.1,
  comTampa = false,
  modo = "vinco",
  grupo = null,
} = {}) {
  const n = Math.max(3, Math.round(lados));
  const raio = Math.max(espessura * 4, diametro / 2);
  const alto = Math.max(espessura * 3, altura);
  const apotema = raio * Math.cos(Math.PI / n);
  // A parede fica com a face de fora rente à aresta do polígono, então o meio
  // dela recua meia espessura.
  const raioDoMeio = apotema - espessura / 2;
  // O comprimento da parede é medido no plano do meio dela, e não na aresta
  // do polígono. Com a medida da aresta, duas paredes vizinhas em ângulo
  // entravam uma dentro da outra — que é o defeito que aparecia na tela,
  // pior quanto menos lados a forma tem.
  const lado = 2 * raioDoMeio * Math.tan(Math.PI / n);
  const chapas = [];

  const fundo = pratoPoligonal({ lados: n, raio, nome: "Fundo", y: espessura / 2, grupo });
  chapas.push(fundo);
  let tampa = null;
  if (comTampa) {
    tampa = pratoPoligonal({
      lados: n,
      raio,
      nome: "Tampa",
      y: espessura + alto + espessura / 2,
      grupo,
    });
    chapas.push(tampa);
  }

  const naTira = modo === "vinco";
  contadorDeTiras += 1;
  const nomeDaTira = naTira ? `tira${contadorDeTiras}` : null;
  for (let i = 0; i < n; i += 1) {
    const parede = paredeEmPe({
      anguloDaFace: (i * 2 * Math.PI) / n,
      raioDoMeio,
      largura: lado,
      altura: alto,
      // A parede pousa em cima do prato: as abas descem pelos rasgos dele.
      baseY: espessura,
      nome: naTira ? `Lado ${i + 1} da tira` : `Parede ${i + 1}`,
      encaixesFixos: { u0: [], u1: [], v0: [], v1: [] },
      grupo,
      tira: nomeDaTira,
      ordemNaTira: i,
    });
    prenderNoPrato({
      parede,
      prato: fundo,
      borda: "v0",
      comprimentoDaBorda: lado,
      espessura,
      dedo,
      folga,
    });
    if (tampa) {
      prenderNoPrato({
        parede,
        prato: tampa,
        borda: "v1",
        comprimentoDaBorda: lado,
        espessura,
        dedo,
        folga,
      });
    }
    chapas.push(parede);
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
  folga = 0.1,
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

  const base = pratoPoligonal({ lados: n, raio, nome: "Base", y: espessura / 2, grupo });
  const chapas = [base];

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
      encaixesFixos: { u0: [], u1: [], v0: [], v1: [] },
      grupo,
    });
    // A dobra: a face nasceu em pé e deita até a inclinação da pirâmide,
    // girando em volta da própria aresta da base. O sinal importa — girar em
    // volta da tangente pela regra da mão direita leva a face para dentro.
    const aresta = [-Math.sin(anguloDaFace), 0, Math.cos(anguloDaFace)];
    const ponto = {
      x: apotema * Math.cos(anguloDaFace),
      y: espessura,
      z: apotema * Math.sin(anguloDaFace),
    };
    dobrarEmVoltaDaAresta([face], ponto, aresta, 90 - inclinacao);
    // Só depois de deitada é que a aba pode ser calculada: é a inclinação
    // dela que diz o quanto a aba estica e o quanto o rasgo abre. Antes, a
    // aba saía do tamanho de uma parede reta e a pirâmide não prendia.
    prenderNoPrato({
      parede: face,
      prato: base,
      borda: "v0",
      comprimentoDaBorda: lado,
      espessura,
      dedo,
      folga,
    });
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
        // Mesmo desconto do prato: o meio da caixa que envolve um pentágono
        // não é o centro dele, e a flor saía fora do eixo.
        centro: {
          x: daFlor.minU + daFlor.largura / 2,
          y: alturaDaFlor,
          z: daFlor.minV + daFlor.altura / 2,
        },
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
