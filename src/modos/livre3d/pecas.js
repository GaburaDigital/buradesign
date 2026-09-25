// Peças do modo 3D: criar, refazer quando um parâmetro muda, pintar, marcar
// como negativa e combinar. A combinação usa booleana de verdade, então o
// resultado é uma peça nova, pronta para imprimir.

import * as THREE from "three";
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from "three-bvh-csg";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { cena3d, paleta3d, encaixar } from "./cena.js";
import {
  geometriaDe,
  parametrosPadrao,
  DEFINICOES,
  aplicarUVsDeCaixa,
  garantirOrientacao,
} from "./solidos.js";

export const CORES_PECA = [
  "#7fb3d5",
  "#8fd19e",
  "#f2d06b",
  "#e8a598",
  "#c5a6e0",
  "#9fd8d2",
  "#d9d9d9",
];

export const NEGATIVO = "#ff9f43";
export const TEXTURAS = [
  { id: "nenhuma", rotulo: "Lisa" },
  { id: "xadrez", rotulo: "Xadrez" },
  { id: "linhas", rotulo: "Linhas suaves" },
  { id: "isopor", rotulo: "Isopor" },
];

const cacheDeTextura = new Map();
const avaliador = new Evaluator();
avaliador.attributes = ["position", "normal"];

