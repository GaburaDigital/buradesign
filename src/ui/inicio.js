// Tela inicial: escolha do setor.

import { SETORES } from "../modos/registro.js";
import { t } from "../core/idioma.js";
import { valor } from "../core/ajustes.js";
import { tocar } from "../core/som.js";
import { alien, ELENCO } from "./aliens.js";
import { icone } from "./icones.js";

function telaPequena() {
  return window.matchMedia("(max-width: 48rem)").matches || window.innerHeight < 500;
}

export function montarInicio(area, aoEscolher) {
  area.innerHTML = `
    <div class="inicio">
      <div class="inicio__cabecalho">
        <h1>${t("inicio.titulo")}</h1>
        <p>${t("inicio.subtitulo")}</p>
      </div>
      <ul class="setores"></ul>
    </div>`;

  if (valor("avisoDispositivo") && telaPequena()) {
    const tira = document.createElement("div");
    tira.className = "tira-aviso";
    tira.innerHTML = `${icone("aviso")}<p>${t("inicio.avisoDispositivo")}</p>`;
    area.querySelector(".inicio__cabecalho").after(tira);
  }

  const lista = area.querySelector(".setores");
  for (const setor of SETORES) {
    const ficha = ELENCO[setor.alien];
    const item = document.createElement("li");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "setor";
    botao.innerHTML = `
      <span class="setor__alien">${alien(setor.alien)}</span>
      <span class="setor__nome">${t(setor.chaveNome)}</span>
      <p class="setor__descricao">${t(setor.chaveDescricao)}</p>
      <span class="setor__estado ${setor.aberto ? "setor__estado--aberto" : ""}">
        ${ficha.nome} · ${setor.aberto ? t("inicio.aberto") : t("inicio.emObras")}
      </span>`;
    botao.addEventListener("click", () => {
      tocar(setor.aberto ? "clique" : ficha.som);
      aoEscolher(setor);
    });
    item.append(botao);
    lista.append(item);
  }
}
