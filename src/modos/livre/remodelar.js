// Remodelador, no espírito do Inkscape: arrasta o ponto, arrasta a alça, e
// arrasta a própria linha para curvar. Os pontos selecionados podem virar
// canto ou curva.

import { cena, paleta, encaixarPonto, escalaDasAlcas } from "./estado.js";
import { registrar } from "./historico.js";
import { avisar } from "../../core/eventos.js";

let alvo = null;
let segmentosMarcados = new Set();
let arrastando = null;
let regiao = null;
let inicioDaRegiao = null;

export function definirAlvo(item) {
  alvo = item && item.segments ? item : caminhoDentro(item);
  segmentosMarcados = new Set();
  desenharNos();
  avisar("livre:remodelar", { temAlvo: Boolean(alvo) });
}

function caminhoDentro(item) {
  if (!item) return null;
  if (item.segments) return item;
  if (item.children && item.children.length) {
    const filho = item.children.find((f) => f.segments);
    return filho || null;
  }
  return null;
}

export function alvoAtual() {
  return alvo;
}

export function desenharNos() {
  const paper = cena.paper;
  if (!paper) return;
  cena.camadaGuias.removeChildren();
  if (!alvo) {
    paper.view.requestUpdate?.();
    return;
  }
  const tons = paleta();
  const anterior = paper.project.activeLayer;
  cena.camadaGuias.activate();
  const lado = (7 * escalaDasAlcas()) / paper.view.zoom;

  alvo.segments.forEach((segmento, indice) => {
    const marcado = segmentosMarcados.has(indice);
    if (marcado) {
      for (const nome of ["handleIn", "handleOut"]) {
        const alca = segmento[nome];
        if (alca.isZero()) continue;
        const pontaAlca = segmento.point.add(alca);
        const haste = new paper.Path.Line(segmento.point, pontaAlca);
        haste.strokeColor = tons.guia;
        haste.strokeWidth = 0.8;
        haste.strokeScaling = false;
        const bolinha = new paper.Path.Circle(pontaAlca, lado * 0.45);
        bolinha.fillColor = tons.fundoMesa;
        bolinha.strokeColor = tons.guia;
        bolinha.strokeWidth = 1.2;
        bolinha.strokeScaling = false;
        bolinha.data = { papel: "alca", indice, lado: nome };
      }
    }
    const no = new paper.Path.Rectangle({
      point: segmento.point.subtract(lado / 2),
      size: [lado, lado],
    });
    no.fillColor = marcado ? tons.guia : tons.fundoMesa;
    no.strokeColor = tons.guia;
    no.strokeWidth = 1.2;
    no.strokeScaling = false;
    no.data = { papel: "no", indice };
  });

  anterior.activate();
  paper.view.requestUpdate?.();
}

function guiaEm(ponto) {
  const achado = cena.camadaGuias.hitTest(ponto, {
    fill: true,
    stroke: true,
    tolerance: (6 * escalaDasAlcas()) / cena.paper.view.zoom,
  });
  return achado && achado.item.data && achado.item.data.papel ? achado.item : null;
}

export function aoPressionar(evento) {
  const guia = guiaEm(evento.point);
  if (guia) {
    const somando = evento.modifiers.shift || evento.modifiers.control || evento.modifiers.command;
    if (guia.data.papel === "no") {
      if (somando) {
        if (segmentosMarcados.has(guia.data.indice)) segmentosMarcados.delete(guia.data.indice);
        else segmentosMarcados.add(guia.data.indice);
      } else if (!segmentosMarcados.has(guia.data.indice)) {
        segmentosMarcados = new Set([guia.data.indice]);
      }
      arrastando = { tipo: "no" };
      desenharNos();
      return;
    }
    arrastando = { tipo: "alca", indice: guia.data.indice, lado: guia.data.lado };
    return;
  }

  if (alvo) {
    const naLinha = alvo.hitTest(evento.point, {
      curves: true,
      tolerance: 5 / cena.paper.view.zoom,
    });
    if (naLinha && naLinha.location) {
      arrastando = { tipo: "curva", curva: naLinha.location.curve, t: naLinha.location.time };
      return;
    }
  }

  const peca = cena.camadaPecas.hitTest(evento.point, {
    fill: true,
    stroke: true,
    tolerance: 4 / cena.paper.view.zoom,
  });
  if (peca) {
    definirAlvo(peca.item);
    arrastando = null;
    return;
  }

  // Clique no vazio com um caminho em edição: começa uma seleção por região,
  // que é o jeito rápido de pegar vários pontos de uma vez.
  if (alvo) {
    const somando = evento.modifiers.shift || evento.modifiers.control || evento.modifiers.command;
    if (!somando) segmentosMarcados = new Set();
    arrastando = { tipo: "regiao" };
    inicioDaRegiao = evento.point;
    const anterior = cena.paper.project.activeLayer;
    cena.camadaGuias.activate();
    regiao = new cena.paper.Path.Rectangle(evento.point, evento.point);
    regiao.strokeColor = paleta().guia;
    regiao.strokeWidth = 1;
    regiao.strokeScaling = false;
    regiao.dashArray = [3, 3];
    anterior.activate();
    return;
  }

  definirAlvo(null);
  arrastando = null;
}