function textura(tipo) {
  if (tipo === "nenhuma" || !tipo) return null;
  if (cacheDeTextura.has(tipo)) return cacheDeTextura.get(tipo);

  const tela = document.createElement("canvas");
  tela.width = 128;
  tela.height = 128;
  const pincel = tela.getContext("2d");
  pincel.fillStyle = "#ffffff";
  pincel.fillRect(0, 0, 128, 128);

  if (tipo === "xadrez") {
    pincel.fillStyle = "rgba(0,0,0,0.14)";
    for (let x = 0; x < 128; x += 16) {
      for (let y = 0; y < 128; y += 16) {
        if (((x / 16) + (y / 16)) % 2 === 0) pincel.fillRect(x, y, 16, 16);
      }
    }
  } else if (tipo === "linhas") {
    pincel.strokeStyle = "rgba(0,0,0,0.12)";
    pincel.lineWidth = 3;
    for (let y = 0; y < 128; y += 10) {
      pincel.beginPath();
      pincel.moveTo(0, y);
      pincel.lineTo(128, y);
      pincel.stroke();
    }
  } else if (tipo === "isopor") {
    for (let i = 0; i < 900; i += 1) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const raio = 1 + Math.random() * 2.6;
      pincel.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.07})`;
      pincel.beginPath();
      pincel.arc(x, y, raio, 0, Math.PI * 2);
      pincel.fill();
    }
  }

  const mapa = new THREE.CanvasTexture(tela);
  mapa.wrapS = THREE.RepeatWrapping;
  mapa.wrapT = THREE.RepeatWrapping;
  // As UVs já vêm em milímetros, então um ladrilho por unidade de UV.
  mapa.repeat.set(1, 1);
  cacheDeTextura.set(tipo, mapa);
  return mapa;
}

export function material(cor, tipoTextura, negativo, selecionada) {
  const base = new THREE.Color(negativo ? NEGATIVO : cor);
  if (selecionada) base.lerp(new THREE.Color(paleta3d().guia), 0.45);
  return new THREE.MeshStandardMaterial({
    color: base,
    emissive: new THREE.Color(selecionada ? paleta3d().guia : 0x000000),
    emissiveIntensity: selecionada ? 0.35 : 0,
    map: textura(tipoTextura),
    roughness: 0.72,
    metalness: 0.03,
    transparent: Boolean(negativo),
    opacity: negativo ? 0.55 : 1,
    flatShading: false,
  });
}

export function proximaCor() {
  const usados = cena3d.grupoPecas ? cena3d.grupoPecas.children.length : 0;
  return CORES_PECA[usados % CORES_PECA.length];
}

export function vestir(peca) {
  const dados = peca.userData;
  peca.material?.dispose?.();
  peca.material = material(dados.cor, dados.textura, dados.negativo, dados.selecionada);
  pintarContorno(
    peca,
    dados.selecionada ? paleta3d().guia : dados.negativo ? 0xe03131 : paleta3d().borda,
    Boolean(dados.selecionada),
  );
  return peca;
}

// Peça selecionada muda de cor e ganha contorno forte, para ficar evidente
// em qualquer ângulo, não só pela marca no chão.
export function destacar(selecionadas) {
  const marcadas = new Set(selecionadas || []);
  for (const peca of cena3d.grupoPecas.children) {
    const antes = Boolean(peca.userData.selecionada);
    const agora = marcadas.has(peca);
    if (antes === agora) continue;
    peca.userData.selecionada = agora;
    vestir(peca);
  }
}

// Linha com espessura de verdade. A linha comum do WebGL ignora a grossura
// pedida, então as arestas usam a linha "gorda" do Three.js.
export function linhaGrossa(posicoes, cor, grossuraEmPixels, opacidade = 1) {
  const geometria = new LineSegmentsGeometry();
  geometria.setPositions(posicoes);
  const material = new LineMaterial({
    color: new THREE.Color(cor).getHex(),
    linewidth: grossuraEmPixels,
    transparent: opacidade < 1,
    opacity: opacidade,
    worldUnits: false,
    depthTest: true,
  });
  material.resolution.set(resolucao.x, resolucao.y);
  const linha = new LineSegments2(geometria, material);
  linha.computeLineDistances();
  return linha;
}

const resolucao = new THREE.Vector2(1280, 720);

export function atualizarResolucaoDasLinhas(largura, altura) {
  if (!largura || !altura) return;
  resolucao.set(largura, altura);
  cena3d.cena?.traverse((filho) => {
    if (filho.material && filho.material.isLineMaterial) {
      filho.material.resolution.set(largura, altura);
    }
  });
}

function posicoesDasArestas(geometria, limite) {
  const arestas = new THREE.EdgesGeometry(geometria, limite);
  const lista = Array.from(arestas.attributes.position.array);
  arestas.dispose();
  return lista;
}

// --- Contorno das peças rígidas ---------------------------------------
//
// O EdgesGeometry do Three desenha toda aresta que não encontra par. Depois
// de uma booleana isso é um desastre: a peça sai cheia de junções em T (um
// vértice no meio da aresta do vizinho), e cada uma vira um risco atravessando
// uma superfície que devia ser lisa. Era o "vidro quebrado" que os alunos
// viam ao combinar peças.
//
// Aqui o contorno é calculado por regiões planas: só vira linha a aresta que
// separa dois planos diferentes. Uma aresta sem par só é desenhada se do outro
// lado dela não houver mais superfície no mesmo plano — ou seja, se for de
// verdade a beirada da peça.

const CASAS = 3;
const chaveDoPonto = (v) => `${v.x.toFixed(CASAS)},${v.y.toFixed(CASAS)},${v.z.toFixed(CASAS)}`;

// Junta os triângulos em planos. Comparar chave de texto não serve: um
// "-0.00" contra um "0.00" separava faces que estão no mesmo plano, e a
// aresta entre elas voltava a virar risco. Aqui a comparação é numérica,
// com folga, e a lista de planos de uma peça é sempre curta.
function agruparEmPlanos(normais, cantos) {
  const planos = [];
  const deCadaFace = new Array(normais.length).fill(-1);
  for (let f = 0; f < normais.length; f += 1) {
    const normal = normais[f];
    if (!normal) continue;
    const distancia = normal.dot(cantos[f][0]);
    let achou = -1;
    for (let p = 0; p < planos.length; p += 1) {
      if (planos[p].normal.dot(normal) > 0.9995 && Math.abs(planos[p].distancia - distancia) < 0.02) {
        achou = p;
        break;
      }
    }
    if (achou === -1) {
      achou = planos.length;
      planos.push({ normal: normal.clone(), distancia, faces: [] });
    }
    planos[achou].faces.push(f);
    deCadaFace[f] = achou;
  }
  return { planos, deCadaFace };
}

function trianguloContem(a, b, c, ponto) {
  const v0 = new THREE.Vector3().subVectors(c, a);
  const v1 = new THREE.Vector3().subVectors(b, a);
  const v2 = new THREE.Vector3().subVectors(ponto, a);
  const d00 = v0.dot(v0);
  const d01 = v0.dot(v1);
  const d02 = v0.dot(v2);
  const d11 = v1.dot(v1);
  const d12 = v1.dot(v2);
  const base = d00 * d11 - d01 * d01;
  if (Math.abs(base) < 1e-12) return false;
  const u = (d11 * d02 - d01 * d12) / base;
  const v = (d00 * d12 - d01 * d02) / base;
  return u >= -1e-4 && v >= -1e-4 && u + v <= 1 + 1e-4;
}

export function arestasDeVinco(geometria, grausLimite = 25) {
  const plana = geometria.index ? geometria.toNonIndexed() : geometria;
  const posicoes = plana.attributes.position;
  const total = Math.floor(posicoes.count / 3);
  if (!total) return [];

  const cantos = [];
  const normais = [];
  const porAresta = new Map();

  for (let f = 0; f < total; f += 1) {
    const i = f * 3;
    const pontos = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(posicoes, i + k));
    cantos.push(pontos);
    const normal = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(pontos[1], pontos[0]),
      new THREE.Vector3().subVectors(pontos[2], pontos[0]),
    );
    // Triângulo degenerado: a booleana deixa alguns e eles não têm contorno.
    normais.push(normal.lengthSq() < 1e-14 ? null : normal.normalize());

    const chaves = pontos.map(chaveDoPonto);
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const id = [chaves[a], chaves[b]].sort().join("|");
      if (!porAresta.has(id)) porAresta.set(id, { faces: [], pontos: [pontos[a], pontos[b]] });
      porAresta.get(id).faces.push(f);
    }
  }

  const { planos, deCadaFace } = agruparEmPlanos(normais, cantos);
  const limite = Math.cos((grausLimite * Math.PI) / 180);
  const lista = [];

  // Uma aresta sem par continua sendo desenhada quando é mesmo a beirada da
  // peça. Para saber, damos um passinho para fora dela, dentro do plano, e
  // perguntamos se ainda existe superfície ali.
  const eBeirada = (aresta) => {
    const face = aresta.faces[0];
    const plano = planos[deCadaFace[face]];
    if (!plano || plano.faces.length > 800) return true;
    const [a, b] = aresta.pontos;
    const meio = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const direcao = new THREE.Vector3().subVectors(b, a);
    if (direcao.lengthSq() < 1e-12) return false;
    direcao.normalize();
    const paraFora = new THREE.Vector3().crossVectors(normais[face], direcao).normalize();
    // Qual lado é "fora"? O contrário de onde está o terceiro canto da face.
    const terceiro = cantos[face].find(
      (ponto) => ponto.distanceToSquared(a) > 1e-8 && ponto.distanceToSquared(b) > 1e-8,
    );
    if (terceiro && paraFora.dot(new THREE.Vector3().subVectors(terceiro, meio)) > 0) {
      paraFora.negate();
    }
    const sonda = meio.addScaledVector(paraFora, 0.01);
    for (const outra of plano.faces) {
      if (outra === face) continue;
      const [p, q, r] = cantos[outra];
      if (trianguloContem(p, q, r, sonda)) return false;
    }
    return true;
  };

  for (const aresta of porAresta.values()) {
    const [a, b] = aresta.pontos;
    let desenha = false;
    if (aresta.faces.length === 1) {
      desenha = eBeirada(aresta);
    } else {
      // Faces do mesmo plano nunca viram linha, venham de onde vierem.
      const usados = new Set(aresta.faces.map((f) => deCadaFace[f]));
      if (usados.size > 1) {
        desenha = aresta.faces.some((f, i) =>
          aresta.faces.some(
            (g, j) => j > i && normais[f] && normais[g] && normais[f].dot(normais[g]) < limite,
          ),
        );
      }
    }
    // Caco de aresta com menos de um quarto de milímetro não é quina nenhuma:
    // é sujeira da booleana, e aparecia como pontinho solto sobre a peça.
    if (desenha && a.distanceToSquared(b) > 0.0625) lista.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  return lista;
}

// Cruz discreta no meio de cada face: é a marca visual da malha, e ajuda a
// mirar quando o aluno vai editar face por face.
function cruzesDasFaces(geometria, tamanhoRelativo = 0.3) {
  const plana = geometria.index ? geometria.toNonIndexed() : geometria;
  const posicoes = plana.attributes.position;
  const total = posicoes.count / 3;
  const chave = (i) =>
    `${posicoes.getX(i).toFixed(3)},${posicoes.getY(i).toFixed(3)},${posicoes.getZ(i).toFixed(3)}`;

  // Guarda, para cada aresta, quais triângulos a usam.
  const porAresta = new Map();
  const cantos = [];
  const normais = [];
  for (let f = 0; f < total; f += 1) {
    const i = f * 3;
    const pontos = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(posicoes, i + k));
    cantos.push(pontos);
    normais.push(
      new THREE.Vector3()
        .crossVectors(
          new THREE.Vector3().subVectors(pontos[1], pontos[0]),
          new THREE.Vector3().subVectors(pontos[2], pontos[0]),
        )
        .normalize(),
    );
    const chaves = [0, 1, 2].map((k) => chave(i + k));
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const id = [chaves[a], chaves[b]].sort().join("|");
      if (!porAresta.has(id)) porAresta.set(id, []);
      porAresta.get(id).push(f);
    }
  }

  // Junta os pares coplanares num quad só.
  const parceiro = new Array(total).fill(-1);
  for (const usos of porAresta.values()) {
    if (usos.length !== 2) continue;
    const [a, b] = usos;
    if (parceiro[a] !== -1 || parceiro[b] !== -1) continue;
    if (normais[a].dot(normais[b]) > 0.9995) {
      parceiro[a] = b;
      parceiro[b] = a;
    }
  }

  const lista = [];
  const jaFeito = new Set();
  for (let f = 0; f < total; f += 1) {
    if (jaFeito.has(f)) continue;
    const par = parceiro[f];
    const pontos = [...cantos[f]];
    if (par !== -1) {
      jaFeito.add(par);
      for (const ponto of cantos[par]) {
        if (!pontos.some((outro) => outro.distanceToSquared(ponto) < 1e-6)) pontos.push(ponto);
      }
    }
    jaFeito.add(f);

    const centro = new THREE.Vector3();
    for (const ponto of pontos) centro.add(ponto);
    centro.divideScalar(pontos.length);

    let menor = Infinity;
    for (const ponto of pontos) menor = Math.min(menor, ponto.distanceTo(centro));
    const tamanho = menor * tamanhoRelativo * 2;
    if (tamanho < 0.05) continue;

    const eixo1 = new THREE.Vector3().subVectors(cantos[f][1], cantos[f][0]).normalize();
    const eixo2 = new THREE.Vector3().crossVectors(eixo1, normais[f]).normalize();
    const a = eixo1.multiplyScalar(tamanho);
    const b = eixo2.multiplyScalar(tamanho);
    lista.push(
      ...centro.clone().sub(a).toArray(), ...centro.clone().add(a).toArray(),
      ...centro.clone().sub(b).toArray(), ...centro.clone().add(b).toArray(),
    );
  }
  return lista;
}

function comContorno(peca) {
  const malha = peca.userData?.modo === "malha";
  const tons = paleta3d();
  const grupo = new THREE.Group();
  grupo.name = "contorno";

  // Peça rígida: só os vincos de verdade, com traço triplo — nada de riscos
  // atravessando superfície lisa. Malha: todas as arestas finas, mais a cruz
  // no meio das faces.
  const arestas = malha
    ? posicoesDasArestas(peca.geometry, 1)
    : arestasDeVinco(peca.geometry, 25);
  if (arestas.length) {
    grupo.add(linhaGrossa(arestas, tons.borda, malha ? 2.5 : 3, malha ? 0.95 : 0.9));
  }
  if (malha) {
    const cruzes = cruzesDasFaces(peca.geometry);
    if (cruzes.length) grupo.add(linhaGrossa(cruzes, tons.borda, 2, 0.8));
  }
  peca.add(grupo);
  return peca;
}

// Repinta o contorno sem refazer a geometria.
function pintarContorno(peca, cor, forte) {
  const grupo = peca.getObjectByName("contorno");
  if (!grupo) return;
  grupo.traverse((filho) => {
    if (!filho.material || !filho.material.isLineMaterial) return;
    filho.material.color.set(cor);
    filho.material.opacity = forte ? 1 : filho.material.opacity;
  });
}

// Caixa da peça contando só a forma dela.
//
// O setFromObject do Three mede os filhos junto, e a peça carrega contorno e,
// em modo malha, os pontos. Já aconteceu de uma peça editada "crescer" quase
// dois milímetros por causa disso — e o tamanho errado ia parar no ajuste de
// altura e na nota do desafio. Aqui a medida é da geometria, e ponto.
export function caixaDaPeca(peca, alvo = new THREE.Box3()) {
  peca.updateMatrixWorld(true);
  const geometria = peca.geometry;
  if (!geometria) return alvo.makeEmpty();
  geometria.computeBoundingBox();
  return alvo.copy(geometria.boundingBox).applyMatrix4(peca.matrixWorld);
}

// Pousa a peça na base: sobe o que estiver afundado e baixa o que estiver
// flutuando. Antes só subia, e por isso o botão parecia não funcionar.
export function pousarNaBase(peca) {
  const caixa = caixaDaPeca(peca);
  if (!Number.isFinite(caixa.min.y)) return peca;
  peca.position.y -= caixa.min.y;
  peca.updateMatrixWorld(true);
  return peca;
}

// A peça está encostando na base?
export function estaNaBase(peca, folga = 0.4) {
  return caixaDaPeca(peca).min.y <= folga;
}

// Sombra da área apoiada, para o aluno enxergar onde a peça encosta.
export function marcaDeContato() {
  if (!cena3d.grupoBase) return null;
  let marca = cena3d.grupoBase.getObjectByName("contato");
  if (!marca) {
    marca = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: paleta3d().guia,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    marca.name = "contato";
    marca.rotation.x = -Math.PI / 2;
    marca.visible = false;
    cena3d.grupoBase.add(marca);
  }
  return marca;
}

export function atualizarMarcaDeContato(pecas) {
  const marca = marcaDeContato();
  if (!marca) return;
  const apoiadas = (pecas || []).filter((peca) => estaNaBase(peca));
  if (!apoiadas.length) {
    marca.visible = false;
    return;
  }
  const caixa = new THREE.Box3();
  for (const peca of apoiadas) caixa.expandByObject(peca);
  const tamanho = caixa.getSize(new THREE.Vector3());
  const centro = caixa.getCenter(new THREE.Vector3());
  marca.scale.set(Math.max(0.5, tamanho.x), Math.max(0.5, tamanho.z), 1);
  marca.position.set(centro.x, 0.12, centro.z);
  marca.material.color.set(paleta3d().guia);
  marca.visible = true;
}

export function esconderMarcaDeContato() {
  const marca = cena3d.grupoBase?.getObjectByName("contato");
  if (marca) marca.visible = false;
}

export function criar(tipo, params) {
  const dados = { ...parametrosPadrao(tipo), ...(params || {}) };
  const geometria = geometriaDe(tipo, dados);
  if (!geometria) return null;
  const peca = new THREE.Mesh(geometria, material(proximaCor(), "nenhuma", false));
  peca.userData = {
    tipo,
    params: dados,
    cor: peca.material.color.getHexString ? `#${peca.material.color.getHexString()}` : proximaCor(),
    textura: "nenhuma",
    negativo: false,
    selecionada: false,
    nome: DEFINICOES[tipo] ? DEFINICOES[tipo].nome : "Peça",
  };
  comContorno(peca);
  const centro = new THREE.Vector3(cena3d.base.largura / 2, 0, cena3d.base.profundidade / 2);
  peca.position.set(encaixar(centro.x), 0, encaixar(centro.z));
  cena3d.grupoPecas.add(peca);
  pousarNaBase(peca);
  return peca;
}

