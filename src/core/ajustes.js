// Preferências do usuário.
// Mudanças valem na hora, mas só ficam guardadas quando o usuário salva.

import { avisar } from "./eventos.js";

export const CHAVE = "buradesign:ajustes";

export const PADRAO = Object.freeze({
  tema: "escuro",
  som: true,
  volume: 0.5,
  unidade: "cm",
  snap: 5,
  bootRapido: false,
  avisoDispositivo: true,
  alcas: 1,
  opacidadeBase: 0.35,
  gridMilimetros: false,
  salvarSozinho: true,
  idioma: "pt-BR",
});

let atuais = { ...PADRAO };
let salvos = { ...PADRAO };

function ler() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    const limpo = {};
    for (const chave of Object.keys(PADRAO)) {
      if (chave in dados) limpo[chave] = dados[chave];
    }
    return limpo;
  } catch {
    return null;
  }
}

export function iniciar() {
  const guardados = ler();
  atuais = { ...PADRAO, ...(guardados || {}) };
  salvos = { ...atuais };
  aplicarTema();
  return atuais;
}

export function tudo() {
  return { ...atuais };
}

export function valor(chave) {
  return atuais[chave];
}

export function definir(chave, novo) {
  if (!(chave in PADRAO)) return;
  atuais[chave] = novo;
  if (chave === "tema") aplicarTema();
  avisar("ajuste:mudou", { chave, valor: novo });
}

export function temPendencia() {
  return Object.keys(PADRAO).some((chave) => atuais[chave] !== salvos[chave]);
}

export function salvar() {
  localStorage.setItem(CHAVE, JSON.stringify(atuais));
  salvos = { ...atuais };
  avisar("ajuste:salvo", tudo());
}

export function restaurarPadrao() {
  atuais = { ...PADRAO };
  aplicarTema();
  avisar("ajuste:mudou", { chave: "*", valor: null });
}

export function descartarNaoSalvos() {
  atuais = { ...salvos };
  aplicarTema();
  avisar("ajuste:mudou", { chave: "*", valor: null });
}

export function esquecerGuardados() {
  localStorage.removeItem(CHAVE);
  salvos = { ...PADRAO };
}

function aplicarTema() {
  document.documentElement.dataset.tema = atuais.tema;
  const cores = {
    escuro: "#000000",
    claro: "#ffffff",
    sistema: "#23272b",
    rosa: "#2a0f33",
    flash: "#fffdfd",
    gloom: "#2a0708",
    simpzons: "#4a3a05",
  };
  const cor = cores[atuais.tema] || "#000000";
  const etiqueta = document.querySelector('meta[name="theme-color"]');
  if (etiqueta) etiqueta.setAttribute("content", cor);
}
