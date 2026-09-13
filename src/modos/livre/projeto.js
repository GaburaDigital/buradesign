// Guardar e sair: cache do navegador, arquivo do projeto, exportação em SVG
// e envio de peças para a Bolsa.

import { cena, limparSelecao, definirSelecao, paleta, proximaCor } from "./estado.js";
import * as deposito from "../../core/deposito.js";
import { adicionar as guardarNaBolsa } from "../../core/bolsa.js";
import { baixarTexto, baixarJSON, carimboDeData } from "../../core/arquivos.js";

export const FORMATO = "buradesign.projeto";
export const VERSAO = 1;
export const ID_CACHE = "livre2d:atual";

export function empacotar(nome) {
  return {
    formato: FORMATO,
    versao: VERSAO,
    modo: "livre2d",
    nome: nome || "Projeto sem nome",
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

// Salvamento automático: sempre na mesma gaveta, para o aluno não perder o
// trabalho se o computador travar ou a aba fechar.
export async function salvarNoCache(nome) {
  const pacote = empacotar(nome);
  await deposito.guardar("projetos", {
    id: ID_CACHE,
    nome: pacote.nome,
    criadoEm: Date.now(),
    pacote,
  });
  return pacote;
}

// Salvamento com nome: cada um vira uma gaveta própria no navegador.
export async function salvarComNome(nome) {
  const pacote = empacotar(nome);
  const registro = {
    id: deposito.novoId("projeto"),
    nome: pacote.nome,
    modo: "livre2d",
    criadoEm: Date.now(),
    pacote,
  };
  await deposito.guardar("projetos", registro);
  return registro;
}

export async function listarSalvos() {
  const todos = await deposito.listar("projetos");
  return todos.filter((registro) => registro.id !== ID_CACHE);
}

export async function apagarSalvo(id) {
  await deposito.remover("projetos", id);
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

export function baixarProjeto(nome) {
  const limpo = nomeDeArquivo(nome || "projeto_2d");
  baixarJSON(`${limpo}_${carimboDeData()}.burad.json`, empacotar(nome));
}

// Nome de arquivo seguro: sem acento, sem espaço, sem barra.
export function nomeDeArquivo(bruto) {
  return (
    String(bruto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "sem_nome"
  );
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

export function exportarSVG(opcoes = {}) {
  const texto = montarSVG(opcoes);
  const limpo = nomeDeArquivo(opcoes.nome || "corte_2d");
  baixarTexto(`${limpo}_${carimboDeData()}.svg`, texto, "image/svg+xml");
  return texto;
}

// Traz uma peça da bolsa para a mesa.
export function colocarSVGNaMesa(svg, nome) {
  if (!svg) return null;
  // Peças antigas da bolsa guardavam só o <g>. O importador precisa de um
  // documento SVG completo, então embrulhamos quando faltar.
  const documento = String(svg).trim().startsWith("<svg")
    ? svg
    : `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
  const importado = cena.paper.project.importSVG(documento, { expandShapes: true, insert: false });
  if (!importado) return null;
  cena.camadaPecas.addChild(importado);
  const tons = paleta();
  const vestirTudo = (item) => {
    if (item.children && item.children.length && !item.segments) item.children.forEach(vestirTudo);
    item.strokeColor = tons.contorno;
    item.strokeWidth = 0.4;
    item.strokeScaling = false;
  };
  vestirTudo(importado);
  importado.data = {
    tipo: "caminho",
    params: {},
    rotacao: 0,
    cor: proximaCor(),
    negativo: false,
    veioDaBolsa: nome || "",
  };
  importado.position = new cena.paper.Point(cena.mesa.largura / 2, cena.mesa.altura / 2);
  definirSelecao([importado]);
  return importado;
}

// --- Bolsa ------------------------------------------------------------

export async function enviarParaBolsa(nome) {
  if (!cena.selecao.length) return null;
  const grupo = new cena.paper.Group(cena.selecao.map((item) => item.clone({ insert: false })));
  cena.camadaPecas.addChild(grupo);
  const caixa = grupo.bounds;
  const miolo = grupo.exportSVG({ asString: true, precision: 4 });
  grupo.remove();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${caixa.width.toFixed(2)}mm"` +
    ` height="${caixa.height.toFixed(2)}mm">${miolo}</svg>`;

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