export function regerar(peca, novosParams) {
  const dados = peca.userData;
  if (!DEFINICOES[dados.tipo]) return peca;
  const params = { ...dados.params, ...novosParams };
  // Medida pedida é medida final: a escala herdada de um arraste anterior
  // zera aqui, senão 20 mm digitado virava 20 vezes a escala.
  peca.scale.set(1, 1, 1);
  const geometria = geometriaDe(dados.tipo, params);
  if (!geometria) return peca;
  peca.geometry.dispose();
  peca.geometry = geometria;
  dados.params = params;
  trocarContorno(peca);
  pousarNaBase(peca);
  return peca;
}

export function marcarNegativo(pecas, ligado) {
  for (const peca of pecas) {
    peca.userData.negativo = ligado;
    vestir(peca);
  }
}

export function podeCombinar(pecas) {
  return pecas.length >= 2;
}

// Combina: soma as positivas e subtrai as negativas. Devolve uma peça nova e
// guarda as originais, para o botão de desunir poder voltar atrás.
export function combinar(pecas) {
  if (!podeCombinar(pecas)) return null;
  const positivas = pecas.filter((peca) => !peca.userData.negativo);
  const negativas = pecas.filter((peca) => peca.userData.negativo);
  if (!positivas.length) return null;

  const memoria = pecas.map((peca) => serializar(peca));
  const comoBrush = (peca) => {
    peca.updateMatrixWorld(true);
    const escova = new Brush(peca.geometry.clone());
    escova.applyMatrix4(peca.matrixWorld);
    escova.updateMatrixWorld(true);
    return escova;
  };

  let resultado = comoBrush(positivas[0]);
  for (let i = 1; i < positivas.length; i += 1) {
    resultado = avaliador.evaluate(resultado, comoBrush(positivas[i]), ADDITION);
    resultado.updateMatrixWorld(true);
  }
  for (const negativa of negativas) {
    resultado = avaliador.evaluate(resultado, comoBrush(negativa), SUBTRACTION);
    resultado.updateMatrixWorld(true);
  }

  const geometria = resultado.geometry.clone();
  geometria.computeVertexNormals();
  // A booleana devolve a peça em coordenadas do mundo, com a origem lá no
  // canto da base. Centramos a geometria e levamos o objeto até o centro,
  // senão a garra aparece longe da peça.
  geometria.computeBoundingBox();
  const centro = geometria.boundingBox.getCenter(new THREE.Vector3());
  geometria.translate(-centro.x, -centro.y, -centro.z);
  aplicarUVsDeCaixa(geometria);
  const dados = positivas[0].userData;
  const nova = new THREE.Mesh(geometria, material(dados.cor, dados.textura, false));
  nova.userData = {
    tipo: "combinada",
    params: {},
    cor: dados.cor,
    textura: dados.textura,
    negativo: false,
    nome: "Peça combinada",
    origem: memoria,
  };
  nova.position.copy(centro);
  comContorno(nova);
  cena3d.grupoPecas.add(nova);
  for (const peca of pecas) remover(peca);
  return nova;
}

