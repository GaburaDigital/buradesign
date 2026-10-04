// As formas das peças do mecanismo, em milímetros.
//
// Cada peça tem uma forma, e a forma responde duas perguntas diferentes:
//
//   1. Como ela aparece na tela?  -> contornoDaForma(), em milímetros
//   2. Como ela bate nas outras?  -> colisoesDaForma(), já na régua da física
//
// As duas respostas não são sempre a mesma coisa, e é de propósito. A
// engrenagem é o caso que ensina: o dente dela é desenhado de verdade, com
// perfil de involuta, porque o aluno precisa ver dente e porque esse contorno
// serve para cortar a peça. Mas o dente NÃO colide. Dente batendo em dente
// num motor de física de navegador escorrega, prende e atravessa — qualquer
// um que já tentou sabe. Então a colisão da engrenagem é um círculo menor que
// o primitivo, a razão de transmissão fica por conta de uma junta que não
// erra nunca, e o aluno vê exatamente o que esperaria ver.

import { mm, POR_MILIMETRO } from "./unidades.js";

const TAU = Math.PI * 2;
const GRAU = Math.PI / 180;

// --- a involuta da engrenagem -------------------------------------------
//
// Dente de engrenagem de verdade é uma involuta de círculo: a curva que a
// ponta de um fio desenha quando ele é desenrolado de um carretel. Não é
// enfeite de desenhista — é a única curva em que a razão entre as duas
// engrenagens fica constante mesmo quando o dente desliza, e é por isso que
// toda engrenagem do mundo usa ela.
//
//   módulo (m)   -> o "tamanho" do dente; dois engrenamentos só casam se
//                   tiverem o mesmo módulo
//   primitivo    -> r = m × dentes / 2, o círculo que "rola" sem escorregar
//   base         -> rb = r × cos(ângulo de pressão)
//   topo         -> ra = r + m
//   raiz         -> rd = r − 1,25 m

export const ANGULO_DE_PRESSAO = 20 * GRAU;
export const LIMITES_DA_ENGRENAGEM = Object.freeze({
  dentesMin: 8,
  dentesMax: 60,
  moduloMin: 1,
  moduloMax: 10,
});

// A função involuta: o quanto o ponto gira em volta do centro quando o fio é
// desenrolado até o raio pedido.
function involuta(raioBase, raio) {
  if (raio <= raioBase) return 0;
  const a = Math.acos(Math.min(1, raioBase / raio));
  return Math.tan(a) - a;
}

export function medidasDaEngrenagem(dentes, modulo) {
  const n = Math.max(LIMITES_DA_ENGRENAGEM.dentesMin, Math.min(LIMITES_DA_ENGRENAGEM.dentesMax, Math.round(dentes)));
  const m = Math.max(LIMITES_DA_ENGRENAGEM.moduloMin, Math.min(LIMITES_DA_ENGRENAGEM.moduloMax, modulo));
  const primitivo = (m * n) / 2;
  return {
    dentes: n,
    modulo: m,
    primitivo,
    base: primitivo * Math.cos(ANGULO_DE_PRESSAO),
    topo: primitivo + m,
    raiz: Math.max(primitivo * 0.3, primitivo - 1.25 * m),
    // O raio que colide: fica abaixo da raiz, para que duas engrenagens
    // engrenadas (centros a r1 + r2) nunca se toquem de fato.
    colisao: Math.max(primitivo * 0.25, primitivo - 1.45 * m),
  };
}

