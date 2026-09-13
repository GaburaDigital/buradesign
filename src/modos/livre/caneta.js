// Caneta. Clique cria ponta reta, clique arrastando cria curva.
// Fecha clicando no primeiro ponto; Enter termina aberto; Esc cancela.

import { cena, encaixarPonto, proximaCor, paleta } from "./estado.js";
import { vestir } from "./formas.js";
import { registrar } from "./historico.js";
import { avisar } from "../../core/eventos.js";

let caminho = null;
let previa = null;

function tons() {
  return paleta();
}

export function estaDesenhando() {
  return Boolean(caminho);
}

function comecar(ponto) {
  const paper = cena.paper;
  caminho = new paper.Path();
  cena.camadaPecas.addChild(caminho);
  caminho.strokeColor = tons().contorno;
  caminho.strokeWidth = 0.5;
  caminho.strokeScaling = false;
  caminho.data = { tipo: "caminho", params: {}, rotacao: 0, cor: proximaCor(), negativo: false };
  caminho.add(ponto);
  avisar("livre:caneta", { desenhando: true });
}

export function aoPressionar(evento) {
  const ponto = encaixarPonto(evento.point);
  if (!caminho) {
    comecar(ponto);
    return;
  }
  const primeiro = caminho.firstSegment.point;
  if (caminho.segments.length > 1 && ponto.getDistance(primeiro) < 6 / cena.paper.view.zoom) {
    fechar();
    return;
  }
  caminho.add(ponto);
}

export function aoArrastar(evento) {
  if (!caminho) return;
  const ultimo = caminho.lastSegment;
  const puxada = evento.point.subtract(ultimo.point);
  ultimo.handleOut = puxada;
  ultimo.handleIn = puxada.multiply(-1);
}

export function aoMover(evento) {
  if (!caminho) return;
  if (previa) previa.remove();
  const anterior = cena.paper.project.activeLayer;
  cena.camadaGuias.activate();
  previa = new cena.paper.Path.Line(caminho.lastSegment.point, evento.point);
  previa.strokeColor = tons().guia;
  previa.strokeWidth = 1;
  previa.strokeScaling = false;
  previa.dashArray = [3, 3];
  anterior.activate();
}

function limparPrevia() {
  if (previa) previa.remove();
  previa = null;
}

export function fechar() {
  if (!caminho) return null;
  caminho.closed = true;
  return terminar();
}

export function terminar() {
  if (!caminho) return null;
  limparPrevia();
  const feito = caminho;
  caminho = null;
  if (feito.segments.length < 2) {
    feito.remove();
    avisar("livre:caneta", { desenhando: false });
    return null;
  }
  if (feito.closed) vestir(feito, feito.data.cor);
  registrar();
  avisar("livre:caneta", { desenhando: false });
  return feito;
}

export function cancelar() {
  limparPrevia();
  if (caminho) caminho.remove();
  caminho = null;
  avisar("livre:caneta", { desenhando: false });
}
