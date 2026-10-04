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

// O furo cabe inteiro dentro da peça? Furo que vaza pela borda não é furo: é
// um rabisco que a cortadora vai seguir para fora da peça, e foi isso que
// apareceu como "forma flutuando" quando a broca passava raspando numa
// superfície inclinada.
export function cabeNaChapa(furo, contorno) {
  const dentro = (ponto) => {
    let sim = false;
    for (let i = 0, j = contorno.length - 1; i < contorno.length; j = i, i += 1) {
      const [xi, yi] = contorno[i];
      const [xj, yj] = contorno[j];
      if (yi > ponto[1] !== yj > ponto[1]) {
        if (ponto[0] < ((xj - xi) * (ponto[1] - yi)) / (yj - yi) + xi) sim = !sim;
      }
    }
    return sim;
  };
  return furo.every(dentro);
}

// Fura todas as chapas de uma vez. Devolve o que aconteceu com cada uma, para
// a bancada poder contar a história ao aluno em vez de falhar calada.
export function furar(broca, chapas, opcoes = {}) {
  const { contornoDe = null, anguloMinimo = 12 } = opcoes;
  const feitas = [];
  const vazaram = [];
  const deitadas = [];
  for (const chapa of chapas) {
    const furo = furoNaChapa(broca, chapa, opcoes);
    if (!furo) continue;

    // Broca quase deitada na chapa: a seção vira uma elipse comprida que não
    // é furo nenhum. Melhor avisar do que entregar peça estragada.
    const esticada = esticamentoDo(furo);
    if (esticada > 1 / Math.sin((anguloMinimo * Math.PI) / 180)) {
      deitadas.push(chapa.nome);
      continue;
    }

    const contorno = contornoDe ? contornoDe(chapa) : null;
    if (contorno && !cabeNaChapa(furo, contorno)) {
      vazaram.push(chapa.nome);
      continue;
    }
    if (!chapa.furosFixos) chapa.furosFixos = [];
    chapa.furosFixos.push(furo);
    feitas.push(chapa.nome);
  }
  return { feitas, vazaram, deitadas, quantas: feitas.length };
}

// Quanto o furo é mais comprido que largo. Num furo redondo de broca em pé
// vale 1; quanto mais deitada a broca, maior.
function esticamentoDo(furo) {
  const meioU = furo.reduce((s, p) => s + p[0], 0) / furo.length;
  const meioV = furo.reduce((s, p) => s + p[1], 0) / furo.length;
  const raios = furo.map((p) => Math.hypot(p[0] - meioU, p[1] - meioV));
  const menor = Math.min(...raios);
  return menor > 1e-6 ? Math.max(...raios) / menor : Infinity;
}

export const TIPOS = [
  { id: "cilindro", nome: "Furo redondo" },
  { id: "caixa", nome: "Furo quadrado" },
];
