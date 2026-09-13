// Alinhar, distribuir e mudar a ordem das peças.

import { cena } from "./estado.js";
import { registrar } from "./historico.js";

function caixaGeral(itens) {
  return itens.reduce((soma, item) => (soma ? soma.unite(item.bounds) : item.bounds.clone()), null);
}

export function alinhar(itens, onde) {
  if (itens.length < 2) return false;
  const area = caixaGeral(itens);
  for (const item of itens) {
    const caixa = item.bounds;
    switch (onde) {
      case "esquerda":
        item.position = item.position.add([area.left - caixa.left, 0]);
        break;
      case "centroH":
        item.position = item.position.add([area.center.x - caixa.center.x, 0]);
        break;
      case "direita":
        item.position = item.position.add([area.right - caixa.right, 0]);
        break;
      case "topo":
        item.position = item.position.add([0, area.top - caixa.top]);
        break;
      case "meioV":
        item.position = item.position.add([0, area.center.y - caixa.center.y]);
        break;
      case "base":
        item.position = item.position.add([0, area.bottom - caixa.bottom]);
        break;
      default:
        break;
    }
  }
  registrar();
  return true;
}

export function distribuir(itens, eixo) {
  if (itens.length < 3) return false;
  const horizontal = eixo === "horizontal";
  const ordenados = [...itens].sort((a, b) =>
    horizontal ? a.bounds.center.x - b.bounds.center.x : a.bounds.center.y - b.bounds.center.y,
  );
  const primeiro = ordenados[0].bounds.center;
  const ultimo = ordenados[ordenados.length - 1].bounds.center;
  const total = horizontal ? ultimo.x - primeiro.x : ultimo.y - primeiro.y;
  const passo = total / (ordenados.length - 1);
  ordenados.forEach((item, indice) => {
    if (indice === 0 || indice === ordenados.length - 1) return;
    const alvo = (horizontal ? primeiro.x : primeiro.y) + passo * indice;
    const atual = horizontal ? item.bounds.center.x : item.bounds.center.y;
    item.position = item.position.add(horizontal ? [alvo - atual, 0] : [0, alvo - atual]);
  });
  registrar();
  return true;
}

export function ordenar(itens, acao) {
  if (!itens.length) return false;
  for (const item of itens) {
    switch (acao) {
      case "frente":
        item.bringToFront();
        break;
      case "tras":
        item.sendToBack();
        break;
      case "avancar":
        if (item.nextSibling) item.insertAbove(item.nextSibling);
        break;
      case "recuar":
        if (item.previousSibling) item.insertBelow(item.previousSibling);
        break;
      default:
        break;
    }
  }
  registrar();
  return true;
}

export function centralizarNaMesa(itens) {
  if (!itens.length) return false;
  const area = caixaGeral(itens);
  const centroMesa = new cena.paper.Point(cena.mesa.largura / 2, cena.mesa.altura / 2);
  const passo = centroMesa.subtract(area.center);
  for (const item of itens) item.position = item.position.add(passo);
  registrar();
  return true;
}
