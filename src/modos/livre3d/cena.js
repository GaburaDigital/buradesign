// A bancada 3D: base de impressão com grid e medidas, luz, câmera e a
// navegação pelo mouse. Uma unidade é um milímetro, igual ao modo 2D.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { valor } from "../../core/ajustes.js";

export const cena3d = {
  THREE,
  renderizador: null,
  cena: null,
  camera: null,
  orbita: null,
  grupoPecas: null,
  grupoBase: null,
  base: { largura: 200, profundidade: 200, altura: 200, grid: 10 },
  selecao: [],
  tela: null,
};

const PALETAS = {
  escuro: { fundo: 0x0c0c0c, grade: 0x2a3036, gradeForte: 0x4a545c, borda: 0x7c858c, guia: 0x3fbf5f },
  claro: { fundo: 0xf2f4f6, grade: 0xd7dde1, gradeForte: 0xb0b9c0, borda: 0x5c656b, guia: 0x0a7a33 },
  sistema: { fundo: 0x23272b, grade: 0x3b424a, gradeForte: 0x576069, borda: 0x8d979e, guia: 0x00e5a0 },
  rosa: { fundo: 0x2a0f33, grade: 0x4d2059, gradeForte: 0x713287, borda: 0xb167c9, guia: 0xff5f8d },
  flash: { fundo: 0xfffdfd, grade: 0xffdedb, gradeForte: 0xf2b3ae, borda: 0xb21f1f, guia: 0xe6a800 },
};

export function paleta3d() {
  return PALETAS[document.documentElement.dataset.tema] || PALETAS.escuro;
}

export function iniciar(tela) {
  const tons = paleta3d();
  cena3d.tela = tela;
  cena3d.renderizador = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: false });
  cena3d.renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  cena3d.cena = new THREE.Scene();
  cena3d.cena.background = new THREE.Color(tons.fundo);

  cena3d.camera = new THREE.PerspectiveCamera(45, 1, 1, 8000);
  cena3d.camera.position.set(180, 160, 220);

  cena3d.orbita = new OrbitControls(cena3d.camera, tela);
  cena3d.orbita.enableDamping = true;
  cena3d.orbita.dampingFactor = 0.12;
  // Botão direito gira, botão do meio arrasta, roda aproxima.
  cena3d.orbita.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  cena3d.orbita.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_PAN };

  const ambiente = new THREE.HemisphereLight(0xffffff, 0x444455, 2.1);
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(120, 240, 160);
  const preenchimento = new THREE.DirectionalLight(0xffffff, 0.5);
  preenchimento.position.set(-160, 90, -120);
  cena3d.cena.add(ambiente, sol, preenchimento);

  cena3d.grupoBase = new THREE.Group();
  cena3d.grupoPecas = new THREE.Group();
  cena3d.cena.add(cena3d.grupoBase, cena3d.grupoPecas);

  desenharBase();
  enquadrar();
  return cena3d;
}

