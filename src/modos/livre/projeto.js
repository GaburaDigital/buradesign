// Guardar e sair: cache do navegador, arquivo do projeto, exportação em SVG
// e envio de peças para a Bolsa.

import { cena, limparSelecao } from "./estado.js";
import * as deposito from "../../core/deposito.js";
import { adicionar as guardarNaBolsa } from "../../core/bolsa.js";
import { baixarTexto, baixarJSON, carimboDeData } from "../../core/arquivos.js";

export const FORMATO = "buradesign.projeto";
export const VERSAO = 1;
export const ID_CACHE = "livre2d:atual";

export function empacotar() {
  return {
    formato: FORMATO,
    versao: VERSAO,
    modo: "livre2d",
    mesa: { ...cena.mesa },
    pecas: cena.camadaPecas.exportJSON({ asString: true, precision: 4 }),
    salvoEm: new Date().toISOString(),
  };
}

export function desempacotar(pacote) {
  if (!pacote || pacote.formato !== FORMATO) {
    throw new Error("Este arquivo não é um projeto do BuraDESIGN.");
  }
  limparSelecao();
  cena.camadaPecas.removeChildren();
  if (pacote.mesa) cena.mesa = { ...cena.mesa, ...pacote.mesa };
  if (pacote.pecas) {
    const recuperado = cena.paper.project.importJSON(pacote.pecas);
    if (recuperado && recuperado !== cena.camadaPecas) {
      cena.camadaPecas.addChildren(recuperado.children.slice());
      if (recuperado.remove) recuperado.remove();
    }
  }
  return cena.mesa;
}

export async function salvarNoCache() {
  const pacote = empacotar();
  await deposito.guardar("projetos", {
    id: ID_CACHE,
    nome: "Criação Livre 2D",
    criadoEm: Date.now(),
    pacote,
  });
  return pacote;
}

export async function lerDoCache() {
  try {
    const guardado = await deposito.buscar("projetos", ID_CACHE);
    return guardado ? guardado.pacote : null;
  } catch {
    return null;
  }
}

export async function limparCache() {
  try {
    await deposito.remover("projetos", ID_CACHE);
  } catch {
    // sem depósito disponível: nada a fazer
  }
}

export function baixarProjeto() {
  baixarJSON(`projeto_2d_${carimboDeData()}.burad.json`, empacotar());
}

// --- Exportação para corte -------------------------------------------

function prepararParaCorte() {
  const copia = cena.camadaPecas.clone({ insert: true });
  copia.visible = true;
  const normalizar = (item) => {
    if (item.children && item.children.length && !item.segments) {
      item.children.forEach(normalizar);
    }
    item.fillColor = null;
    item.strokeColor = "#000000";
    item.strokeWidth = 0.1;
    item.strokeScaling = true;
    item.dashArray = null;
    item.opacity = 1;
  };
  copia.children.forEach(normalizar);
  return copia;
}

export function montarSVG({ apenasSelecao = false } = {}) {
  const { largura, altura } = cena.mesa;
  let fonte;
  if (apenasSelecao && cena.selecao.length) {
    const grupo = new cena.paper.Group(cena.selecao.map((item) => item.clone({ insert: false })));
    cena.camadaPecas.addChild(grupo);
    fonte = grupo;
    const normalizar = (item) => {
      if (item.children && item.children.length && !item.segments) item.children.forEach(normalizar);
      item.fillColor = null;
      item.strokeColor = "#000000";
      item.strokeWidth = 0.1;
      item.dashArray = null;
    };
    normalizar(grupo);
  } else {
    fonte = prepararParaCorte();
  }

  const miolo = fonte.exportSVG({ asString: true, precision: 4 });
  fonte.remove();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     width="${largura}mm" height="${altura}mm"
     viewBox="0 0 ${largura} ${altura}">
  <title>BuraDESIGN</title>
${miolo}
</svg>
`;
}

export function exportarSVG(opcoes) {
  const texto = montarSVG(opcoes);
  baixarTexto(`corte_2d_${carimboDeData()}.svg`, texto, "image/svg+xml");
  return texto;
}

// --- Bolsa ------------------------------------------------------------

export async function enviarParaBolsa(nome) {
  if (!cena.selecao.length) return null;
  const grupo = new cena.paper.Group(cena.selecao.map((item) => item.clone({ insert: false })));
  cena.camadaPecas.addChild(grupo);
  const caixa = grupo.bounds;
  const svg = grupo.exportSVG({ asString: true, precision: 4 });
  grupo.remove();

  return guardarNaBolsa({
    nome: nome || "Peça 2D",
    tipo: "peca2d",
    origem: "livre2d",
    dados: {
      svg,
      larguraMm: Number(caixa.width.toFixed(2)),
      alturaMm: Number(caixa.height.toFixed(2)),
    },
  });
}
