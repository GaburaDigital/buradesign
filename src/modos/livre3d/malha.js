// Edição de malha. A peça em modo malha mostra os vértices; clicar seleciona
// vértice, aresta ou face conforme o modo, e arrastar move o que estiver
// marcado. Vértices que ocupam o mesmo ponto andam juntos, senão a peça abre
// buracos ao ser deformada.

import * as THREE from "three";
import { cena3d, paleta3d } from "./cena.js";
import { aplicarUVsDeCaixa } from "./solidos.js";
import { linhaGrossa } from "./pecas.js";

export const MODOS = [
  { id: "vertice", icone: "vertice", rotulo: "Vértice" },
  { id: "aresta", icone: "aresta", rotulo: "Aresta" },
  { id: "face", icone: "face", rotulo: "Face" },
];

// Avisa quem estiver ouvindo que a malha mudou de forma, para o contorno e as
// cruzes serem redesenhados no formato novo.
let aoDeformar = null;

export function ligarAviso(funcao) {
  aoDeformar = typeof funcao === "function" ? funcao : null;
}

const estado = {
  peca: null,
  modo: "vertice",
  unicos: [],
  porVertice: [],
  marcados: new Set(),
  // Faces e arestas marcadas. São listas próprias porque o aluno pode marcar
  // várias de uma vez: antes só cabia uma, e editar uma malha inteira
  // exigia repetir o mesmo ajuste face a face.
  faces: new Set(),
  arestas: [],
  // Para cada triângulo, o vizinho que fecha o quadrado com ele.
  parceiro: [],
  pontos: null,
  destaque: null,
};

function casa(valor) {
  return Math.round(valor * 1000) / 1000;
}

// Junta os vértices repetidos num índice só.
function mapear(peca) {
  const posicoes = peca.geometry.attributes.position;
  const chaves = new Map();
  estado.unicos = [];
  estado.porVertice = new Array(posicoes.count);
  for (let i = 0; i < posicoes.count; i += 1) {
    const chave = `${casa(posicoes.getX(i))},${casa(posicoes.getY(i))},${casa(posicoes.getZ(i))}`;
    let indice = chaves.get(chave);
    if (indice === undefined) {
      indice = estado.unicos.length;
      chaves.set(chave, indice);
      estado.unicos.push({
        posicao: new THREE.Vector3(posicoes.getX(i), posicoes.getY(i), posicoes.getZ(i)),
        copias: [],
      });
    }
    estado.unicos[indice].copias.push(i);
    estado.porVertice[i] = indice;
  }
}

// Dois triângulos que dividem uma aresta e estão no mesmo plano formam, na
// cabeça de quem edita, uma face só — o quadrado. É assim que a malha é
// mostrada, e agora é assim que ela é selecionada e extrudada.
function parearEmQuadrados(peca) {
  const posicoes = peca.geometry.attributes.position;
  const total = Math.floor(posicoes.count / 3);
  const normais = [];
  const porAresta = new Map();
  for (let f = 0; f < total; f += 1) {
    const i = f * 3;
    const p = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(posicoes, i + k));
    normais.push(
      new THREE.Vector3()
        .crossVectors(
          new THREE.Vector3().subVectors(p[1], p[0]),
          new THREE.Vector3().subVectors(p[2], p[0]),
        )
        .normalize(),
    );
    const chaves = [0, 1, 2].map((k) => estado.porVertice[i + k]);
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const id = [chaves[a], chaves[b]].sort((x, y) => x - y).join("|");
      if (!porAresta.has(id)) porAresta.set(id, []);
      porAresta.get(id).push(f);
    }
  }
  estado.parceiro = new Array(total).fill(-1);
  for (const usos of porAresta.values()) {
    if (usos.length !== 2) continue;
    const [a, b] = usos;
    if (estado.parceiro[a] !== -1 || estado.parceiro[b] !== -1) continue;
    if (normais[a].dot(normais[b]) > 0.999) {
      estado.parceiro[a] = b;
      estado.parceiro[b] = a;
    }
  }
}

// Os triângulos do quadrado a que este triângulo pertence.
function quadradoDe(face) {
  const par = estado.parceiro[face];
  return par === -1 ? [face] : [face, par];
}

function desenharPontos() {
  apagarPontos();
  const geometria = new THREE.BufferGeometry();
  const lista = [];
  for (const unico of estado.unicos) lista.push(...unico.posicao.toArray());
  geometria.setAttribute("position", new THREE.Float32BufferAttribute(lista, 3));
  const cores = new Float32Array(estado.unicos.length * 3);
  geometria.setAttribute("color", new THREE.BufferAttribute(cores, 3));
  estado.pontos = new THREE.Points(
    geometria,
    new THREE.PointsMaterial({
      size: 10,
      sizeAttenuation: false,
      vertexColors: true,
      depthTest: false,
    }),
  );
  estado.pontos.name = "pontosDaMalha";
  estado.pontos.renderOrder = 10;
  estado.peca.add(estado.pontos);
  pintarPontos();
}

