// Janelas no estilo terminal, confirmações e avisos que somem sozinhos.

import { icone } from "./icones.js";
import { tocar } from "../core/som.js";
import { t } from "../core/idioma.js";

const camada = () => document.getElementById("camada-paineis");
const caixaDeAvisos = () => document.getElementById("avisos");

let focoAnterior = null;

export function abrirPainel({ titulo, corpo, botoes = [], aoFechar }) {
  fecharPainel({ silencioso: true });
  focoAnterior = document.activeElement;

  const painel = document.createElement("section");
  painel.className = "painel";
  painel.setAttribute("role", "dialog");
  painel.setAttribute("aria-modal", "true");
  painel.setAttribute("aria-label", titulo);
  painel.innerHTML = `
    <header class="painel__topo">
      ${icone("janela")}
      <h2 class="painel__titulo">${titulo}</h2>
      <button class="botao botao--icone" data-fechar type="button" aria-label="${t("acoes.fechar")}">
        ${icone("fechar")}
      </button>
    </header>
    <div class="painel__corpo"></div>
    ${botoes.length ? '<footer class="painel__rodape"></footer>' : ""}`;

  painel.querySelector(".painel__corpo").append(
    typeof corpo === "string" ? criarDe(corpo) : corpo,
  );

  const rodape = painel.querySelector(".painel__rodape");
  if (rodape) {
    for (const definicao of botoes) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = `botao ${definicao.variante ? `botao--${definicao.variante}` : ""}`;
      botao.innerHTML = `${definicao.icone ? icone(definicao.icone) : ""}<span>${definicao.rotulo}</span>`;
      botao.addEventListener("click", () => definicao.aoClicar?.(painel));
      rodape.append(botao);
    }
  }

  painel.querySelector("[data-fechar]").addEventListener("click", () => fecharPainel());
  painel.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharPainel();
  });

  camada().append(painel);
  camada().dataset.aoFechar = "";
  camada()._aoFechar = aoFechar;
  tocar("abrir");

  const primeiro = painel.querySelector("button, select, input, a");
  (primeiro || painel).focus?.();
  return painel;
}

export function fecharPainel({ silencioso = false } = {}) {
  const area = camada();
  if (!area.firstChild) return;
  const retorno = area._aoFechar;
  area.innerHTML = "";
  area._aoFechar = null;
  if (!silencioso) tocar("fechar");
  retorno?.();
  if (focoAnterior && document.contains(focoAnterior)) focoAnterior.focus();
  focoAnterior = null;
}

export function painelAberto() {
  return Boolean(camada().firstChild);
}

function criarDe(html) {
  const suporte = document.createElement("div");
  suporte.innerHTML = html;
  const fragmento = document.createDocumentFragment();
  fragmento.append(...suporte.childNodes);
  return fragmento;
}

export function confirmar(pergunta) {
  return new Promise((resolver) => {
    const corpo = document.createElement("p");
    corpo.textContent = pergunta;
    let respondido = false;
    const responder = (resposta) => {
      if (respondido) return;
      respondido = true;
      resolver(resposta);
      fecharPainel();
    };
    abrirPainel({
      titulo: t("acoes.confirmar"),
      corpo,
      botoes: [
        { rotulo: t("acoes.confirmar"), variante: "destaque", aoClicar: () => responder(true) },
        { rotulo: t("acoes.cancelar"), aoClicar: () => responder(false) },
      ],
      aoFechar: () => responder(false),
    });
  });
}

export function mostrarAviso(texto, tipo = "ok") {
  const aviso = document.createElement("p");
  aviso.className = `aviso ${tipo === "ok" ? "" : `aviso--${tipo}`}`;
  aviso.textContent = texto;
  caixaDeAvisos().append(aviso);
  setTimeout(() => aviso.remove(), 4200);
}

// Pergunta um texto curto numa janela própria. Substitui o window.prompt, que
// alguns navegadores bloqueiam e que não combina com o visual da oficina.
export function perguntarTexto(titulo, pergunta, valorInicial = "") {
  return new Promise((resolver) => {
    const corpo = document.createElement("div");
    const rotulo = document.createElement("label");
    rotulo.className = "campo";
    rotulo.innerHTML = `<span class="campo__rotulo">${pergunta}</span>`;
    const campo = document.createElement("input");
    campo.type = "text";
    campo.value = valorInicial;
    campo.maxLength = 60;
    rotulo.append(campo);
    corpo.append(rotulo);

    let respondido = false;
    const responder = (resposta) => {
      if (respondido) return;
      respondido = true;
      resolver(resposta);
      fecharPainel();
    };

    campo.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") {
        evento.preventDefault();
        responder(campo.value.trim() || valorInicial);
      }
    });

    abrirPainel({
      titulo,
      corpo,
      botoes: [
        {
          rotulo: t("acoes.confirmar"),
          variante: "destaque",
          aoClicar: () => responder(campo.value.trim() || valorInicial),
        },
        { rotulo: t("acoes.cancelar"), aoClicar: () => responder(null) },
      ],
      aoFechar: () => responder(null),
    });

    setTimeout(() => {
      campo.focus();
      campo.select();
    }, 30);
  });
}