// O contorno completo da engrenagem, no sentido anti-horário.
export function contornoDaEngrenagem(dentes, modulo) {
  const g = medidasDaEngrenagem(dentes, modulo);
  const passo = TAU / g.dentes;
  // Meio dente no primitivo é um quarto do passo circular.
  const meioNoPrimitivo = passo / 4;
  const inicio = Math.max(g.base, g.raiz);
  const anguloDoFlanco = (raio) =>
    meioNoPrimitivo + involuta(g.base, g.primitivo) - involuta(g.base, raio);

  const PEDACOS = 7;
  const raios = [];
  for (let i = 0; i <= PEDACOS; i += 1) {
    raios.push(inicio + ((g.topo - inicio) * i) / PEDACOS);
  }
  const meioNoTopo = Math.max(anguloDoFlanco(g.topo), passo * 0.02);
  const meioNoInicio = anguloDoFlanco(inicio);

  const contorno = [];
  const ponto = (raio, angulo) => contorno.push([raio * Math.cos(angulo), raio * Math.sin(angulo)]);

  for (let dente = 0; dente < g.dentes; dente += 1) {
    const centro = dente * passo;

    // Pé do dente do lado de trás, e a subida radial até onde a involuta começa.
    if (inicio - g.raiz > 0.01) ponto(g.raiz, centro - meioNoInicio);
    // Flanco de trás, de dentro para fora.
    for (const raio of raios) ponto(raio, centro - anguloDoFlanco(raio));
    // Topo do dente: um arquinho, senão a ponta fica com cara de serra.
    ponto(g.topo, centro - meioNoTopo * 0.4);
    ponto(g.topo, centro + meioNoTopo * 0.4);
    // Flanco da frente, de fora para dentro.
    for (let i = raios.length - 1; i >= 0; i -= 1) {
      ponto(raios[i], centro + anguloDoFlanco(raios[i]));
    }
    if (inicio - g.raiz > 0.01) ponto(g.raiz, centro + meioNoInicio);
    // Vale entre este dente e o próximo.
    const valeDe = centro + meioNoInicio;
    const valeAte = centro + passo - meioNoInicio;
    if (valeAte > valeDe) {
      ponto(g.raiz, valeDe + (valeAte - valeDe) * 0.34);
      ponto(g.raiz, valeDe + (valeAte - valeDe) * 0.67);
    }
  }
  return contorno;
}

// --- os contornos das outras peças ---------------------------------------

function retangulo(largura, altura) {
  const x = largura / 2;
  const y = altura / 2;
  return [
    [-x, -y],
    [x, -y],
    [x, y],
    [-x, y],
  ];
}

function circunferencia(raio, lados = 48) {
  const pontos = [];
  for (let i = 0; i < lados; i += 1) {
    const a = (TAU * i) / lados;
    pontos.push([raio * Math.cos(a), raio * Math.sin(a)]);
  }
  return pontos;
}

function poligonoRegular(raio, lados) {
  const pontos = [];
  const giro = lados % 2 ? Math.PI / 2 : Math.PI / lados;
  for (let i = 0; i < lados; i += 1) {
    const a = giro + (TAU * i) / lados;
    pontos.push([raio * Math.cos(a), raio * Math.sin(a)]);
  }
  return pontos;
}

// A barra com furos, que é a peça mais usada de qualquer kit: dois furos nas
// pontas e alguns no meio. Os furos aqui são marcas de desenho, não buracos de
// colisão — o pino do aluno pode cair em qualquer lugar da peça, e marcar os
// lugares "certinhos" só ajuda ele a mirar.
export function furosDaBarra(comprimento, largura) {
  const passo = Math.max(10, Math.min(20, largura));
  const sobra = Math.max(passo * 0.6, largura * 0.55);
  const vao = comprimento - sobra * 2;
  if (vao <= 0) return [[0, 0]];
  const quantos = Math.max(1, Math.round(vao / passo));
  const furos = [];
  for (let i = 0; i <= quantos; i += 1) {
    furos.push([-comprimento / 2 + sobra + (vao * i) / quantos, 0]);
  }
  return furos;
}

export function contornoDaForma(forma) {
  if (!forma) return [];
  switch (forma.tipo) {
    case "retangulo":
      return retangulo(forma.largura, forma.altura);
    case "circulo":
      return circunferencia(forma.raio);
    case "poligono":
      return forma.lados ? poligonoRegular(forma.raio, forma.lados) : (forma.pontos || []);
    case "contorno":
      return forma.pontos || [];
    case "engrenagem":
      return contornoDaEngrenagem(forma.dentes, forma.modulo);
    default:
      return [];
  }
}