// --- Estilete ----------------------------------------------------------
// O corte usa uma caixa gigante encostada no plano escolhido: o que fica de
// um lado é subtraído, o que fica do outro é a interseção. Com isso saem as
// duas metades exatas da peça.

export const EIXOS_DE_CORTE = [
  { id: "y", rotulo: "Horizontal (deitado)", normal: [0, 1, 0] },
  { id: "x", rotulo: "Vertical (esquerda e direita)", normal: [1, 0, 0] },
  { id: "z", rotulo: "Vertical (frente e trás)", normal: [0, 0, 1] },
  { id: "diagonalDireita", rotulo: "Diagonal para a direita", normal: [1, 1, 0] },
  { id: "diagonalEsquerda", rotulo: "Diagonal para a esquerda", normal: [-1, 1, 0] },
  { id: "diagonalFrente", rotulo: "Diagonal para a frente", normal: [0, 1, 1] },
  { id: "diagonalTras", rotulo: "Diagonal para trás", normal: [0, 1, -1] },
];

// Direção do plano de corte, já com o ângulo fino aplicado.
export function normalDoCorte(eixo, anguloEmGraus = 0) {
  const ficha = EIXOS_DE_CORTE.find((item) => item.id === eixo) || EIXOS_DE_CORTE[0];
  const normal = new THREE.Vector3(...ficha.normal).normalize();
  const angulo = (Number(anguloEmGraus) || 0) * (Math.PI / 180);
  if (angulo) {
    const deCima = Math.abs(normal.y) > 0.9;
    const giro = deCima ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    normal.applyAxisAngle(giro, angulo).normalize();
  }
  return normal;
}

