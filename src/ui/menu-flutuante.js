// Botão que guarda várias ferramentas parecidas. Clicar abre um menu
// flutuante com as opções; escolher uma fecha o menu e passa a mostrar o
// ícone da escolhida. Serve para encolher a barra, o que faz muita diferença
// no celular.

import { ferramenta } from "./icones-ferramentas.js";
import { tocar } from "../core/som.js";

let abertoAgora = null;

function fecharAberto() {
  if (!abertoAgora) return;
  abertoAgora.menu.remove();
  abertoAgora.botao.setAttribute("aria-expanded", "false");
  abertoAgora = null;
}

document.addEventListener("pointerdown", (evento) => {
  if (!abertoAgora) return;
  if (abertoAgora.raiz.contains(evento.target)) return;
  fecharAberto();
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") fecharAberto();
});

// opcoes: [{ id, icone, rotulo, aoEscolher }]
export function grupoDeFerramentas({ id, icone, rotulo, opcoes, aoEscolher, modo = "acao" }) {
  const raiz = document.createElement("div");
  raiz.className = "grupo-ferramenta";
  raiz.dataset.grupo = id;

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = modo === "barra" ? "botao grupo-ferramenta__botao" : "ferramenta grupo-ferramenta__botao";
  botao.title = rotulo;
  botao.setAttribute("aria-label", rotulo);
  botao.setAttribute("aria-haspopup", "true");
  botao.setAttribute("aria-expanded", "false");
  botao.innerHTML = `${ferramenta(icone)}<span class="rotulo-acao">${rotulo}</span><span class="grupo-ferramenta__seta" aria-hidden="true"></span>`;

  const abrir = () => {
    if (abertoAgora && abertoAgora.raiz === raiz) {
      fecharAberto();
      return;
    }
    fecharAberto();
    const menu = document.createElement("div");
    menu.className = "grupo-ferramenta__menu";
    menu.setAttribute("role", "menu");
    for (const opcao of opcoes) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "grupo-ferramenta__item";
      item.setAttribute("role", "menuitem");
      item.innerHTML = `${ferramenta(opcao.icone)}<span>${opcao.rotulo}</span>`;
      item.addEventListener("click", () => {
        fecharAberto();
        tocar("clique");
        if (modo !== "barra") {
          botao.innerHTML = `${ferramenta(opcao.icone)}<span class="rotulo-acao">${opcao.rotulo}</span><span class="grupo-ferramenta__seta" aria-hidden="true"></span>`;
          botao.title = opcao.rotulo;
          botao.setAttribute("aria-label", opcao.rotulo);
        }
        (opcao.aoEscolher || aoEscolher)(opcao);
      });
      menu.append(item);
    }
    raiz.append(menu);
    botao.setAttribute("aria-expanded", "true");
    abertoAgora = { raiz, menu, botao };
    menu.querySelector("button")?.focus();
  };

  botao.addEventListener("click", () => {
    tocar("clique");
    abrir();
  });

  raiz.append(botao);
  return raiz;
}

export function fecharMenusFlutuantes() {
  fecharAberto();
}