function pintarPontos() {
  if (!estado.pontos) return;
  const cores = estado.pontos.geometry.attributes.color;
  const normal = new THREE.Color(paleta3d().borda);
  const marcado = new THREE.Color(paleta3d().guia);
  for (let i = 0; i < estado.unicos.length; i += 1) {
    const cor = estado.marcados.has(i) ? marcado : normal;
    cores.setXYZ(i, cor.r, cor.g, cor.b);
  }
  cores.needsUpdate = true;
  desenharDestaque();
}

// Destaque do que está marcado: aresta grossa na cor do guia, face pintada
// por inteiro. O ponto já muda de cor sozinho.
function apagarDestaque() {
  if (!estado.destaque) return;
  estado.destaque.traverse((filho) => {
    filho.geometry?.dispose?.();
    filho.material?.dispose?.();
  });
  estado.destaque.parent?.remove(estado.destaque);
  estado.destaque = null;
}

function desenharDestaque() {
  apagarDestaque();
  if (!estado.peca || !estado.marcados.size) return;
  const cor = paleta3d().guia;
  const grupo = new THREE.Group();
  grupo.name = "destaqueDaMalha";

  if (estado.modo === "aresta" && estado.arestas.length) {
    const riscos = [];
    for (const [a, b] of estado.arestas) {
      riscos.push(...estado.unicos[a].posicao.toArray(), ...estado.unicos[b].posicao.toArray());
    }
    grupo.add(linhaGrossa(riscos, cor, 6));
  }

  if (estado.modo === "face" && estado.faces.size) {
    const geometria = new THREE.BufferGeometry();
    const pontos = [];
    for (const face of estado.faces) {
      const inicio = face * 3;
      for (const indice of [inicio, inicio + 1, inicio + 2]) {
        pontos.push(...estado.unicos[estado.porVertice[indice]].posicao.toArray());
      }
    }
    geometria.setAttribute("position", new THREE.Float32BufferAttribute(pontos, 3));
    geometria.computeVertexNormals();
    const cara = new THREE.Mesh(
      geometria,
      new THREE.MeshBasicMaterial({
        color: cor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
    );
    cara.renderOrder = 9;
    grupo.add(cara);
  }

  estado.peca.add(grupo);
  estado.destaque = grupo;
}

function apagarPontos() {
  apagarDestaque();
  if (!estado.pontos) return;
  estado.pontos.geometry.dispose();
  estado.pontos.material.dispose();
  estado.pontos.parent?.remove(estado.pontos);
  estado.pontos = null;
}

export function entrar(peca) {
  sair();
  if (!peca || !peca.geometry) return false;
  if (peca.geometry.index) {
    const plana = peca.geometry.toNonIndexed();
    peca.geometry.dispose();
    peca.geometry = plana;
  }
  estado.peca = peca;
  limparMarcas();
  mapear(peca);
  parearEmQuadrados(peca);
  desenharPontos();
  return true;
}

export function sair() {
  apagarPontos();
  estado.peca = null;
  estado.unicos = [];
  estado.porVertice = [];
  estado.parceiro = [];
  limparMarcas();
}

function limparMarcas() {
  estado.marcados = new Set();
  estado.faces = new Set();
  estado.arestas = [];
}

export function ativo() {
  return Boolean(estado.peca);
}

export function pecaAtual() {
  return estado.peca;
}

export function definirModo(modo) {
  estado.modo = MODOS.some((item) => item.id === modo) ? modo : "vertice";
  limparMarcas();
  pintarPontos();
}

export function modoAtual() {
  return estado.modo;
}

export function quantosMarcados() {
  return estado.marcados.size;
}

// Triângulos das faces marcadas. É o que a extrusão usa — e como a marcação
// é por quadrado, vêm os dois triângulos de cada face.
export function trianguloInicial() {
  if (!estado.peca || !estado.faces.size) return [];
  return [...estado.faces].map((face) => face * 3);
}

// Quantas faces (quadrados), não quantos triângulos: era isso que o painel
// mostrava, e uma face só aparecia como "2".
export function quantasFaces() {
  const vistos = new Set();
  let total = 0;
  for (const face of estado.faces) {
    if (vistos.has(face)) continue;
    for (const irmao of quadradoDe(face)) vistos.add(irmao);
    total += 1;
  }
  return total;
}

// Refaz o mapa depois de uma mudança na geometria feita de fora.
export function remapear() {
  if (!estado.peca) return;
  mapear(estado.peca);
  parearEmQuadrados(estado.peca);
  limparMarcas();
  desenharPontos();
}

// Marca o que foi clicado, de acordo com o modo. Com "somando" ligado (Shift,
// ou o modo somar no celular) a marca se junta às anteriores em vez de
// substituí-las, e clicar de novo no mesmo lugar desmarca.
export function marcarPeloRaio(raio, somando = false) {
  if (!estado.peca) return false;
  const acertos = raio.intersectObject(estado.peca, false);
  if (!acertos.length) {
    if (!somando) {
      limparMarcas();
      pintarPontos();
    }
    return false;
  }
  const acerto = acertos[0];
  const cara = acerto.face;
  const trio = [cara.a, cara.b, cara.c].map((i) => estado.porVertice[i]);
  const ponto = estado.peca.worldToLocal(acerto.point.clone());

  if (!somando) limparMarcas();

  if (estado.modo === "face") {
    // A face é o quadrado inteiro: os dois triângulos que o formam.
    const face = Math.floor(cara.a / 3);
    const dupla = quadradoDe(face);
    const jaTinha = dupla.every((f) => estado.faces.has(f));
    for (const f of dupla) {
      if (jaTinha) estado.faces.delete(f);
      else estado.faces.add(f);
    }
    refazerVerticesDasFaces();
  } else if (estado.modo === "aresta") {
    const pares = [
      [trio[0], trio[1]],
      [trio[1], trio[2]],
      [trio[2], trio[0]],
    ];
    let melhor = pares[0];
    let menor = Infinity;
    for (const par of pares) {
      const meio = estado.unicos[par[0]].posicao
        .clone()
        .add(estado.unicos[par[1]].posicao)
        .multiplyScalar(0.5);
      const distancia = meio.distanceTo(ponto);
      if (distancia < menor) {
        menor = distancia;
        melhor = par;
      }
    }
    const id = [...melhor].sort((a, b) => a - b).join("|");
    const onde = estado.arestas.findIndex(
      (par) => [...par].sort((a, b) => a - b).join("|") === id,
    );
    if (onde >= 0) estado.arestas.splice(onde, 1);
    else estado.arestas.push(melhor);
    refazerVerticesDasArestas();
  } else {
    let melhor = trio[0];
    let menor = Infinity;
    for (const indice of trio) {
      const distancia = estado.unicos[indice].posicao.distanceTo(ponto);
      if (distancia < menor) {
        menor = distancia;
        melhor = indice;
      }
    }
    if (estado.marcados.has(melhor)) estado.marcados.delete(melhor);
    else estado.marcados.add(melhor);
  }

  pintarPontos();
  return true;
}

// Os vértices que a seta move saem do que está marcado em cada modo.
function refazerVerticesDasFaces() {
  estado.marcados = new Set();
  for (const face of estado.faces) {
    const inicio = face * 3;
    for (const k of [0, 1, 2]) estado.marcados.add(estado.porVertice[inicio + k]);
  }
}

function refazerVerticesDasArestas() {
  estado.marcados = new Set();
  for (const [a, b] of estado.arestas) {
    estado.marcados.add(a);
    estado.marcados.add(b);
  }
}

export function centroDosMarcados() {
  if (!estado.marcados.size || !estado.peca) return null;
  const centro = new THREE.Vector3();
  for (const indice of estado.marcados) centro.add(estado.unicos[indice].posicao);
  centro.divideScalar(estado.marcados.size);
  return estado.peca.localToWorld(centro.clone());
}

// Move o que está marcado. O deslocamento chega em coordenadas do mundo.
export function mover(deslocamentoNoMundo) {
  if (!estado.peca || !estado.marcados.size) return false;
  const inversa = new THREE.Matrix3().setFromMatrix4(
    new THREE.Matrix4().copy(estado.peca.matrixWorld).invert(),
  );
  const passo = deslocamentoNoMundo.clone().applyMatrix3(inversa);
  const posicoes = estado.peca.geometry.attributes.position;
  for (const indice of estado.marcados) {
    const unico = estado.unicos[indice];
    unico.posicao.add(passo);
    for (const copia of unico.copias) {
      posicoes.setXYZ(copia, unico.posicao.x, unico.posicao.y, unico.posicao.z);
    }
  }
  posicoes.needsUpdate = true;
  estado.peca.geometry.computeVertexNormals();
  estado.peca.geometry.computeBoundingBox();
  estado.peca.geometry.computeBoundingSphere();
  aplicarUVsDeCaixa(estado.peca.geometry);
  atualizarPontos();
  // O contorno é uma geometria própria: sem refazer, ele ficava com a forma
  // antiga enquanto a peça já tinha virado outra coisa.
  aoDeformar?.(estado.peca);
  return true;
}

function atualizarPontos() {
  if (!estado.pontos) return;
  const posicoes = estado.pontos.geometry.attributes.position;
  for (let i = 0; i < estado.unicos.length; i += 1) {
    const ponto = estado.unicos[i].posicao;
    posicoes.setXYZ(i, ponto.x, ponto.y, ponto.z);
  }
  posicoes.needsUpdate = true;
  estado.pontos.geometry.computeBoundingSphere();
  desenharDestaque();
}