// Folha translúcida atravessando a peça, para o aluno ver onde vai cortar
// antes de aplicar.
export function mostrarPlanoDeCorte(peca, { eixo = "y", deslocamento = 0, angulo = 0 } = {}) {
  if (!peca || !cena3d.cena) return null;
  peca.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(peca);
  const centro = caixa.getCenter(new THREE.Vector3());
  const tamanho = caixa.getSize(new THREE.Vector3());
  const lado = Math.max(tamanho.x, tamanho.y, tamanho.z) * 1.7 + 6;

  let plano = cena3d.cena.getObjectByName("planoDeCorte");
  if (!plano) {
    plano = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: paleta3d().guia,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    plano.name = "planoDeCorte";
    const borda = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)),
      new THREE.LineBasicMaterial({ color: paleta3d().guia }),
    );
    borda.name = "bordaDoCorte";
    plano.add(borda);
    cena3d.cena.add(plano);
  }

  const normal = normalDoCorte(eixo, angulo);
  plano.scale.set(lado, lado, 1);
  plano.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  plano.position.copy(centro.clone().add(normal.clone().multiplyScalar(deslocamento)));
  plano.material.color.set(paleta3d().guia);
  plano.visible = true;
  return plano;
}

export function esconderPlanoDeCorte() {
  const plano = cena3d.cena?.getObjectByName("planoDeCorte");
  if (plano) plano.visible = false;
}

// --- Espelhar -----------------------------------------------------------

// Troca entre peça rígida e malha. Por enquanto muda só a aparência; a
// edição por vértice, aresta e face entra na próxima etapa.
// Tamanho absoluto: leva a peça exatamente à medida pedida, seja ela
// paramétrica, combinada ou importada.
export function definirTamanho(peca, eixo, milimetros) {
  peca.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(peca);
  const atual = caixa.getSize(new THREE.Vector3())[eixo];
  if (!Number.isFinite(atual) || atual < 0.0001) return peca;
  const fator = Math.max(0.01, milimetros) / atual;
  peca.scale[eixo] *= fator;
  peca.updateMatrixWorld(true);
  return peca;
}

export function tamanhoDe(peca) {
  peca.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(peca).getSize(new THREE.Vector3());
}

// Transformação relativa: soma ao que já existe, aceitando negativos.
export function transformarRelativo(lista, tipo, { x = 0, y = 0, z = 0 }) {
  for (const peca of lista) {
    if (tipo === "mover") {
      peca.position.add(new THREE.Vector3(x, y, z));
    } else if (tipo === "girar") {
      peca.rotation.set(
        peca.rotation.x + (x * Math.PI) / 180,
        peca.rotation.y + (y * Math.PI) / 180,
        peca.rotation.z + (z * Math.PI) / 180,
      );
    } else if (tipo === "escalar") {
      const tamanho = tamanhoDe(peca);
      const somar = (eixo, quanto) => {
        if (!quanto) return;
        const alvo = Math.max(0.2, tamanho[eixo] + quanto);
        definirTamanho(peca, eixo, alvo);
      };
      somar("x", x);
      somar("y", y);
      somar("z", z);
    }
    peca.updateMatrixWorld(true);
  }
  return lista;
}