// Duplo clique na linha cria um ponto ali. Funciona com o dedo também, já que
// o toque duplo chega como dblclick no navegador.
export function adicionarPontoEm(ponto) {
  if (!alvo) return false;
  const achado = alvo.hitTest(ponto, { curves: true, tolerance: 8 / cena.paper.view.zoom });
  if (!achado || !achado.location) return false;
  const novo = alvo.divideAt(achado.location);
  if (!novo) return false;
  const indice = alvo.segments.indexOf(novo.segment1 ? novo.segment1 : novo);
  segmentosMarcados = new Set(indice >= 0 ? [indice] : []);
  desenharNos();
  registrar();
  return true;
}

export function aoArrastar(evento) {
  if (!alvo || !arrastando) return;

  if (arrastando.tipo === "regiao") {
    if (regiao) regiao.remove();
    const anterior = cena.paper.project.activeLayer;
    cena.camadaGuias.activate();
    regiao = new cena.paper.Path.Rectangle(inicioDaRegiao, evento.point);
    regiao.strokeColor = paleta().guia;
    regiao.strokeWidth = 1;
    regiao.strokeScaling = false;
    regiao.dashArray = [3, 3];
    anterior.activate();
    return;
  }

  if (arrastando.tipo === "no") {
    const passo = evento.delta;
    for (const indice of segmentosMarcados) {
      const segmento = alvo.segments[indice];
      if (segmento) segmento.point = segmento.point.add(passo);
    }
    desenharNos();
    return;
  }

  if (arrastando.tipo === "alca") {
    const segmento = alvo.segments[arrastando.indice];
    if (!segmento) return;
    const nova = evento.point.subtract(segmento.point);
    segmento[arrastando.lado] = nova;
    const oposto = arrastando.lado === "handleIn" ? "handleOut" : "handleIn";
    if (!segmento[oposto].isZero() && !evento.modifiers.alt) {
      segmento[oposto] = nova.multiply(-1).normalize(segmento[oposto].length);
    }
    desenharNos();
    return;
  }

  if (arrastando.tipo === "curva") {
    const curva = arrastando.curva;
    const t = arrastando.t;
    const peso1 = 3 * (1 - t) * (1 - t) * t;
    const peso2 = 3 * (1 - t) * t * t;
    const soma = peso1 * peso1 + peso2 * peso2 || 1;
    curva.segment1.handleOut = curva.segment1.handleOut.add(evento.delta.multiply(peso1 / soma));
    curva.segment2.handleIn = curva.segment2.handleIn.add(evento.delta.multiply(peso2 / soma));
    desenharNos();
  }
}

export function aoSoltar() {
  if (arrastando && arrastando.tipo === "regiao") {
    const area = regiao ? regiao.bounds : null;
    if (regiao) regiao.remove();
    regiao = null;
    if (area && alvo) {
      alvo.segments.forEach((segmento, indice) => {
        if (area.contains(segmento.point)) segmentosMarcados.add(indice);
      });
      desenharNos();
    }
    arrastando = null;
    inicioDaRegiao = null;
    return;
  }
  if (arrastando) {
    if (arrastando.tipo === "no") {
      for (const indice of segmentosMarcados) {
        const segmento = alvo.segments[indice];
        if (segmento) segmento.point = encaixarPonto(segmento.point);
      }
      desenharNos();
    }
    registrar();
  }
  arrastando = null;
}

export function fazerCurva() {
  if (!alvo || !segmentosMarcados.size) return false;
  for (const indice of segmentosMarcados) {
    const segmento = alvo.segments[indice];
    if (segmento) segmento.smooth({ type: "catmull-rom", factor: 0.5 });
  }
  desenharNos();
  registrar();
  return true;
}

export function fazerCanto() {
  if (!alvo || !segmentosMarcados.size) return false;
  for (const indice of segmentosMarcados) {
    const segmento = alvo.segments[indice];
    if (!segmento) continue;
    segmento.handleIn = [0, 0];
    segmento.handleOut = [0, 0];
  }
  desenharNos();
  registrar();
  return true;
}

export function apagarNos() {
  if (!alvo || !segmentosMarcados.size) return false;
  const ordenados = [...segmentosMarcados].sort((a, b) => b - a);
  for (const indice of ordenados) {
    if (alvo.segments.length <= 2) break;
    alvo.removeSegment(indice);
  }
  segmentosMarcados = new Set();
  desenharNos();
  registrar();
  return true;
}

export function marcados() {
  return segmentosMarcados.size;
}

export function sair() {
  if (regiao) regiao.remove();
  regiao = null;
  arrastando = null;
  alvo = null;
  segmentosMarcados = new Set();
  if (cena.camadaGuias) cena.camadaGuias.removeChildren();
}
