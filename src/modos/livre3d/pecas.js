// Peças do modo 3D: criar, refazer quando um parâmetro muda, pintar, marcar
// como negativa e combinar. A combinação usa booleana de verdade, então o
// resultado é uma peça nova, pronta para imprimir.

import * as THREE from "three";
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from "three-bvh-csg";
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
  const contorno = peca.getObjectByName("contorno");
  if (contorno) {
    contorno.material.color.set(
      dados.selecionada ? paleta3d().guia : dados.negativo ? 0xe03131 : paleta3d().borda,
    );
    contorno.material.opacity = dados.selecionada ? 1 : 0.55;
  }
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

function comContorno(peca) {
  const limite = peca.userData?.modo === "malha" ? 1 : 45;
  const arestas = new THREE.LineSegments(
    // Peça rígida mostra só os cantos de verdade; em modo malha aparecem
    // todas as arestas, que é como o aluno vai editar vértice por vértice
    // quando o editor de malhas chegar.
    new THREE.EdgesGeometry(peca.geometry, limite),
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
export function alternarModo(lista, modo) {
  for (const peca of lista) {
    peca.userData.modo = modo === "malha" ? "malha" : "rigida";
    const antigo = peca.getObjectByName("contorno");
    if (antigo) {
      antigo.geometry.dispose();
      antigo.material.dispose();
      peca.remove(antigo);
    }
    comContorno(peca);
  }
  return lista;
}

export function espelhar(lista, eixo = "x") {
  for (const peca of lista) {
    const escala = { x: [-1, 1, 1], y: [1, -1, 1], z: [1, 1, -1] }[eixo] || [-1, 1, 1];
    peca.geometry.scale(...escala);
    garantirOrientacao(peca.geometry);
    aplicarUVsDeCaixa(peca.geometry);
    const antigo = peca.getObjectByName("contorno");
    if (antigo) {
      antigo.geometry.dispose();
      antigo.material.dispose();
      peca.remove(antigo);
    }
    comContorno(peca);
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
