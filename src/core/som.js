// Todos os sons são gerados na hora pela Web Audio API. Nenhum arquivo de
// áudio no repositório, nada para baixar, funciona offline.
// Duas famílias: bipes de terminal para o sistema, vozes curtas para os aliens.

import { valor } from "./ajustes.js";

let contexto = null;
let mestre = null;

function pronto() {
  if (!valor("som")) return null;
  if (!contexto) {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return null;
    contexto = new Contexto();
    mestre = contexto.createGain();
    mestre.connect(contexto.destination);
  }
  if (contexto.state === "suspended") contexto.resume();
  mestre.gain.value = Math.min(1, Math.max(0, valor("volume")));
  return contexto;
}

// O Safari exige um gesto do usuário antes de liberar o áudio.
export function liberarNoPrimeiroToque() {
  const liberar = () => {
    pronto();
    window.removeEventListener("pointerdown", liberar);
    window.removeEventListener("keydown", liberar);
  };
  window.addEventListener("pointerdown", liberar, { once: true });
  window.addEventListener("keydown", liberar, { once: true });
}

function bipe({ de, para = de, duracao = 0.08, tipo = "square", ganho = 0.18, atraso = 0 }) {
  const ctx = pronto();
  if (!ctx) return;
  const inicio = ctx.currentTime + atraso;
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(de, inicio);
  if (para !== de) osc.frequency.exponentialRampToValueAtTime(para, inicio + duracao);
  vol.gain.setValueAtTime(0.0001, inicio);
  vol.gain.exponentialRampToValueAtTime(ganho, inicio + 0.008);
  vol.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
  osc.connect(vol).connect(mestre);
  osc.start(inicio);
  osc.stop(inicio + duracao + 0.02);
}

function voz({ base = 220, saltos = [1, 1.6, 1.2], duracao = 0.26, ganho = 0.14 }) {
  const ctx = pronto();
  if (!ctx) return;
  const inicio = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filtro = ctx.createBiquadFilter();
  const vol = ctx.createGain();
  osc.type = "sawtooth";
  filtro.type = "lowpass";
  filtro.frequency.value = 1200;
  filtro.Q.value = 6;
  osc.frequency.setValueAtTime(base, inicio);
  saltos.forEach((fator, indice) => {
    const quando = inicio + (duracao / saltos.length) * (indice + 1);
    osc.frequency.setValueAtTime(base * fator, quando);
  });
  vol.gain.setValueAtTime(0.0001, inicio);
  vol.gain.exponentialRampToValueAtTime(ganho, inicio + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
  osc.connect(filtro).connect(vol).connect(mestre);
  osc.start(inicio);
  osc.stop(inicio + duracao + 0.02);
}

const RECEITAS = {
  tecla: () => bipe({ de: 1400, duracao: 0.02, ganho: 0.05 }),
  clique: () => bipe({ de: 900, duracao: 0.035, ganho: 0.1 }),
  abrir: () => {
    bipe({ de: 520, duracao: 0.05 });
    bipe({ de: 780, duracao: 0.06, atraso: 0.05 });
  },
  fechar: () => {
    bipe({ de: 780, duracao: 0.05 });
    bipe({ de: 460, duracao: 0.06, atraso: 0.05 });
  },
  salvar: () => {
    bipe({ de: 660, duracao: 0.06 });
    bipe({ de: 990, duracao: 0.09, atraso: 0.06 });
  },
  erro: () => bipe({ de: 220, para: 120, duracao: 0.22, tipo: "sawtooth", ganho: 0.16 }),
  bloqueado: () => bipe({ de: 180, duracao: 0.12, tipo: "triangle", ganho: 0.14 }),
  boot: () => bipe({ de: 320, para: 960, duracao: 0.35, tipo: "triangle", ganho: 0.12 }),
  pronto: () => {
    bipe({ de: 660, duracao: 0.07 });
    bipe({ de: 880, duracao: 0.07, atraso: 0.08 });
    bipe({ de: 1320, duracao: 0.14, atraso: 0.16 });
  },
  alienOi: () => voz({ base: 260, saltos: [1.4, 0.9, 1.7] }),
  alienResmungo: () => voz({ base: 120, saltos: [0.9, 0.7], duracao: 0.34 }),
  alienAnimado: () => voz({ base: 340, saltos: [1.3, 1.8, 2.2], duracao: 0.3 }),
};

export function tocar(nome) {
  const receita = RECEITAS[nome];
  if (!receita) return;
  try {
    receita();
  } catch (erro) {
    console.warn("Som indisponível", erro);
  }
}

export function nomesDisponiveis() {
  return Object.keys(RECEITAS);
}