export function desenharBase() {
  const tons = paleta3d();
  const { largura, profundidade, grid } = cena3d.base;
  const grupo = cena3d.grupoBase;
  while (grupo.children.length) {
    const filho = grupo.children.pop();
    filho.geometry?.dispose?.();
    filho.material?.dispose?.();
  }
  if (cena3d.cena) cena3d.cena.background = new THREE.Color(tons.fundo);

  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(largura, profundidade),
    new THREE.MeshBasicMaterial({
      color: tons.fundo,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  chao.rotation.x = -Math.PI / 2;
  chao.position.set(largura / 2, -0.05, profundidade / 2);
  grupo.add(chao);

  const linhas = [];
  const fortes = [];
  for (let x = 0; x <= largura + 0.001; x += grid) {
    const alvo = Math.round(x) % (grid * 5) === 0 ? fortes : linhas;
    alvo.push(x, 0, 0, x, 0, profundidade);
  }
  for (let z = 0; z <= profundidade + 0.001; z += grid) {
    const alvo = Math.round(z) % (grid * 5) === 0 ? fortes : linhas;
    alvo.push(0, 0, z, largura, 0, z);
  }
  grupo.add(malhaDeLinhas(linhas, tons.grade));
  grupo.add(malhaDeLinhas(fortes, tons.gradeForte));

  // Cantoneiras marcando o tamanho útil da base.
  const marca = Math.min(largura, profundidade) * 0.12;
  const cantos = [
    [0, 0, 1, 1],
    [largura, 0, -1, 1],
    [0, profundidade, 1, -1],
    [largura, profundidade, -1, -1],
  ];
  const pontos = [];
  for (const [x, z, dx, dz] of cantos) {
    pontos.push(x, 0.2, z, x + dx * marca, 0.2, z);
    pontos.push(x, 0.2, z, x, 0.2, z + dz * marca);
  }
  grupo.add(malhaDeLinhas(pontos, tons.borda));
}

function malhaDeLinhas(pontos, cor) {
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.Float32BufferAttribute(pontos, 3));
  return new THREE.LineSegments(geometria, new THREE.LineBasicMaterial({ color: cor }));
}

export function redefinirBase({ largura, profundidade, altura, grid }) {
  cena3d.base = {
    largura: Math.max(20, Math.min(2000, largura)),
    profundidade: Math.max(20, Math.min(2000, profundidade)),
    altura: Math.max(20, Math.min(2000, altura ?? cena3d.base.altura)),
    grid: Math.max(1, Math.min(50, grid)),
  };
  desenharBase();
}

export function centroDaBase() {
  return new THREE.Vector3(cena3d.base.largura / 2, 0, cena3d.base.profundidade / 2);
}

export function enquadrar() {
  const { largura, profundidade } = cena3d.base;
  const alvo = centroDaBase();
  const distancia = Math.max(largura, profundidade) * 1.5;
  cena3d.camera.position.set(alvo.x + distancia * 0.6, distancia * 0.65, alvo.z + distancia * 0.8);
  cena3d.orbita.target.copy(alvo);
  cena3d.orbita.update();
}

// Faces do cubo de orientação.
export const VISTAS = {
  topo: [0, 1, 0.001],
  base: [0, -1, 0.001],
  frente: [0, 0.2, 1],
  tras: [0, 0.2, -1],
  esquerda: [-1, 0.2, 0],
  direita: [1, 0.2, 0],
  cantoinho: [0.8, 0.7, 1],
};

export function olharDe(nome) {
  const direcao = VISTAS[nome] || VISTAS.cantoinho;
  const alvo = cena3d.orbita.target.clone();
  const distancia = cena3d.camera.position.distanceTo(alvo) || cena3d.base.largura * 1.6;
  const vetor = new THREE.Vector3(...direcao).normalize().multiplyScalar(distancia);
  cena3d.camera.position.copy(alvo.clone().add(vetor));
  cena3d.orbita.update();
}

export function redimensionar(largura, altura) {
  if (!cena3d.renderizador || !largura || !altura) return;
  cena3d.renderizador.setSize(largura, altura, false);
  cena3d.camera.aspect = largura / altura;
  cena3d.camera.updateProjectionMatrix();
}

let rodando = false;
let pedido = null;

export function comecarDesenho(antesDeCadaQuadro) {
  rodando = true;
  const quadro = () => {
    if (!rodando) return;
    pedido = requestAnimationFrame(quadro);
    cena3d.orbita?.update();
    antesDeCadaQuadro?.();
    cena3d.renderizador?.render(cena3d.cena, cena3d.camera);
  };
  quadro();
}

export function pararDesenho() {
  rodando = false;
  if (pedido) cancelAnimationFrame(pedido);
  pedido = null;
}

export function encerrar() {
  pararDesenho();
  cena3d.orbita?.dispose?.();
  cena3d.renderizador?.dispose?.();
  cena3d.renderizador = null;
  cena3d.cena = null;
  cena3d.selecao = [];
}

// Encaixe no grid, igual ao 2D.
export function passoDoEncaixe() {
  const passo = Number(valor("snap"));
  return Number.isFinite(passo) && passo > 0 ? passo : 0;
}

export function encaixar(numero) {
  const passo = passoDoEncaixe();
  return passo ? Math.round(numero / passo) * passo : numero;
}
