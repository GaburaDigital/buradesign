// A Bolsa é única e global. Peças criadas em qualquer setor entram aqui e
// podem ser usadas em qualquer outro setor.

import * as deposito from "./deposito.js";
import { avisar } from "./eventos.js";

export const FORMATO = "buradesign.bolsa";
export const VERSAO_FORMATO = 1;

export const TIPOS = Object.freeze({
  peca2d: "Peça 2D",
  peca3d: "Peça 3D",
  montagem: "Montagem",
});

export async function listar() {
  return deposito.listar("bolsa");
}

export async function adicionar({ nome, tipo = "peca3d", origem = "desconhecida", dados = {} }) {
  const item = {
    id: deposito.novoId("peca"),
    nome: (nome || "Peça sem nome").slice(0, 80),
    tipo: tipo in TIPOS ? tipo : "peca3d",
    origem,
    criadoEm: Date.now(),
    dados,
  };
  await deposito.guardar("bolsa", item);
  avisar("bolsa:mudou");
  return item;
}

export async function remover(id) {
  await deposito.remover("bolsa", id);
  avisar("bolsa:mudou");
}

export async function esvaziar() {
  await deposito.limpar("bolsa");
  avisar("bolsa:mudou");
}

export async function exportar() {
  const itens = await listar();
  return {
    formato: FORMATO,
    versao: VERSAO_FORMATO,
    geradoEm: new Date().toISOString(),
    itens,
  };
}

// Importa somando ao que já existe. Nunca apaga a bolsa atual.
export async function importar(conteudo, { substituir = false } = {}) {
  if (!conteudo || conteudo.formato !== FORMATO || !Array.isArray(conteudo.itens)) {
    throw new Error("Este arquivo não é uma bolsa do BuraDESIGN.");
  }
  if (substituir) await deposito.limpar("bolsa");
  const existentes = new Set((await listar()).map((item) => item.id));
  let somados = 0;
  for (const bruto of conteudo.itens) {
    if (!bruto || typeof bruto !== "object") continue;
    const item = {
      id: existentes.has(bruto.id) || !bruto.id ? deposito.novoId("peca") : bruto.id,
      nome: String(bruto.nome || "Peça importada").slice(0, 80),
      tipo: bruto.tipo in TIPOS ? bruto.tipo : "peca3d",
      origem: String(bruto.origem || "importada"),
      criadoEm: Number(bruto.criadoEm) || Date.now(),
      dados: bruto.dados && typeof bruto.dados === "object" ? bruto.dados : {},
    };
    await deposito.guardar("bolsa", item);
    existentes.add(item.id);
    somados += 1;
  }
  avisar("bolsa:mudou");
  return somados;
}
