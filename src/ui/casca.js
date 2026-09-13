// A casca é o que fica na tela em todos os setores: barra de topo, área de
// conteúdo e barra inferior.

import { t } from "../core/idioma.js";
import { icone } from "./icones.js";
import { abrirAjustes } from "./painel-ajustes.js";
import { abrirBolsa } from "./painel-bolsa.js";
import { montarInicio } from "./inicio.js";
import { tocar } from "../core/som.js";

export const REPOSITORIO = "https://github.com/GaburaDigital/buradesign";
export const LINKS_GABURA = "https://sites.google.com/view/links-gabura";

const topo = () => document.getElementById("barra-topo");
const base = () => document.getElementById("barra-base");
const conteudo = () => document.getElementById("conteudo");

function montarTopo() {
  topo().innerHTML = "";

  const marca = document.createElement("button");
  marca.type = "button";
  marca.className = "marca";
  marca.innerHTML = `${icone("cubo")}<span>Bura<span class="marca__design">DESIGN</span></span>`;
  marca.addEventListener("click", () => irParaInicio());

  const espaco = document.createElement("div");
  espaco.className = "barra-topo__espaco";

  const acoes = document.createElement("div");
  acoes.className = "barra-topo__acoes";
  acoes.append(
    botaoDeAcao("bolsa", t("acoes.bolsa"), abrirBolsa),
    botaoDeAcao("engrenagem", t("acoes.ajustes"), abrirAjustes),
  );

  topo().append(marca, espaco, acoes);
}

function botaoDeAcao(nomeIcone, rotulo, aoClicar) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao";
  botao.innerHTML = `${icone(nomeIcone)}<span class="rotulo-acao">${rotulo}</span>`;
  botao.addEventListener("click", () => {
    tocar("clique");
    aoClicar();
  });
  return botao;
}

function montarBase() {
  base().innerHTML = `
    <p class="barra-base__credito">
      criado por GABURA - estude, aprenda e compartilhe mais exercício em:
      <a href="${LINKS_GABURA}" target="_blank" rel="noopener noreferrer">${LINKS_GABURA}</a>
    </p>
    <a class="botao" href="${REPOSITORIO}" target="_blank" rel="noopener noreferrer">
      ${icone("janela")}<span>${t("acoes.repositorio")}</span>
    </a>`;
}

export function irParaInicio() {
  montarInicio(conteudo(), abrirSetor);
  conteudo().focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

async function abrirSetor(setor) {
  const modulo = await setor.carregar();
  modulo.montar(conteudo(), setor, irParaInicio);
  conteudo().focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

export function montarCasca() {
  montarTopo();
  montarBase();
  irParaInicio();
  document.getElementById("aplicacao").hidden = false;
}
