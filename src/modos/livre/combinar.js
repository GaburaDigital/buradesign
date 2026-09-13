// Combinação de peças. Peça marcada como negativa apaga o que encosta.
// A peça combinada guarda uma cópia das originais, então dá para desunir.

import { cena, definirSelecao, proximaCor } from "./estado.js";
import { vestir, marcarNegativo } from "./formas.js";
import { registrar } from "./historico.js";

export function alternarNegativo(itens) {
  if (!itens.length) return false;
  const ligar = !itens.every((item) => item.data && item.data.negativo);
  for (const item of itens) marcarNegativo(item, ligar);
  registrar();
  return ligar;
}

function comoCaminho(item) {
  if (item.segments || item.children) return item;
  return item;
}

export function podeCombinar(itens) {
  return itens.length >= 2;
}

export function combinar(itens) {
  if (!podeCombinar(itens)) return null;
  const paper = cena.paper;
  const positivos = itens.filter((item) => !item.data.negativo);
  const negativos = itens.filter((item) => item.data.negativo);
  if (!positivos.length) return null;

  const memoria = itens.map((item) => item.exportJSON({ asString: true, precision: 4 }));
  const indice = Math.min(...itens.map((item) => item.index));
  const cor = positivos[0].data.cor || proximaCor();

  let resultado = comoCaminho(positivos[0]).clone({ insert: false });
  for (let i = 1; i < positivos.length; i += 1) {
    const proximo = resultado.unite(comoCaminho(positivos[i]), { insert: false });
    resultado.remove();
    resultado = proximo;
  }
  for (const negativo of negativos) {
    const proximo = resultado.subtract(comoCaminho(negativo), { insert: false });
    resultado.remove();
    resultado = proximo;
  }

  if (!resultado || (resultado.isEmpty && resultado.isEmpty())) {
    resultado?.remove();
    return null;
  }

  resultado.data = {
    tipo: "combinado",
    params: {},
    rotacao: 0,
    cor,
    negativo: false,
    origem: memoria,
  };
  cena.camadaPecas.insertChild(Math.max(0, indice), resultado);
  vestir(resultado, cor);
  for (const item of itens) item.remove();
  definirSelecao([resultado]);
  registrar();
  return resultado;
}

export function podeDesunir(itens) {
  return itens.length === 1 && Array.isArray(itens[0].data?.origem);
}

export function desunir(item) {
  if (!podeDesunir([item])) return null;
  const paper = cena.paper;
  const indice = item.index;
  const recuperados = [];
  item.data.origem.forEach((json, ordem) => {
    const recriado = paper.project.importJSON(json);
    if (!recriado) return;
    cena.camadaPecas.insertChild(indice + ordem, recriado);
    recuperados.push(recriado);
  });
  item.remove();
  definirSelecao(recuperados);
  registrar();
  return recuperados;
}

export function duplicar(itens) {
  if (!itens.length) return [];
  const copias = itens.map((item) => {
    const copia = item.clone();
    copia.position = copia.position.add([5, 5]);
    copia.data = { ...item.data, origem: item.data.origem ? [...item.data.origem] : undefined };
    return copia;
  });
  definirSelecao(copias);
  registrar();
  return copias;
}