export function alternarModo(lista, modo) {
  for (const peca of lista) {
    peca.userData.modo = modo === "malha" ? "malha" : "rigida";
    trocarContorno(peca);
  }
  return lista;
}

export function trocarContorno(peca) {
  const antigo = peca.getObjectByName("contorno");
  if (antigo) {
    antigo.traverse((filho) => {
      filho.geometry?.dispose?.();
      filho.material?.dispose?.();
    });
    peca.remove(antigo);
  }
  comContorno(peca);
  return peca;
}

export function espelhar(lista, eixo = "x") {
  for (const peca of lista) {
    const escala = { x: [-1, 1, 1], y: [1, -1, 1], z: [1, 1, -1] }[eixo] || [-1, 1, 1];
    peca.geometry.scale(...escala);
    garantirOrientacao(peca.geometry);
    aplicarUVsDeCaixa(peca.geometry);
    trocarContorno(peca);
  }
  return lista;
}

// --- Alinhar e distribuir ----------------------------------------------

function caixaDe(peca) {
  peca.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(peca);
}

export function alinhar(lista, onde) {
  if (lista.length < 2) return false;
  const geral = new THREE.Box3();
  for (const peca of lista) geral.union(caixaDe(peca));
  const centro = geral.getCenter(new THREE.Vector3());
  for (const peca of lista) {
    const caixa = caixaDe(peca);
    switch (onde) {
      case "esquerda": peca.position.x += geral.min.x - caixa.min.x; break;
      case "centroX": peca.position.x += centro.x - caixa.getCenter(new THREE.Vector3()).x; break;
      case "direita": peca.position.x += geral.max.x - caixa.max.x; break;
      case "frente": peca.position.z += geral.min.z - caixa.min.z; break;
      case "centroZ": peca.position.z += centro.z - caixa.getCenter(new THREE.Vector3()).z; break;
      case "tras": peca.position.z += geral.max.z - caixa.max.z; break;
      case "base": peca.position.y += geral.min.y - caixa.min.y; break;
      case "centroY": peca.position.y += centro.y - caixa.getCenter(new THREE.Vector3()).y; break;
      case "topo": peca.position.y += geral.max.y - caixa.max.y; break;
      default: break;
    }
  }
  return true;
}

export function distribuir(lista, eixo = "x") {
  if (lista.length < 3) return false;
  const chave = eixo === "z" ? "z" : eixo === "y" ? "y" : "x";
  const ordenadas = [...lista].sort(
    (a, b) => caixaDe(a).getCenter(new THREE.Vector3())[chave] - caixaDe(b).getCenter(new THREE.Vector3())[chave],
  );
  const inicio = caixaDe(ordenadas[0]).getCenter(new THREE.Vector3())[chave];
  const fim = caixaDe(ordenadas[ordenadas.length - 1]).getCenter(new THREE.Vector3())[chave];
  const passo = (fim - inicio) / (ordenadas.length - 1);
  ordenadas.forEach((peca, indice) => {
    if (indice === 0 || indice === ordenadas.length - 1) return;
    const atual = caixaDe(peca).getCenter(new THREE.Vector3())[chave];
    peca.position[chave] += inicio + passo * indice - atual;
  });
  return true;
}

function caixaDeCorte(peca, eixo, deslocamento, angulo) {
  peca.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(peca);
  const centro = caixa.getCenter(new THREE.Vector3());
  const tamanho = caixa.getSize(new THREE.Vector3());
  const lado = Math.max(tamanho.x, tamanho.y, tamanho.z) * 4 + 20;

  const normal = normalDoCorte(eixo, angulo);

  const faca = new Brush(new THREE.BoxGeometry(lado, lado, lado));
  // A caixa encosta no plano de corte: metade dela fica de um lado só.
  faca.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  const plano = centro.clone().add(normal.clone().multiplyScalar(deslocamento));
  faca.position.copy(plano.clone().add(normal.clone().multiplyScalar(lado / 2)));
  faca.updateMatrixWorld(true);
  return { faca, centro };
}

function malhaDe(geometria, modelo, sufixo) {
  geometria.computeVertexNormals();
  geometria.computeBoundingBox();
  const centro = geometria.boundingBox.getCenter(new THREE.Vector3());
  geometria.translate(-centro.x, -centro.y, -centro.z);
  aplicarUVsDeCaixa(geometria);
  const dados = modelo.userData;
  const nova = new THREE.Mesh(geometria, material(dados.cor, dados.textura, false, false));
  nova.userData = {
    tipo: "combinada",
    params: {},
    cor: dados.cor,
    textura: dados.textura,
    negativo: false,
    selecionada: false,
    nome: `${dados.nome}${sufixo}`,
  };
  nova.position.copy(centro);
  comContorno(nova);
  cena3d.grupoPecas.add(nova);
  return nova;
}

