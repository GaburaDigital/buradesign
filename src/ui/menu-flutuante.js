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
  window.removeEventListener("resize", fecharAberto);
  window.removeEventListener("scroll", fecharAberto, true);
  abertoAgora = null;
}

// O menu vive no corpo da página, com posição fixa. Se ficasse dentro da
// barra, o "overflow" dela cortaria as opções, que foi o que aconteceu: os
// botões apareciam escondidos atrás da barra ou fora da tela.
function posicionar(menu, botao) {
  const area = botao.getBoundingClientRect();
  const folga = 8;
  menu.style.visibility = "hidden";
  menu.style.left = "0px";
  menu.style.top = "0px";
  document.body.append(menu);
  const tamanho = menu.getBoundingClientRect();
  const larguraTela = window.innerWidth;
  const alturaTela = window.innerHeight;

  // Preferência: abaixo do botão. Se não couber, acima. Se ainda não couber,
  // encosta na borda e rola por dentro do próprio menu.
  let topo = area.bottom + 4;
  if (topo + tamanho.height > alturaTela - folga) {
    const acima = area.top - tamanho.height - 4;
    topo = acima >= folga ? acima : Math.max(folga, alturaTela - tamanho.height - folga);
  }

  let esquerda = area.left;
  if (esquerda + tamanho.width > larguraTela - folga) {
    esquerda = Math.max(folga, area.right - tamanho.width);
  }
  esquerda = Math.max(folga, Math.min(esquerda, larguraTela - tamanho.width - folga));

  menu.style.left = `${Math.round(esquerda)}px`;
  menu.style.top = `${Math.round(topo)}px`;
  menu.style.maxHeight = `${Math.round(alturaTela - topo - folga)}px`;
  menu.style.visibility = "visible";
}

document.addEventListener("pointerdown", (evento) => {
  if (!abertoAgora) return;
  if (abertoAgora.raiz.contains(evento.target)) return;
  if (abertoAgora.menu.contains(evento.target)) return;
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
    posicionar(menu, botao);
    botao.setAttribute("aria-expanded", "true");
    abertoAgora = { raiz, menu, botao };
    window.addEventListener("resize", fecharAberto);
    window.addEventListener("scroll", fecharAberto, true);
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
