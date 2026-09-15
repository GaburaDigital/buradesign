// Estado compartilhado do setor Criação Livre em 2D.
// Todos os outros arquivos do setor conversam por aqui, o que evita que um
// precise importar o outro só para saber o que está selecionado.

import { valor } from "../../core/ajustes.js";
import { avisar } from "../../core/eventos.js";

export const cena = {
  paper: null,
  tela: null,
  camadaMesa: null,
  camadaPecas: null,
  camadaGuias: null,
  ferramenta: "selecionar",
  selecao: [],
  mesa: { largura: 200, altura: 200, grid: 10 },
};

export const CORES = {
  escuro: {
    fundoMesa: "#101417",
    gradeFina: "#242a30",
    gradeGrossa: "#3a434b",
    borda: "#7c858c",
    texto: "#9aa3a8",
    contorno: "#ffffff",
    guia: "#3fbf5f",
  },
  claro: {
    fundoMesa: "#f4f6f7",
    gradeFina: "#dde3e7",
    gradeGrossa: "#c0c8ce",
    borda: "#5c656b",
    texto: "#6b747a",
    contorno: "#101417",
    guia: "#0a7a33",
  },
  sistema: {
    fundoMesa: "#2b3238",
    gradeFina: "#3d464e",
    gradeGrossa: "#5d666e",
    borda: "#aab4bc",
    texto: "#c9d1d7",
    contorno: "#ffffff",
    guia: "#00d79a",
  },
  rosa: {
    fundoMesa: "#3a1545",
    gradeFina: "#4d2059",
    gradeGrossa: "#713287",
    borda: "#b167c9",
    texto: "#e6b9de",
    contorno: "#ffe9f7",
    guia: "#ff5f8d",
  },
  flash: {
    fundoMesa: "#fffdfd",
    gradeFina: "#ffdedb",
    gradeGrossa: "#f2b3ae",
    borda: "#b21f1f",
    texto: "#8c1c1c",
    contorno: "#5e0a0a",
    guia: "#e6a800",
  },
};

export const NEGATIVO = { contorno: "#e03131", preenchimento: "#ff9f43" };

export const CORES_PECA = [
  "#8fb8de",
  "#a9d6a0",
  "#f2d06b",
  "#e8a598",
  "#c5a6e0",
  "#9fd8d2",
  "#d9d9d9",
];

export function paleta() {
  return CORES[document.documentElement.dataset.tema] || CORES.escuro;
}

// Alças maiores ajudam quem está começando e quem usa o dedo na tela.
export function escalaDasAlcas() {
  const escala = Number(valor("alcas"));
  return Number.isFinite(escala) && escala > 0 ? escala : 1;
}

// --- Unidades ---------------------------------------------------------
// Internamente tudo é milímetro. A unidade escolhida vale só na interface.

export function unidade() {
  return valor("unidade") === "cm" ? "cm" : "mm";
}

export function deMm(milimetros) {
  return unidade() === "cm" ? milimetros / 10 : milimetros;
}

export function paraMm(numero) {
  return unidade() === "cm" ? numero * 10 : numero;
}

export function mostrar(milimetros, casas = 1) {
  return `${deMm(milimetros).toFixed(casas)} ${unidade()}`;
}

// --- Encaixe no grid --------------------------------------------------

export function passoDoEncaixe() {
  const passo = Number(valor("snap"));
  return Number.isFinite(passo) && passo > 0 ? passo : 0;
}

export function encaixar(numero) {
  const passo = passoDoEncaixe();
  return passo ? Math.round(numero / passo) * passo : numero;
}

export function encaixarPonto(ponto) {
  const passo = passoDoEncaixe();
  if (!passo) return ponto;
  return new cena.paper.Point(encaixar(ponto.x), encaixar(ponto.y));
}

// --- Seleção ----------------------------------------------------------

export function definirSelecao(itens) {
  cena.selecao = itens.filter((item) => item && item.parent === cena.camadaPecas);
  avisar("livre:selecao", cena.selecao);
}

export function limparSelecao() {
  definirSelecao([]);
}

export function pecas() {
  return cena.camadaPecas ? cena.camadaPecas.children.slice() : [];
}

export function proximaCor() {
  const usados = pecas().length;
  return CORES_PECA[usados % CORES_PECA.length];
}