// --- o que colide --------------------------------------------------------

export function areaDoContorno(pontos) {
  let soma = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[(i + 1) % pontos.length];
    soma += x1 * y2 - x2 * y1;
  }
  return Math.abs(soma) / 2;
}

export function sentidoAntiHorario(pontos) {
  let soma = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[(i + 1) % pontos.length];
    soma += x1 * y2 - x2 * y1;
  }
  return soma > 0 ? pontos : [...pontos].reverse();
}

export function limitesDoContorno(pontos) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pontos) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, largura: 0, altura: 0 };
  return { minX, minY, maxX, maxY, largura: maxX - minX, altura: maxY - minY };
}

// O casco convexo, para a colisão simplificada: a peça vira a sombra dela
// mesma esticada. Um "C" vira uma banana cheia, e é por isso que existe a
// opção de colisão exata.
export function cascoConvexo(pontos) {
  const lista = [...pontos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (lista.length < 3) return lista;
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const baixo = [];
  for (const p of lista) {
    while (baixo.length >= 2 && cruz(baixo[baixo.length - 2], baixo[baixo.length - 1], p) <= 0) baixo.pop();
    baixo.push(p);
  }
  const alto = [];
  for (let i = lista.length - 1; i >= 0; i -= 1) {
    const p = lista[i];
    while (alto.length >= 2 && cruz(alto[alto.length - 2], alto[alto.length - 1], p) <= 0) alto.pop();
    alto.push(p);
  }
  baixo.pop();
  alto.pop();
  return baixo.concat(alto);
}

// O Box2D só aceita forma de colisão convexa e com poucos pontos. Um contorno
// com 400 pontos vindo de um SVG precisa perder gordura antes de virar
// colisão, senão o navegador engasga. Este é o algoritmo de
// Ramer–Douglas–Peucker, que joga fora o ponto que está quase em cima da
// linha entre os vizinhos.
export function simplificarContorno(pontos, tolerancia = 0.6) {
  if (pontos.length < 4) return pontos;
  const distancia = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const comprimento = Math.hypot(dx, dy);
    if (comprimento < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    return Math.abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / comprimento;
  };
  const guardar = (de, ate, saida) => {
    let pior = 0;
    let onde = -1;
    for (let i = de + 1; i < ate; i += 1) {
      const d = distancia(pontos[i], pontos[de], pontos[ate]);
      if (d > pior) {
        pior = d;
        onde = i;
      }
    }
    if (pior > tolerancia && onde > 0) {
      guardar(de, onde, saida);
      saida.push(pontos[onde]);
      guardar(onde, ate, saida);
    }
  };
  const saida = [pontos[0]];
  guardar(0, pontos.length - 1, saida);
  saida.push(pontos[pontos.length - 1]);
  return saida;
}

// Reparte um polígono convexo grande em leques de no máximo `maximo` pontos,
// porque o Box2D não aceita mais do que isso por forma.
function repartirConvexo(pontos, maximo = 8) {
  if (pontos.length <= maximo) return [pontos];
  const partes = [];
  let i = 0;
  while (i < pontos.length - 1) {
    const fatia = [pontos[0]];
    for (let k = 0; k < maximo - 1 && i + k < pontos.length; k += 1) {
      fatia.push(pontos[i + k + 1] || pontos[pontos.length - 1]);
    }
    const limpa = fatia.filter(Boolean);
    if (limpa.length >= 3) partes.push(limpa);
    i += maximo - 2;
  }
  return partes.length ? partes : [pontos.slice(0, maximo)];
}

// O contorno virando uma lista de polígonos convexos, prontos para o motor.
// `decomp` é a biblioteca poly-decomp, que só é passada quando a colisão é
// exata; sem ela (ou com contorno já convexo) o casco resolve.
export function partesConvexas(pontos, { exata = false, decomp = null, maximo = 8 } = {}) {
  const limpo = simplificarContorno(sentidoAntiHorario(pontos), 0.6);
  if (limpo.length < 3) return [];
  if (!exata || !decomp) return repartirConvexo(cascoConvexo(limpo), maximo);

  const copia = limpo.map(([x, y]) => [x, y]);
  try {
    decomp.makeCCW(copia);
    decomp.removeCollinearPoints(copia, 0.02);
    const pedacos = decomp.quickDecomp(copia) || [];
    const saida = [];
    for (const pedaco of pedacos) {
      if (!pedaco || pedaco.length < 3) continue;
      if (areaDoContorno(pedaco) < 0.5) continue;
      saida.push(...repartirConvexo(pedaco, maximo));
    }
    if (saida.length) return saida;
  } catch (erro) {
    console.warn("Não consegui repartir o contorno; usando o casco.", erro);
  }
  return repartirConvexo(cascoConvexo(limpo), maximo);
}

// Quando o contorno é complicado demais para a aula, vale avisar em vez de
// deixar o navegador travar calado.
export const PARTES_DEMAIS = 24;

export function complicadoDemais(partes) {
  return partes.length > PARTES_DEMAIS;
}

// As formas de colisão que o Planck precisa, já na régua da física.
// `planck` e `decomp` entram de fora para este arquivo poder ser testado sem
// navegador.
export function colisoesDaForma(forma, { planck, decomp = null, exata = false } = {}) {
  if (!planck) throw new Error("colisoesDaForma precisa do planck.");
  const { Box, Circle, Polygon, Vec2 } = planck;

  if (forma.tipo === "circulo") return [new Circle(mm(forma.raio))];
  if (forma.tipo === "engrenagem") {
    return [new Circle(mm(medidasDaEngrenagem(forma.dentes, forma.modulo).colisao))];
  }
  if (forma.tipo === "retangulo") {
    return [new Box(mm(forma.largura) / 2, mm(forma.altura) / 2)];
  }

  const contorno = contornoDaForma(forma);
  if (contorno.length < 3) return [];
  const partes = partesConvexas(contorno, { exata, decomp, maximo: 8 });
  return partes
    .map((parte) => parte.map(([x, y]) => new Vec2(x * POR_MILIMETRO, y * POR_MILIMETRO)))
    .filter((parte) => parte.length >= 3)
    .map((parte) => new Polygon(parte));
}

// O mesmo cálculo da colisão, mas em milímetros e sem precisar do motor de
// física. É o que a bancada desenha quando o aluno liga "visualizar colisões"
// — e ver isso é o que explica por que existe a opção de colisão exata: na
// simplificada, o vão do "C" aparece preenchido.
export function esbocoDaColisao(forma, { exata = false, decomp = null } = {}) {
  if (!forma) return [];
  if (forma.tipo === "circulo") return [{ tipo: "circulo", raio: forma.raio }];
  if (forma.tipo === "engrenagem") {
    return [{ tipo: "circulo", raio: medidasDaEngrenagem(forma.dentes, forma.modulo).colisao }];
  }
  if (forma.tipo === "retangulo") {
    return [{ tipo: "poligono", pontos: retangulo(forma.largura, forma.altura) }];
  }
  const contorno = contornoDaForma(forma);
  if (contorno.length < 3) return [];
  return partesConvexas(contorno, { exata, decomp, maximo: 8 }).map((pontos) => ({
    tipo: "poligono",
    pontos,
  }));
}

// --- o catálogo de peças -------------------------------------------------
//
// A ordem aqui é a ordem do menu. Primeiro o que serve para montar alavanca e
// braço (barra, placa), depois o que gira (disco, roda, engrenagem), depois o
// que fica parado (sólido).

export const PECAS = Object.freeze([
  {
    id: "barra",
    nome: "Barra",
    icone: "pecaBarra",
    dica: "A peça de todo mecanismo: alavanca, braço, biela. Os furinhos são só mira para o pino.",
    criar: () => ({
      forma: { tipo: "retangulo", largura: 120, altura: 14 },
      material: "madeira",
      campos: ["largura", "altura"],
    }),
  },
  {
    id: "placa",
    nome: "Placa",
    icone: "pecaPlaca",
    dica: "Chassi, base de motor, plataforma. Serve para pregar o resto em cima.",
    criar: () => ({
      forma: { tipo: "retangulo", largura: 90, altura: 60 },
      material: "madeira",
      campos: ["largura", "altura"],
    }),
  },
  {
    id: "triangulo",
    nome: "Triângulo",
    icone: "pecaTriangulo",
    dica: "Reforço de canto e dente de catraca. Triângulo é a forma que não torce.",
    criar: () => ({
      forma: { tipo: "poligono", raio: 45, lados: 3 },
      material: "madeira",
      campos: ["raio"],
    }),
  },
  {
    id: "disco",
    nome: "Disco",
    icone: "pecaDisco",
    dica: "Volante, came, polia. Com o pino fora do centro, vira excêntrico.",
    criar: () => ({
      forma: { tipo: "circulo", raio: 35 },
      material: "madeira",
      campos: ["raio"],
    }),
  },
  {
    id: "roda",
    nome: "Roda",
    icone: "pecaRoda",
    dica: "Disco com borracha: agarra muito mais no chão. É a roda do carrinho.",
    criar: () => ({
      forma: { tipo: "circulo", raio: 40 },
      material: "madeira",
      atrito: 1.1,
      quique: 0.1,
      borracha: true,
      campos: ["raio"],
    }),
  },
  {
    id: "engrenagem",
    nome: "Engrenagem",
    icone: "pecaEngrenagem",
    dica: "Dente de involuta de verdade, do jeito que sai na cortadora. A razão é garantida pela junta.",
    criar: () => ({
      forma: { tipo: "engrenagem", dentes: 20, modulo: 4 },
      material: "madeira",
      campos: ["dentes", "modulo"],
    }),
  },
  {
    id: "solido",
    nome: "Sólido",
    icone: "pecaSolido",
    dica: "Chão, parede, pilar. Já nasce ancorado: não cai e não sai do lugar.",
    criar: () => ({
      forma: { tipo: "retangulo", largura: 600, altura: 60 },
      material: "metal",
      fixado: true,
      tijolos: true,
      campos: ["largura", "altura"],
    }),
  },
]);

export function pecaDoCatalogo(id) {
  return PECAS.find((peca) => peca.id === id) || null;
}

// Quanto a peça mede, para a bancada mostrar e para enquadrar a câmera.
export function medidasDaForma(forma) {
  if (forma.tipo === "circulo") {
    return { largura: forma.raio * 2, altura: forma.raio * 2, raio: forma.raio };
  }
  if (forma.tipo === "engrenagem") {
    const g = medidasDaEngrenagem(forma.dentes, forma.modulo);
    return { largura: g.topo * 2, altura: g.topo * 2, raio: g.topo };
  }
  if (forma.tipo === "retangulo") {
    return {
      largura: forma.largura,
      altura: forma.altura,
      raio: Math.hypot(forma.largura, forma.altura) / 2,
    };
  }
  const limites = limitesDoContorno(contornoDaForma(forma));
  return {
    largura: limites.largura,
    altura: limites.altura,
    raio: Math.max(Math.abs(limites.minX), Math.abs(limites.maxX), Math.abs(limites.minY), Math.abs(limites.maxY)),
  };
}

export function areaDaForma(forma) {
  if (forma.tipo === "circulo") return Math.PI * forma.raio * forma.raio;
  if (forma.tipo === "retangulo") return forma.largura * forma.altura;
  if (forma.tipo === "engrenagem") {
    const g = medidasDaEngrenagem(forma.dentes, forma.modulo);
    // Área do primitivo: o dente põe tanto quanto o vale tira, então o
    // primitivo é uma média honesta e evita somar 400 pontos de contorno.
    return Math.PI * g.primitivo * g.primitivo;
  }
  return areaDoContorno(contornoDaForma(forma));
}