// tipo: "completo" mantém uma peça só com a marca do corte;
//       "separado" devolve duas peças independentes.
export function cortar(peca, { eixo = "y", deslocamento = 0, angulo = 0, tipo = "separado" } = {}) {
  if (!peca || !peca.geometry) return null;
  const { faca } = caixaDeCorte(peca, eixo, deslocamento, angulo);

  peca.updateMatrixWorld(true);
  const inteira = new Brush(peca.geometry.clone());
  inteira.applyMatrix4(peca.matrixWorld);
  inteira.updateMatrixWorld(true);

  const parteA = avaliador.evaluate(inteira, faca, SUBTRACTION);
  parteA.updateMatrixWorld(true);
  const geometriaA = parteA.geometry.clone();

  const inteiraDeNovo = new Brush(peca.geometry.clone());
  inteiraDeNovo.applyMatrix4(peca.matrixWorld);
  inteiraDeNovo.updateMatrixWorld(true);
  const parteB = avaliador.evaluate(inteiraDeNovo, faca, INTERSECTION);
  parteB.updateMatrixWorld(true);
  const geometriaB = parteB.geometry.clone();

  const vazia = (geometria) => !geometria.attributes.position || geometria.attributes.position.count < 9;
  if (vazia(geometriaA) || vazia(geometriaB)) return null;

  if (tipo === "separado") {
    const a = malhaDe(geometriaA, peca, " A");
    const b = malhaDe(geometriaB, peca, " B");
    remover(peca);
    return [a, b];
  }

  // Corte completo: as duas metades voltam juntas, com a linha do corte à
  // mostra, mas continuam uma peça só.
  const juntas = new THREE.BufferGeometry();
  const posicoes = [
    ...geometriaA.attributes.position.array,
    ...geometriaB.attributes.position.array,
  ];
  juntas.setAttribute("position", new THREE.Float32BufferAttribute(posicoes, 3));
  const inteiraNova = malhaDe(juntas, peca, " cortada");
  remover(peca);
  return [inteiraNova];
}

// Corte livre: o aluno desenha a região na tela e ela é vazada da peça, no
// eixo da câmera. Os pontos chegam já convertidos para o mundo, sobre um
// plano que passa pelo centro da peça e encara a câmera.
export function cortarLivre(peca, pontosNoMundo, camera, { separar = false } = {}) {
  if (!peca || !camera || !pontosNoMundo || pontosNoMundo.length < 3) return null;
  peca.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(peca);
  const centro = caixa.getCenter(new THREE.Vector3());
  const tamanho = caixa.getSize(new THREE.Vector3());
  const fundura = Math.max(tamanho.x, tamanho.y, tamanho.z) * 3 + 20;

  const frente = new THREE.Vector3();
  camera.getWorldDirection(frente);
  const direita = new THREE.Vector3().crossVectors(frente, camera.up).normalize();
  const cima = new THREE.Vector3().crossVectors(direita, frente).normalize();

  const forma = new THREE.Shape();
  pontosNoMundo.forEach((ponto, indice) => {
    const relativo = ponto.clone().sub(centro);
    const x = relativo.dot(direita);
    const y = relativo.dot(cima);
    if (indice === 0) forma.moveTo(x, y);
    else forma.lineTo(x, y);
  });
  forma.closePath();

  const geometria = new THREE.ExtrudeGeometry(forma, {
    depth: fundura,
    bevelEnabled: false,
    curveSegments: 6,
  });
  garantirOrientacao(geometria);

  const base = new THREE.Matrix4().makeBasis(direita, cima, frente.clone().negate());
  const faca = new Brush(geometria);
  faca.applyMatrix4(base);
  faca.position.copy(centro.clone().add(frente.clone().multiplyScalar(fundura / 2)));
  faca.updateMatrixWorld(true);

  const comoBrush = () => {
    const escova = new Brush(peca.geometry.clone());
    escova.applyMatrix4(peca.matrixWorld);
    escova.updateMatrixWorld(true);
    return escova;
  };

  const restante = avaliador.evaluate(comoBrush(), faca, SUBTRACTION);
  restante.updateMatrixWorld(true);
  const geometriaRestante = restante.geometry.clone();
  if (!geometriaRestante.attributes.position || geometriaRestante.attributes.position.count < 9) {
    return null;
  }

  let recorte = null;
  if (separar) {
    const dentro = avaliador.evaluate(comoBrush(), faca, INTERSECTION);
    dentro.updateMatrixWorld(true);
    const geometriaDentro = dentro.geometry.clone();
    if (geometriaDentro.attributes.position && geometriaDentro.attributes.position.count >= 9) {
      recorte = malhaDe(geometriaDentro, peca, " recorte");
    }
  }

  const sobra = malhaDe(geometriaRestante, peca, " cortada");
  remover(peca);
  return recorte ? [sobra, recorte] : [sobra];
}

