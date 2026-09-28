// Da chapa em pé para a chapa deitada na mesa de corte.
//
// Cada chapa vira um contorno fechado em milímetros: o retângulo dela com as
// abas para fora e os entalhes para dentro, mais os rasgos passantes das
// juntas em T. É este contorno que o arranjo encaixa na folha e o SVG desenha.

import { rotulosDaChapa } from "./chapas.js";

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

// Junta o que o detector achou com o que a forma pronta já trazia.
function mesclarEncaixes(fixos, achados) {
  const saida = { u0: [], u1: [], v0: [], v1: [] };
  for (const borda of Object.keys(saida)) {
    saida[borda] = [...((fixos && fixos[borda]) || []), ...((achados && achados[borda]) || [])];
  }
  return saida;
}

// O rasgo pode vir como retângulo do detector ou como polígono da forma
// pronta (um encaixe de parede torta não é paralelo a nada).
function rasgoEmPontos(furo) {
  if (Array.isArray(furo)) return furo.length >= 3 ? furo.map((ponto) => [...ponto]) : null;
  if (furo.u1 - furo.u0 <= 0.05 || furo.v1 - furo.v0 <= 0.05) return null;
  return [
    [furo.u0, furo.v0],
    [furo.u1, furo.v0],
    [furo.u1, furo.v1],
    [furo.u0, furo.v1],
  ];
}

export function planificar(chapa, espessura, encaixes = {}, furos = []) {
  const contorno = [];
  const por = (u, v) => {
    const ultimo = contorno[contorno.length - 1];
    if (ultimo && Math.abs(ultimo[0] - u) < 1e-6 && Math.abs(ultimo[1] - v) < 1e-6) return;
    contorno.push([u, v]);
  };

  const todosOsEncaixes = mesclarEncaixes(chapa.encaixesFixos, encaixes);

  // Chapa com forma própria (pentágono, triângulo, o que for) não dá a volta
  // do retângulo: o contorno dela já veio pronto da forma. Os encaixes dela
  // vivem nos rasgos, não na borda.
  if (chapa.forma && chapa.forma.length >= 3) {
    for (const [u, v] of chapa.forma) por(u, v);
    return montarPeca(chapa, contorno, furos, espessura);
  }

  for (const passo of VOLTA) {
    const comprimento = passo.eixo === "u" ? chapa.largura : chapa.altura;
    const nivel = passo.base === "v" ? (passo.fora < 0 ? 0 : chapa.altura) : passo.fora < 0 ? 0 : chapa.largura;
    const recortes = arrumar(todosOsEncaixes[passo.borda], comprimento);
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

  return montarPeca(chapa, contorno, furos, espessura);
}

function montarPeca(chapa, contorno, furos, espessura) {
  const rasgos = [...(chapa.furosFixos || []), ...(furos || [])]
    .map(rasgoEmPontos)
    .filter(Boolean);

  const limites = medirContorno(contorno);
  const rotulos = rotulosDaChapa(chapa);
  return {
    id: chapa.id,
    nome: chapa.nome,
    plano: chapa.plano,
    grupo: chapa.grupo || null,
    tira: chapa.tira || null,
    ordemNaTira: chapa.ordemNaTira || 0,
    rotuloU: rotulos.rotuloU,
    rotuloV: rotulos.rotuloV,
    largura: chapa.largura,
    altura: chapa.altura,
    espessura,
    contorno,
    furos: rasgos,
    // Gravações saem no SVG numa cor só de gravar: vinco é para dobrar, não
    // para cortar. Cortar um vinco é perder a peça.
    gravacoes: (chapa.vincos || []).map((linha) => linha.map((ponto) => [...ponto])),
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

// Uma tira é um retângulo comprido que o aluno dobra nos vincos. No 3D ela
// aparece já dobrada, em pedaços, para a peça fazer sentido na tela; no plano
// de corte os pedaços viram um só, porque cortar em pedaços e colar de volta
// seria justamente o trabalho que o vinco evita.
export function juntarTiras(chapas) {
  const tiras = new Map();
  const soltas = [];
  for (const chapa of chapas) {
    if (!chapa.tira) {
      soltas.push(chapa);
      continue;
    }
    if (!tiras.has(chapa.tira)) tiras.set(chapa.tira, []);
    tiras.get(chapa.tira).push(chapa);
  }

  for (const [nome, pedacos] of tiras) {
    pedacos.sort((a, b) => (a.ordemNaTira || 0) - (b.ordemNaTira || 0));
    const altura = pedacos[0].altura;
    const encaixes = { u0: [], u1: [], v0: [], v1: [] };
    const vincos = [];
    let andado = 0;
    pedacos.forEach((pedaco, indice) => {
      const fixos = pedaco.encaixesFixos || {};
      for (const borda of ["v0", "v1"]) {
        for (const item of fixos[borda] || []) {
          encaixes[borda].push({ ...item, de: item.de + andado, ate: item.ate + andado });
        }
      }
      // As bordas de fora da tira continuam sendo as bordas das pontas.
      if (indice === 0) encaixes.u0.push(...(fixos.u0 || []));
      if (indice === pedacos.length - 1) {
        encaixes.u1.push(...(fixos.u1 || []));
      }
      andado += pedaco.largura;
      if (indice < pedacos.length - 1) vincos.push([[andado, 0], [andado, altura]]);
    });

    soltas.push({
      ...pedacos[0],
      id: `${nome}`,
      nome: pedacos[0].nomeDaTira || `Tira de ${pedacos.length} lados`,
      largura: andado,
      altura,
      forma: null,
      encaixesFixos: encaixes,
      furosFixos: null,
      vincos,
      tira: null,
    });
  }
  return soltas;
}

export function planificarTudo(chapas, espessura, resultado) {
  return chapas.map((chapa) =>
    planificar(chapa, espessura, resultado.encaixes[chapa.id] || {}, resultado.furos[chapa.id] || []),
  );
}
