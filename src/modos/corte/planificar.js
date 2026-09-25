// Da chapa em pé para a chapa deitada na mesa de corte.
//
// Cada chapa vira um contorno fechado em milímetros: o retângulo dela com as
// abas para fora e os entalhes para dentro, mais os rasgos passantes das
// juntas em T. É este contorno que o arranjo encaixa na folha e o SVG desenha.

import { PLANOS } from "./chapas.js";

// A volta é sempre a mesma: v0 da esquerda para a direita, u1 subindo, v1
// voltando, u0 descendo. Cada borda sabe para que lado fica o "fora".
const VOLTA = [
  { borda: "v0", eixo: "u", sentido: 1, base: "v", fora: -1 },
  { borda: "u1", eixo: "v", sentido: 1, base: "u", fora: 1 },
  { borda: "v1", eixo: "u", sentido: -1, base: "v", fora: 1 },
  { borda: "u0", eixo: "v", sentido: -1, base: "u", fora: -1 },
];

function arrumar(lista, limite) {
  const limpos = [];
  for (const item of lista || []) {
    const de = Math.max(0, Math.min(limite, Math.min(item.de, item.ate)));
    const ate = Math.max(0, Math.min(limite, Math.max(item.de, item.ate)));
    if (ate - de > 0.05) limpos.push({ de, ate, tipo: item.tipo });
  }
  limpos.sort((a, b) => a.de - b.de);
  // Dois recortes que se encavalam viram um só: dente em cima de dente faz o
  // contorno se cruzar, e aí a cortadora corta onde não devia.
  const juntos = [];
  for (const item of limpos) {
    const ultimo = juntos[juntos.length - 1];
    if (ultimo && ultimo.tipo === item.tipo && item.de <= ultimo.ate + 0.01) {
      ultimo.ate = Math.max(ultimo.ate, item.ate);
    } else if (ultimo && item.de < ultimo.ate - 0.01) {
      // Tipos diferentes brigando pelo mesmo trecho: fica o primeiro.
      if (item.ate > ultimo.ate) juntos.push({ de: ultimo.ate, ate: item.ate, tipo: item.tipo });
    } else {
      juntos.push({ ...item });
    }
  }
  return juntos;
}

export function planificar(chapa, espessura, encaixes = {}, furos = []) {
  const contorno = [];
  const por = (u, v) => {
    const ultimo = contorno[contorno.length - 1];
    if (ultimo && Math.abs(ultimo[0] - u) < 1e-6 && Math.abs(ultimo[1] - v) < 1e-6) return;
    contorno.push([u, v]);
  };

  for (const passo of VOLTA) {
    const comprimento = passo.eixo === "u" ? chapa.largura : chapa.altura;
    const nivel = passo.base === "v" ? (passo.fora < 0 ? 0 : chapa.altura) : passo.fora < 0 ? 0 : chapa.largura;
    const recortes = arrumar(encaixes[passo.borda], comprimento);
    const ordenados = passo.sentido === 1 ? recortes : [...recortes].reverse();

    const ponto = (andado, deslocado) => {
      const fundo = nivel + deslocado * passo.fora;
      return passo.eixo === "u" ? por(andado, fundo) : por(fundo, andado);
    };

    ponto(passo.sentido === 1 ? 0 : comprimento, 0);
    for (const recorte of ordenados) {
      const entrada = passo.sentido === 1 ? recorte.de : recorte.ate;
      const saida = passo.sentido === 1 ? recorte.ate : recorte.de;
      const altura = recorte.tipo === "aba" ? espessura : -espessura;
      ponto(entrada, 0);
      ponto(entrada, altura);
      ponto(saida, altura);
      ponto(saida, 0);
    }
    ponto(passo.sentido === 1 ? comprimento : 0, 0);
  }

  // Fecha a volta sem repetir o primeiro ponto.
  if (contorno.length > 1) {
    const primeiro = contorno[0];
    const ultimo = contorno[contorno.length - 1];
    if (Math.abs(primeiro[0] - ultimo[0]) < 1e-6 && Math.abs(primeiro[1] - ultimo[1]) < 1e-6) {
      contorno.pop();
    }
  }

  const rasgos = (furos || [])
    .filter((furo) => furo.u1 - furo.u0 > 0.05 && furo.v1 - furo.v0 > 0.05)
    .map((furo) => [
      [furo.u0, furo.v0],
      [furo.u1, furo.v0],
      [furo.u1, furo.v1],
      [furo.u0, furo.v1],
    ]);

  const limites = medirContorno(contorno);
  return {
    id: chapa.id,
    nome: chapa.nome,
    plano: chapa.plano,
    rotuloU: PLANOS[chapa.plano].rotuloU,
    rotuloV: PLANOS[chapa.plano].rotuloV,
    largura: chapa.largura,
    altura: chapa.altura,
    contorno,
    furos: rasgos,
    limites,
    area: areaDe(contorno) - rasgos.reduce((soma, furo) => soma + Math.abs(areaDe(furo)), 0),
  };
}

export function areaDe(pontos) {
  let soma = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[(i + 1) % pontos.length];
    soma += x1 * y2 - x2 * y1;
  }
  return soma / 2;
}

export function medirContorno(pontos) {
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

// Duas arestas que se cruzam no mesmo contorno significam recorte impossível.
// Vale conferir: é o tipo de erro que só aparece na chapa já cortada.
export function seCruza(pontos) {
  const n = pontos.length;
  const cruza = (p1, p2, p3, p4) => {
    const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const d1 = d(p3, p4, p1);
    const d2 = d(p3, p4, p2);
    const d3 = d(p1, p2, p3);
    const d4 = d(p1, p2, p4);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue;
      if (cruza(pontos[i], pontos[(i + 1) % n], pontos[j], pontos[(j + 1) % n])) return true;
    }
  }
  return false;
}

export function planificarTudo(chapas, espessura, resultado) {
  return chapas.map((chapa) =>
    planificar(chapa, espessura, resultado.encaixes[chapa.id] || {}, resultado.furos[chapa.id] || []),
  );
}
