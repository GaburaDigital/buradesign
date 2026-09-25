// Fatiar um modelo 3D em camadas de chapa.
//
// Cada camada é o contorno do modelo na altura do meio dela. O corte é feito
// direto no triângulo, sem booleana: para cada triângulo que atravessa o
// plano sai um segmento, e os segmentos se costuram em voltas fechadas. É
// rápido o bastante para o computador da sala fatiar um modelo inteiro
// enquanto o aluno olha.

import * as THREE from "three";

const CASAS = 3;
const chave = (x, y) => `${x.toFixed(CASAS)},${y.toFixed(CASAS)}`;

// Onde o triângulo corta o plano da altura. Devolve o segmento, ou nada.
function segmentoDoTriangulo(a, b, c, altura) {
  const pontos = [];
  const cruzar = (p, q) => {
    const dp = p.y - altura;
    const dq = q.y - altura;
    if ((dp > 0 && dq > 0) || (dp < 0 && dq < 0)) return;
    if (Math.abs(dp - dq) < 1e-9) return;
    const t = dp / (dp - dq);
    if (t < -1e-6 || t > 1 + 1e-6) return;
    pontos.push([p.x + (q.x - p.x) * t, p.z + (q.z - p.z) * t]);
  };
  cruzar(a, b);
  cruzar(b, c);
  cruzar(c, a);
  if (pontos.length < 2) return null;
  const [um, outro] = pontos;
  if (Math.abs(um[0] - outro[0]) < 1e-7 && Math.abs(um[1] - outro[1]) < 1e-7) return null;
  return [um, outro];
}

// Costura os segmentos soltos em voltas fechadas.
//
// O corte de um triângulo não tem direção: o mesmo pedaço de contorno pode
// sair de pé ou de cabeça para baixo, conforme a ordem dos vértices. Por isso
// a costura anda pelos dois lados de cada segmento — assumir direção deixava
// toda camada aberta, e o fatiador devolvia zero.
function costurar(segmentos) {
  const vizinhos = new Map();
  const juntar = (id, vizinho) => {
    if (!vizinhos.has(id)) vizinhos.set(id, []);
    vizinhos.get(id).push(vizinho);
  };
  segmentos.forEach(([de, ate], indice) => {
    juntar(chave(de[0], de[1]), { ponto: ate, indice });
    juntar(chave(ate[0], ate[1]), { ponto: de, indice });
  });

  const usados = new Set();
  const voltas = [];
  for (let i = 0; i < segmentos.length; i += 1) {
    if (usados.has(i)) continue;
    usados.add(i);
    const [de, ate] = segmentos[i];
    const idInicial = chave(de[0], de[1]);
    const volta = [de, ate];
    let atual = ate;
    let passos = 0;
    while (passos < 100000) {
      passos += 1;
      if (chave(atual[0], atual[1]) === idInicial) break;
      const opcoes = vizinhos.get(chave(atual[0], atual[1])) || [];
      const proximo = opcoes.find((opcao) => !usados.has(opcao.indice));
      if (!proximo) break;
      usados.add(proximo.indice);
      volta.push(proximo.ponto);
      atual = proximo.ponto;
    }
    if (volta.length >= 3) {
      const primeiro = volta[0];
      const ultimo = volta[volta.length - 1];
      if (chave(primeiro[0], primeiro[1]) === chave(ultimo[0], ultimo[1])) volta.pop();
      if (volta.length >= 3) voltas.push(volta);
    }
  }
  return voltas;
}

function area(volta) {
  let soma = 0;
  for (let i = 0; i < volta.length; i += 1) {
    const [x1, y1] = volta[i];
    const [x2, y2] = volta[(i + 1) % volta.length];
    soma += x1 * y2 - x2 * y1;
  }
  return soma / 2;
}

