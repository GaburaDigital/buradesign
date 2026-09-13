// Desfazer e refazer por fotografias da camada de peças. É simples, aguenta
// qualquer operação (inclusive combinar e remodelar) e não exige que cada
// ferramenta saiba desfazer a si mesma.

import { cena, limparSelecao } from "./estado.js";
import { avisar } from "../../core/eventos.js";

const LIMITE = 40;
const passado = [];
const futuro = [];
let ultimaFoto = null;

function fotografar() {
  return cena.camadaPecas.exportJSON({ asString: true, precision: 4 });
}

export function iniciar() {
  passado.length = 0;
  futuro.length = 0;
  ultimaFoto = fotografar();
  anunciar();
}

export function registrar() {
  const agora = fotografar();
  if (agora === ultimaFoto) return;
  passado.push(ultimaFoto);
  if (passado.length > LIMITE) passado.shift();
  futuro.length = 0;
  ultimaFoto = agora;
  anunciar();
}

function restaurar(json) {
  limparSelecao();
  cena.camadaPecas.removeChildren();
  const recuperado = cena.paper.project.importJSON(json);
  // O importJSON devolve uma camada nova: passamos os filhos para a nossa.
  if (recuperado && recuperado !== cena.camadaPecas) {
    cena.camadaPecas.addChildren(recuperado.children.slice());
    if (recuperado.remove) recuperado.remove();
  }
  ultimaFoto = fotografar();
  anunciar();
}

export function desfazer() {
  if (!passado.length) return false;
  futuro.push(ultimaFoto);
  restaurar(passado.pop());
  return true;
}

export function refazer() {
  if (!futuro.length) return false;
  passado.push(ultimaFoto);
  restaurar(futuro.pop());
  return true;
}

export function podeDesfazer() {
  return passado.length > 0;
}

export function podeRefazer() {
  return futuro.length > 0;
}

function anunciar() {
  avisar("livre:historico", { desfazer: podeDesfazer(), refazer: podeRefazer() });
}
