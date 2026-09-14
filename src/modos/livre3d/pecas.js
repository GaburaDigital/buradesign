// Peças do modo 3D: criar, refazer quando um parâmetro muda, pintar, marcar
// como negativa e combinar. A combinação usa booleana de verdade, então o
// resultado é uma peça nova, pronta para imprimir.

import * as THREE from "three";
import { Brush, Evaluator, ADDITION, SUBTRACTION } from "three-bvh-csg";
import { cena3d, paleta3d, encaixar } from "./cena.js";
import { geometriaDe, parametrosPadrao, DEFINICOES, aplicarUVsDeCaixa } from "./solidos.js";

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

export function material(cor, tipoTextura, negativo) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(negativo ? NEGATIVO : cor),
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
  peca.material = material(dados.cor, dados.textura, dados.negativo);
  const contorno = peca.getObjectByName("contorno");
  if (contorno) {
    contorno.material.color.set(dados.negativo ? 0xe03131 : paleta3d().borda);
  }
  return peca;
}

function comContorno(peca) {
  const arestas = new THREE.LineSegments(
    new THREE.EdgesGeometry(peca.geometry, 28),
    new THREE.LineBasicMaterial({ color: paleta3d().borda, transparent: true, opacity: 0.55 }),
  );
  arestas.name = "contorno";
  peca.add(arestas);
  return peca;
}

// Pousa a peça na base: sobe o que estiver afundado e baixa o que estiver
// flutuando. Antes só subia, e por isso o botão parecia não funcionar.
export function pousarNaBase(peca) {
  peca.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(peca);
  if (!Number.isFinite(caixa.min.y)) return peca;
  peca.position.y -= caixa.min.y;
  peca.updateMatrixWorld(true);
  return peca;
}

// A peça está encostando na base?
export function estaNaBase(peca, folga = 0.4) {
  peca.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(peca);
  return caixa.min.y <= folga;
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
  const geometria = geometriaDe(dados.tipo, params);
  if (!geometria) return peca;
  peca.geometry.dispose();
  peca.geometry = geometria;
  dados.params = params;
  const antigo = peca.getObjectByName("contorno");
  if (antigo) {
    antigo.geometry.dispose();
    antigo.material.dispose();
    peca.remove(antigo);
  }
  comContorno(peca);
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
