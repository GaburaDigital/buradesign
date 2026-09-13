// Texto. O caminho vem direto da fonte, pelo opentype.js, o que garante os
// acentos do português e um contorno pronto para corte.
// Itálico é inclinação aplicada ao caminho, porque as fontes embutidas só
// trazem normal e negrito.

import { cena, proximaCor } from "./estado.js";
import { vestir } from "./formas.js";

const INCLINACAO = 0.22;
let catalogoFontes = null;
const carregadas = new Map();

export const PADRAO = {
  texto: "Oficina",
  familia: "poppins",
  tamanho: 20,
  negrito: false,
  italico: false,
};

export async function carregarCatalogo() {
  if (catalogoFontes) return catalogoFontes;
  const resposta = await fetch("assets/fontes/fontes.json", { cache: "no-cache" });
  catalogoFontes = await resposta.json();
  return catalogoFontes;
}

export function familias() {
  return catalogoFontes ? catalogoFontes.familias : [];
}

function arquivoDa(familiaId, negrito) {
  const familia = familias().find((f) => f.id === familiaId) || familias()[0];
  if (!familia) return null;
  const escolhido = negrito ? familia.arquivos.negrito : familia.arquivos.normal;
  return `assets/fontes/${escolhido || familia.arquivos.normal}`;
}

function abrirFonte(caminho) {
  if (carregadas.has(caminho)) return carregadas.get(caminho);
  const promessa = new Promise((resolver, rejeitar) => {
    window.opentype.load(caminho, (erro, fonte) => {
      if (erro) rejeitar(erro);
      else resolver(fonte);
    });
  });
  carregadas.set(caminho, promessa);
  return promessa;
}

async function caminhoDoTexto(params) {
  const caminho = arquivoDa(params.familia, params.negrito);
  if (!caminho) throw new Error("Nenhuma fonte registrada.");
  const fonte = await abrirFonte(caminho);
  const desenho = fonte.getPath(params.texto || " ", 0, 0, params.tamanho);
  const dados = desenho.toPathData(3);
  if (!dados || dados.length < 2) return null;
  const composto = new cena.paper.CompoundPath(dados);
  if (params.italico) {
    const matriz = new cena.paper.Matrix(1, 0, -INCLINACAO, 1, 0, 0);
    composto.transform(matriz);
  }
  return composto;
}

export async function criar(posicao, params) {
  const dados = { ...PADRAO, ...(params || {}) };
  const composto = await caminhoDoTexto(dados);
  if (!composto) return null;
  composto.data = { tipo: "texto", params: dados, rotacao: 0, cor: proximaCor(), negativo: false };
  cena.camadaPecas.addChild(composto);
  composto.position = posicao;
  vestir(composto, composto.data.cor);
  return composto;
}

export async function regerar(item, novosParams) {
  const params = { ...item.data.params, ...novosParams };
  const composto = await caminhoDoTexto(params);
  if (!composto) return item;
  composto.data = { ...item.data, params };
  cena.camadaPecas.insertChild(item.index, composto);
  composto.position = item.position;
  if (item.data.rotacao) composto.rotate(item.data.rotacao, composto.position);
  vestir(composto, item.data.cor);
  item.remove();
  return composto;
}