export function dentroDaVolta(volta, ponto) {
  let dentro = false;
  for (let i = 0, j = volta.length - 1; i < volta.length; j = i, i += 1) {
    const [xi, yi] = volta[i];
    const [xj, yj] = volta[j];
    const cruza = yi > ponto[1] !== yj > ponto[1];
    if (cruza && ponto[0] < ((xj - xi) * (ponto[1] - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function centroDaVolta(volta) {
  let x = 0;
  let y = 0;
  for (const ponto of volta) {
    x += ponto[0];
    y += ponto[1];
  }
  return [x / volta.length, y / volta.length];
}

// Um círculo em polígono, para o furo de alinhamento.
function circulo(centro, diametro, lados = 24) {
  const pontos = [];
  for (let i = 0; i < lados; i += 1) {
    const angulo = (i / lados) * Math.PI * 2;
    pontos.push([
      centro[0] + (Math.cos(angulo) * diametro) / 2,
      centro[1] + (Math.sin(angulo) * diametro) / 2,
    ]);
  }
  return pontos;
}

// Fatia tudo o que estiver no grupo. Cada camada vira uma peça pronta para o
// arranjo, com o mesmo formato que a planificação das chapas usa.
export function fatiarModelo(objetos, opcoes = {}) {
  const { espessura = 3, limiteDeCamadas = 120, furoDeAlinhamento = 0 } = opcoes;
  const malhas = [];
  for (const objeto of objetos) {
    objeto.updateMatrixWorld(true);
    objeto.traverse((filho) => {
      if (filho.isMesh && filho.geometry) malhas.push(filho);
    });
  }
  if (!malhas.length) return { camadas: [], avisos: ["Não há modelo para fatiar."] };

  const caixa = new THREE.Box3();
  for (const malha of malhas) caixa.expandByObject(malha);
  const alturaTotal = caixa.max.y - caixa.min.y;
  if (!(alturaTotal > 0)) return { camadas: [], avisos: ["O modelo não tem altura."] };

  const avisos = [];
  let quantas = Math.max(1, Math.round(alturaTotal / espessura));
  if (quantas > limiteDeCamadas) {
    avisos.push(
      `O modelo daria ${quantas} camadas. Foram feitas as ${limiteDeCamadas} primeiras — use uma chapa mais grossa.`,
    );
    quantas = limiteDeCamadas;
  }

  // Todos os triângulos já no mundo, uma vez só.
  const triangulos = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const malha of malhas) {
    const geometria = malha.geometry.index ? malha.geometry.toNonIndexed() : malha.geometry;
    const posicoes = geometria.attributes.position;
    for (let i = 0; i < posicoes.count; i += 3) {
      a.fromBufferAttribute(posicoes, i).applyMatrix4(malha.matrixWorld);
      b.fromBufferAttribute(posicoes, i + 1).applyMatrix4(malha.matrixWorld);
      c.fromBufferAttribute(posicoes, i + 2).applyMatrix4(malha.matrixWorld);
      triangulos.push([a.clone(), b.clone(), c.clone()]);
    }
  }

  const camadas = [];
  for (let i = 0; i < quantas; i += 1) {
    const altura = caixa.min.y + espessura * (i + 0.5);
    const segmentos = [];
    for (const [p, q, r] of triangulos) {
      const menor = Math.min(p.y, q.y, r.y);
      const maior = Math.max(p.y, q.y, r.y);
      if (altura < menor || altura > maior) continue;
      const segmento = segmentoDoTriangulo(p, q, r, altura);
      if (segmento) segmentos.push(segmento);
    }
    const voltas = costurar(segmentos).filter((volta) => Math.abs(area(volta)) > 0.5);
    if (!voltas.length) continue;

    voltas.sort((x, y) => Math.abs(area(y)) - Math.abs(area(x)));
    const fora = voltas[0];
    const dentro = voltas.slice(1);
    const furos = [...dentro];

    if (furoDeAlinhamento > 0) {
      const centro = centroDaVolta(fora);
      const cabe =
        dentroDaVolta(fora, centro) && dentro.every((volta) => !dentroDaVolta(volta, centro));
      if (cabe) furos.push(circulo(centro, furoDeAlinhamento));
    }

    const limites = medir(fora);
    camadas.push({
      id: `camada${i + 1}`,
      nome: `Camada ${i + 1}`,
      contorno: fora,
      furos,
      limites,
      area: Math.abs(area(fora)) - furos.reduce((soma, volta) => soma + Math.abs(area(volta)), 0),
      altura: espessura,
    });
  }

  if (!camadas.length) avisos.push("Nenhuma camada saiu com contorno fechado.");
  return { camadas, avisos, alturaTotal };
}

function medir(pontos) {
  let minU = Infinity;
  let minV = Infinity;
  let maxU = -Infinity;
  let maxV = -Infinity;
  for (const [u, v] of pontos) {
    minU = Math.min(minU, u);
    minV = Math.min(minV, v);
    maxU = Math.max(maxU, u);
    maxV = Math.max(maxV, v);
  }
  return { minU, minV, maxU, maxV, largura: maxU - minU, altura: maxV - minV };
}
