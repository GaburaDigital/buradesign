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
  pontos: null,
  destaque: null,
  trianguloMarcado: null,
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

  if (estado.modo === "aresta" && estado.marcados.size === 2) {
    const [a, b] = [...estado.marcados];
    grupo.add(
      linhaGrossa(
        [...estado.unicos[a].posicao.toArray(), ...estado.unicos[b].posicao.toArray()],
        cor,
        6,
      ),
    );
  }

  if (estado.modo === "face" && estado.trianguloMarcado) {
    const geometria = new THREE.BufferGeometry();
    const pontos = [];
    for (const indice of estado.trianguloMarcado) {
      pontos.push(...estado.unicos[estado.porVertice[indice]].posicao.toArray());
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
  estado.marcados = new Set();
  mapear(peca);
  desenharPontos();
  return true;
}

export function sair() {
  apagarPontos();
  estado.peca = null;
  estado.unicos = [];
  estado.porVertice = [];
  estado.marcados = new Set();
}

export function ativo() {
  return Boolean(estado.peca);
}

export function pecaAtual() {
  return estado.peca;
}

export function definirModo(modo) {
  estado.modo = MODOS.some((item) => item.id === modo) ? modo : "vertice";
  estado.marcados = new Set();
  estado.trianguloMarcado = null;
  pintarPontos();
}

export function modoAtual() {
  return estado.modo;
}

export function quantosMarcados() {
  return estado.marcados.size;
}

// Triângulos que pertencem à seleção atual. É o que a extrusão de face usa.
export function trianguloInicial() {
  if (!estado.peca || !estado.marcados.size) return [];
  const posicoes = estado.peca.geometry.attributes.position;
  const inicios = [];
  for (let i = 0; i < posicoes.count; i += 3) {
    const trio = [i, i + 1, i + 2].map((k) => estado.porVertice[k]);
    if (trio.every((indice) => estado.marcados.has(indice))) inicios.push(i);
  }
  return inicios;
}

// Refaz o mapa depois de uma mudança na geometria feita de fora.
export function remapear() {
  if (!estado.peca) return;
  mapear(estado.peca);
  estado.marcados = new Set();
  estado.trianguloMarcado = null;
  desenharPontos();
}

// Marca o que foi clicado, de acordo com o modo.
export function marcarPeloRaio(raio, somando = false) {
  if (!estado.peca) return false;
  const acertos = raio.intersectObject(estado.peca, false);
  if (!acertos.length) {
    if (!somando) {
      estado.marcados = new Set();
      pintarPontos();
    }
    return false;
  }
  const acerto = acertos[0];
  const cara = acerto.face;
  const trio = [cara.a, cara.b, cara.c].map((i) => estado.porVertice[i]);
  let alvos = [];

  if (estado.modo === "face") {
    alvos = trio;
    estado.trianguloMarcado = [cara.a, cara.b, cara.c];
  } else if (estado.modo === "aresta") {
    const ponto = acerto.point;
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
      const distancia = meio.distanceTo(estado.peca.worldToLocal(ponto.clone()));
      if (distancia < menor) {
        menor = distancia;
        melhor = par;
      }
    }
    alvos = melhor;
  } else {
    const ponto = estado.peca.worldToLocal(acerto.point.clone());
    let melhor = trio[0];
    let menor = Infinity;
    for (const indice of trio) {
      const distancia = estado.unicos[indice].posicao.distanceTo(ponto);
      if (distancia < menor) {
        menor = distancia;
        melhor = indice;
      }
    }
    alvos = [melhor];
  }

  if (estado.modo !== "face") estado.trianguloMarcado = null;
  if (!somando) estado.marcados = new Set();
  for (const indice of alvos) estado.marcados.add(indice);
  pintarPontos();
  return true;
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
