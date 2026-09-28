// A broca: um volume que fura tudo que ele atravessa.
//
// O aluno põe um cilindro ou uma caixa no espaço, encosta nas chapas e manda
// furar. Cada chapa ganha o furo no lugar exato onde o volume passa por ela —
// e como a broca atravessa várias de uma vez, dá para abrir o caminho de um
// parafuso em quatro paredes com um clique só. Era isso ou o aluno medir cada
// furo na mão, em cada peça, e torcer para bater.
//
// A conta é a de sempre nesta oficina: onde o volume cruza o plano do meio da
// chapa. O volume é um prisma — retângulo para a caixa, polígono de muitos
// lados para o cilindro — então basta ver por onde as arestas dele furam o
// plano e juntar os pontos em volta.

import { eixosDaChapa } from "./chapas.js";
import { paraAChapa } from "./angulo.js";

const GRAU = Math.PI / 180;
const LADOS_DO_CILINDRO = 32;

let contador = 0;

export function novaBroca({
  tipo = "cilindro",
  diametro = 6,
  largura = 20,
  profundidade = 20,
  altura = 60,
  centro = { x: 0, y: 30, z: 0 },
  giro = { x: 0, y: 0, z: 0 },
} = {}) {
  contador += 1;
  return {
    id: `broca${contador}`,
    tipo,
    diametro,
    largura,
    profundidade,
    altura,
    centro: { ...centro },
    giro: { ...giro },
  };
}

// A seção da broca, no plano dela. O cilindro vira polígono de muitos lados:
// numa peça de escola a diferença para o círculo de verdade é menor que a
// fresta que a máquina come.
export function secaoDaBroca(broca) {
  if (broca.tipo === "caixa") {
    const a = broca.largura / 2;
    const b = broca.profundidade / 2;
    return [
      [-a, -b],
      [a, -b],
      [a, b],
      [-a, b],
    ];
  }
  const raio = broca.diametro / 2;
  const pontos = [];
  for (let i = 0; i < LADOS_DO_CILINDRO; i += 1) {
    const angulo = (i / LADOS_DO_CILINDRO) * Math.PI * 2;
    pontos.push([raio * Math.cos(angulo), raio * Math.sin(angulo)]);
  }
  return pontos;
}

// As arestas do volume no mundo: as duas tampas e os prumos que ligam elas.
// A broca guarda giro como a chapa, então o quadro dela sai da mesma conta.
export function arestasDaBroca(broca) {
  const eixos = eixosDaChapa({ giro: broca.giro });
  const secao = secaoDaBroca(broca);
  const meio = broca.altura / 2;
  const noMundo = (a, b, c) => [
    broca.centro.x + eixos.u[0] * a + eixos.v[0] * b + eixos.n[0] * c,
    broca.centro.y + eixos.u[1] * a + eixos.v[1] * b + eixos.n[1] * c,
    broca.centro.z + eixos.u[2] * a + eixos.v[2] * b + eixos.n[2] * c,
  ];
  const baixo = secao.map(([a, b]) => noMundo(a, b, -meio));
  const cima = secao.map(([a, b]) => noMundo(a, b, meio));
  const arestas = [];
  for (let i = 0; i < secao.length; i += 1) {
    const prox = (i + 1) % secao.length;
    arestas.push([baixo[i], baixo[prox]]);
    arestas.push([cima[i], cima[prox]]);
    arestas.push([baixo[i], cima[i]]);
  }
  return arestas;
}

// Ordena pontos que já estão no mesmo plano, em volta do meio deles. Sem
// isso o contorno sai embaralhado e o furo vira um rabisco.
function emVolta(pontos) {
  const meioU = pontos.reduce((s, p) => s + p[0], 0) / pontos.length;
  const meioV = pontos.reduce((s, p) => s + p[1], 0) / pontos.length;
  return [...pontos].sort(
    (a, b) => Math.atan2(a[1] - meioV, a[0] - meioU) - Math.atan2(b[1] - meioV, b[0] - meioU),
  );
}

// O furo que esta broca abre nesta chapa, em coordenadas da chapa. Devolve
// null quando a broca não encosta nela.
export function furoNaChapa(broca, chapa, { folga = 0 } = {}) {
  const pontos = [];
  for (const [de, ate] of arestasDaBroca(broca)) {
    const a = paraAChapa(chapa, de);
    const b = paraAChapa(chapa, ate);
    // A aresta cruza o plano do meio da chapa?
    if (a.n === b.n) continue;
    if (a.n > 0 === b.n > 0) continue;
    const t = a.n / (a.n - b.n);
    pontos.push([a.u + (b.u - a.u) * t, a.v + (b.v - a.v) * t]);
  }
  if (pontos.length < 3) return null;

  const volta = emVolta(pontos);
  if (folga > 0) {
    // Abre o furo pela folga pedida, empurrando cada ponto para fora do meio.
    const meioU = volta.reduce((s, p) => s + p[0], 0) / volta.length;
    const meioV = volta.reduce((s, p) => s + p[1], 0) / volta.length;
    return volta.map(([u, v]) => {
      const du = u - meioU;
      const dv = v - meioV;
      const dist = Math.hypot(du, dv) || 1;
      return [u + (du / dist) * folga, v + (dv / dist) * folga];
    });
  }
  return volta;
}

// Fura todas as chapas de uma vez. Devolve quantas foram furadas, para a
// bancada poder dizer ao aluno o que aconteceu.
export function furar(broca, chapas, opcoes = {}) {
  let quantas = 0;
  for (const chapa of chapas) {
    const furo = furoNaChapa(broca, chapa, opcoes);
    if (!furo) continue;
    if (!chapa.furosFixos) chapa.furosFixos = [];
    chapa.furosFixos.push(furo);
    quantas += 1;
  }
  return quantas;
}

export const TIPOS = [
  { id: "cilindro", nome: "Furo redondo" },
  { id: "caixa", nome: "Furo quadrado" },
];