// Extrusão de face: a região marcada é puxada para fora e as paredes laterais
// fecham o vão. Só para fora, nunca para dentro da peça.
export function extrudarFace(peca, triangulos, distancia = 5) {
  if (!peca || !triangulos || !triangulos.length) return false;
  const geometria = peca.geometry.index ? peca.geometry.toNonIndexed() : peca.geometry;
  if (geometria !== peca.geometry) {
    peca.geometry.dispose();
    peca.geometry = geometria;
  }
  const posicoes = geometria.attributes.position;
  const antigas = Array.from(posicoes.array);

  const chave = (x, y, z) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  const normal = new THREE.Vector3();
  const centroDaPeca = new THREE.Vector3();
  geometria.computeBoundingBox();
  geometria.boundingBox.getCenter(centroDaPeca);

  const movidos = new Map();
  const paredes = [];

  // Aresta que dois triângulos extrudados dividem fica por dentro do bloco
  // novo: levantar parede ali deixaria uma lâmina presa no meio da peça.
  const vezesNaBorda = new Map();
  for (const inicio of triangulos) {
    const p = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(posicoes, inicio + k));
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const id = [chave(p[a].x, p[a].y, p[a].z), chave(p[b].x, p[b].y, p[b].z)].sort().join("|");
      vezesNaBorda.set(id, (vezesNaBorda.get(id) || 0) + 1);
    }
  }

  for (const inicio of triangulos) {
    const pontos = [0, 1, 2].map((k) =>
      new THREE.Vector3().fromBufferAttribute(posicoes, inicio + k),
    );
    const daFace = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(pontos[1], pontos[0]),
        new THREE.Vector3().subVectors(pontos[2], pontos[0]),
      )
      .normalize();
    const centroDaFace = new THREE.Vector3().add(pontos[0]).add(pontos[1]).add(pontos[2]).divideScalar(3);
    // Garante que a extrusão sai da peça, e não entra nela.
    if (daFace.dot(new THREE.Vector3().subVectors(centroDaFace, centroDaPeca)) < 0) daFace.negate();
    normal.copy(daFace);

    const novos = pontos.map((ponto) => {
      const id = chave(ponto.x, ponto.y, ponto.z);
      if (!movidos.has(id)) movidos.set(id, ponto.clone().add(normal.clone().multiplyScalar(distancia)));
      return movidos.get(id);
    });

    for (let k = 0; k < 3; k += 1) {
      posicoes.setXYZ(inicio + k, novos[k].x, novos[k].y, novos[k].z);
    }
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const id = [
        chave(pontos[a].x, pontos[a].y, pontos[a].z),
        chave(pontos[b].x, pontos[b].y, pontos[b].z),
      ]
        .sort()
        .join("|");
      if ((vezesNaBorda.get(id) || 0) > 1) continue;
      paredes.push(
        ...pontos[a].toArray(), ...pontos[b].toArray(), ...novos[b].toArray(),
        ...pontos[a].toArray(), ...novos[b].toArray(), ...novos[a].toArray(),
      );
    }
  }

  const finais = Array.from(posicoes.array).concat(paredes);
  const nova = new THREE.BufferGeometry();
  nova.setAttribute("position", new THREE.Float32BufferAttribute(finais, 3));
  nova.computeVertexNormals();
  aplicarUVsDeCaixa(nova);
  peca.geometry.dispose();
  peca.geometry = nova;
  trocarContorno(peca);
  return true;
}

// Peça feita a partir de uma geometria pronta (texto 3D, por exemplo).
export function pecaDeGeometria(geometria, nome) {
  aplicarUVsDeCaixa(geometria);
  const peca = new THREE.Mesh(geometria, material(proximaCor(), "nenhuma", false, false));
  peca.userData = {
    tipo: "importada",
    params: {},
    cor: proximaCor(),
    textura: "nenhuma",
    negativo: false,
    selecionada: false,
    nome: nome || "Peça",
  };
  comContorno(peca);
  peca.position.set(cena3d.base.largura / 2, 0, cena3d.base.profundidade / 2);
  cena3d.grupoPecas.add(peca);
  pousarNaBase(peca);
  return peca;
}

export function podeDesunir(pecas) {
  return pecas.length === 1 && Array.isArray(pecas[0].userData.origem);
}

export function desunir(peca) {
  if (!podeDesunir([peca])) return null;
  const voltaram = peca.userData.origem.map((registro) => reconstruir(registro)).filter(Boolean);
  remover(peca);
  return voltaram;
}

export function remover(peca) {
  peca.geometry?.dispose?.();
  peca.material?.dispose?.();
  peca.parent?.remove(peca);
}

// --- Guardar e recuperar ----------------------------------------------

export function serializar(peca) {
  const dados = peca.userData;
  const registro = {
    tipo: dados.tipo,
    params: dados.params,
    cor: dados.cor,
    textura: dados.textura,
    negativo: dados.negativo,
    nome: dados.nome,
    posicao: peca.position.toArray(),
    giro: peca.rotation.toArray().slice(0, 3),
    escala: peca.scale.toArray(),
    origem: dados.origem,
  };
  if (dados.tipo === "combinada" || dados.tipo === "importada") {
    const g = peca.geometry.index ? peca.geometry.toNonIndexed() : peca.geometry;
    registro.vertices = Array.from(g.attributes.position.array).map(
      (numero) => Math.round(numero * 1000) / 1000,
    );
  }
  return registro;
}

export function reconstruir(registro) {
  let geometria = null;
  if (registro.vertices) {
    geometria = new THREE.BufferGeometry();
    geometria.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(Float32Array.from(registro.vertices), 3),
    );
    geometria.computeVertexNormals();
    aplicarUVsDeCaixa(geometria);
  } else {
    geometria = geometriaDe(registro.tipo, registro.params);
  }
  if (!geometria) return null;
  const peca = new THREE.Mesh(
    geometria,
    material(registro.cor, registro.textura, registro.negativo),
  );
  peca.userData = {
    tipo: registro.tipo,
    params: registro.params || {},
    cor: registro.cor,
    textura: registro.textura || "nenhuma",
    negativo: Boolean(registro.negativo),
    nome: registro.nome || "Peça",
    origem: registro.origem,
  };
  if (registro.posicao) peca.position.fromArray(registro.posicao);
  if (registro.giro) peca.rotation.set(...registro.giro);
  if (registro.escala) peca.scale.fromArray(registro.escala);
  comContorno(peca);
  cena3d.grupoPecas.add(peca);
  return peca;
}

export function pecaImportada(geometria, nome) {
  geometria.computeVertexNormals();
  geometria.center();
  aplicarUVsDeCaixa(geometria);
  const peca = new THREE.Mesh(geometria, material(proximaCor(), "nenhuma", false));
  peca.userData = {
    tipo: "importada",
    params: {},
    cor: proximaCor(),
    textura: "nenhuma",
    negativo: false,
    nome: nome || "Peça importada",
  };
  comContorno(peca);
  peca.position.set(cena3d.base.largura / 2, 0, cena3d.base.profundidade / 2);
  cena3d.grupoPecas.add(peca);
  pousarNaBase(peca);
  return peca;
}
