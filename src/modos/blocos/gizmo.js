// O ponteiro desenhado na bancada.
//
// Programar às cegas é o que mais derruba aluno: ele manda mover e não sabe
// para onde foi. Aqui o ponteiro vira coisa visível — um cruzinha no lugar
// onde a próxima peça vai nascer e uma seta mostrando para onde o pivô está
// apontando, que é a direção do "avançar".
//
// Nada disto entra no grupo de peças, então não vai para o STL, nem para o
// arquivo do projeto, nem conta como peça na hora de medir o desafio.

import * as THREE from "three";
import { cena3d } from "../livre3d/cena.js";
import { linhaGrossa, atualizarResolucaoDasLinhas } from "../livre3d/pecas.js";

const BRACO = 9; // tamanho dos riscos dos eixos, em milímetros
const SETA = 22; // comprimento da seta do pivô

let grupo = null;
let seta = null;
let ponta = null;
let anel = null;
let ligado = true;

function corDoTema() {
  const raiz = getComputedStyle(document.documentElement);
  const verde = raiz.getPropertyValue("--verde").trim() || "#3fbf5f";
  const texto = raiz.getPropertyValue("--texto-2").trim() || "#b9c0c6";
  return { guia: verde, eixo: texto };
}

export function criar() {
  remover();
  if (!cena3d.cena) return null;
  const { guia, eixo } = corDoTema();

  grupo = new THREE.Group();
  grupo.name = "gizmo-ponteiro";
  grupo.renderOrder = 999;

  // Cruz dos três eixos: diz o lugar exato, sem tapar a peça.
  const riscos = [
    -BRACO, 0, 0, BRACO, 0, 0,
    0, -BRACO * 0.35, 0, 0, BRACO, 0,
    0, 0, -BRACO, 0, 0, BRACO,
  ];
  const cruz = linhaGrossa(riscos, eixo, 2, 0.85);
  cruz.material.depthTest = false;
  grupo.add(cruz);

  // Bolinha no ponto: é onde a próxima peça nasce.
  const centro = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 12, 10),
    new THREE.MeshBasicMaterial({ color: guia, depthTest: false, transparent: true, opacity: 0.95 }),
  );
  centro.renderOrder = 999;
  grupo.add(centro);

  // Seta do pivô: aponta para onde o "avançar" vai andar.
  seta = linhaGrossa([0, 0, 0, SETA, 0, 0], guia, 3.2, 1);
  seta.material.depthTest = false;
  grupo.add(seta);

  ponta = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 6, 14),
    new THREE.MeshBasicMaterial({ color: guia, depthTest: false, transparent: true, opacity: 0.95 }),
  );
  ponta.renderOrder = 999;
  // O cone nasce apontando para cima; deitamos ele no eixo X.
  ponta.rotation.z = -Math.PI / 2;
  ponta.position.set(SETA, 0, 0);
  grupo.add(ponta);

  // Argola no plano do giro, para dar noção do ângulo.
  anel = new THREE.Mesh(
    new THREE.RingGeometry(SETA * 0.62, SETA * 0.68, 40, 1, 0, Math.PI * 2),
    new THREE.MeshBasicMaterial({
      color: guia,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      depthTest: false,
    }),
  );
  anel.rotation.x = -Math.PI / 2;
  anel.renderOrder = 998;
  grupo.add(anel);

  grupo.visible = ligado;
  cena3d.cena.add(grupo);
  const tela = cena3d.renderizador?.domElement;
  if (tela) atualizarResolucaoDasLinhas(tela.clientWidth, tela.clientHeight);
  return grupo;
}

// Leva o gizmo para onde o ponteiro está e vira a seta para o lado do pivô.
export function atualizar(estado) {
  if (!grupo || !estado) return;
  const meio = { x: cena3d.base.largura / 2, z: cena3d.base.profundidade / 2 };
  grupo.position.set(meio.x + estado.posicao.x, estado.posicao.y, meio.z + estado.posicao.z);
  const p = estado.pivo || { x: 0, y: 0, z: 0 };
  grupo.rotation.set(
    (p.x * Math.PI) / 180,
    (p.y * Math.PI) / 180,
    (p.z * Math.PI) / 180,
  );
  // A argola acompanha o giro em pé, que é o mais usado.
  if (anel) anel.rotation.set(-Math.PI / 2, 0, 0);
}

export function mostrar(sim) {
  ligado = sim;
  if (grupo) grupo.visible = sim;
}

export function visivel() {
  return ligado;
}

// Some por um instante — usado na hora de tirar a foto para a bolsa, senão a
// seta entraria na miniatura da peça.
export async function esconderPara(acao) {
  const antes = grupo ? grupo.visible : false;
  if (grupo) grupo.visible = false;
  try {
    return await acao();
  } finally {
    if (grupo) grupo.visible = antes;
  }
}

export function remover() {
  if (!grupo) return;
  grupo.traverse((filho) => {
    filho.geometry?.dispose?.();
    filho.material?.dispose?.();
  });
  grupo.parent?.remove(grupo);
  grupo = null;
  seta = null;
  ponta = null;
  anel = null;
}

export function refazerCores() {
  if (!grupo) return;
  criar();
}
