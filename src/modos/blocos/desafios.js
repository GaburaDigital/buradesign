// Trilha de desafios de programação: a lista do lote e a ida e volta entre a
// lista e a bancada.
//
// A bancada é a mesma da programação livre — o desafio entra nela como uma
// missão. Assim não existem duas telas de programar para manter.

import { carregarEstilo } from "../../core/carregar-script.js";
import { tocar } from "../../core/som.js";
import { ferramenta } from "../../ui/icones-ferramentas.js";
import { icone } from "../../ui/icones.js";
import { confirmar, mostrarAviso } from "../../ui/painel.js";
import { fala } from "../../ui/aliens.js";

import { LOTE as LOTE1 } from "./lote1.js";
import { LOTE as LOTE2 } from "./lote2.js";
import { LOTE as LOTE3 } from "./lote3.js";
import * as progresso from "./progresso.js";

const LOTES = [LOTE1, LOTE2, LOTE3];

let areaAtual = null;
let bancada = null;
let voltarDaCasca = () => {};

function estrelasEmSvg(quantas) {
  return [0, 1, 2]
    .map(
      (i) =>
        `<span class="desafio__estrela${i < quantas ? " desafio__estrela--cheia" : ""}">${ferramenta("estrela")}</span>`,
    )
    .join("");
}

export async function montar(area, setor, aoVoltar) {
  carregarEstilo("styles/livre.css");
  carregarEstilo("styles/blocos.css");
  areaAtual = area;
  voltarDaCasca = aoVoltar;
  encerrarBancada();
  mostrarLista();
}

function mostrarLista() {
  const area = areaAtual;
  area.innerHTML = "";
  area.classList.remove("conteudo--cheio");

  const tela = document.createElement("div");
  tela.className = "inicio trilha";
  tela.innerHTML = `
    <div class="inicio__cabecalho">
      <h1>Desafios de programação</h1>
      <p>Três lotes: das medidas na mão até peças que encaixam umas nas outras.</p>
    </div>
    ${fala("nibla", "Pode fazer na ordem que quiser e pular o que travar. A estrela fica guardada.")}`;
  area.append(tela);

  LOTES.forEach((lote, indiceDoLote) => {
    const conta = progresso.resumo(lote.desafios);
    const secao = document.createElement("section");
    secao.className = "trilha__lote";
    secao.innerHTML = `
      <h2 class="trilha__titulo">${lote.nome}</h2>
      <p class="trilha__descricao">${lote.descricao}</p>
      <p class="trilha__placar">
        ${conta.feitos} de ${conta.total} resolvidos — ${conta.estrelas} de ${conta.maximo} estrelas
      </p>
      <ol class="trilha__lista"></ol>`;
    const lista = secao.querySelector(".trilha__lista");
    lote.desafios.forEach((desafio, indice) => {
      const nota = progresso.resultadoDe(desafio.id);
      const item = document.createElement("li");
      item.className = `trilha__item${nota?.estrelas ? " trilha__item--feito" : ""}`;
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "trilha__botao";
      botao.innerHTML = `
        <span class="trilha__numero">${String(indice + 1).padStart(2, "0")}</span>
        <span class="trilha__nome">${desafio.nome}</span>
        <span class="desafio__estrelas">${estrelasEmSvg(nota?.estrelas || 0)}</span>
        <span class="trilha__porcento">${nota ? `${nota.porcentagem}%` : ""}</span>`;
      botao.addEventListener("click", () => abrir(indiceDoLote, indice));
      item.append(botao);
      lista.append(item);
    });

    const acoes = document.createElement("div");
    acoes.className = "trilha__acoes";
    const continuar = document.createElement("button");
    continuar.type = "button";
    continuar.className = "botao botao--destaque";
    continuar.innerHTML = `${ferramenta("iniciar")}<span>Continuar o lote ${lote.numero}</span>`;
    continuar.addEventListener("click", () => {
      const proximo = lote.desafios.findIndex(
        (d) => (progresso.resultadoDe(d.id)?.estrelas || 0) < 3,
      );
      abrir(indiceDoLote, proximo === -1 ? 0 : proximo);
    });
    const sorteio = document.createElement("button");
    sorteio.type = "button";
    sorteio.className = "botao";
    sorteio.innerHTML = `${ferramenta("desafios")}<span>Sortear</span>`;
    sorteio.addEventListener("click", () => {
      abrir(indiceDoLote, Math.floor(Math.random() * lote.desafios.length));
    });
    acoes.append(continuar, sorteio);
    secao.append(acoes);
    tela.append(secao);
  });

  const rodape = document.createElement("div");
  rodape.className = "trilha__acoes";

  const zerar = document.createElement("button");
  zerar.type = "button";
  zerar.className = "botao botao--perigo";
  zerar.innerHTML = `${icone("lixeira")}<span>Zerar minhas estrelas</span>`;
  zerar.addEventListener("click", async () => {
    if (!(await confirmar("Isso apaga as estrelas deste navegador. Continuar?"))) return;
    progresso.limpar();
    mostrarLista();
    mostrarAviso("Estrelas zeradas.");
  });

  const voltar = document.createElement("button");
  voltar.type = "button";
  voltar.className = "botao";
  // Este botão volta para a escolha entre livre e desafios, não para a tela
  // inicial: o rótulo precisa dizer isso.
  voltar.innerHTML = `${icone("voltar")}<span>Voltar às opções</span>`;
  voltar.addEventListener("click", () => {
    tocar("clique");
    voltarDaCasca();
  });

  rodape.append(zerar, voltar);
  tela.append(rodape);
}

async function abrir(indiceDoLote, indice) {
  const lote = LOTES[Math.max(0, Math.min(LOTES.length - 1, indiceDoLote))];
  const posicao = Math.max(0, Math.min(lote.desafios.length - 1, indice));
  const dados = lote.desafios[posicao];
  tocar("clique");
  encerrarBancada();

  const modulo = await import("./livre.js");
  bancada = modulo;
  await modulo.montar(areaAtual, { id: "desafio" }, () => mostrarLista(), {
    desafio: {
      dados,
      indice: posicao,
      total: lote.desafios.length,
      lote: lote.numero,
      // No lote 2 o enunciado não dá medida: a peça pronta é a referência.
      mostrarGabarito: Boolean(lote.mostrarGabarito),
      estrelas: progresso.resultadoDe(dados.id)?.estrelas || 0,
      aoAvaliar: (resultado) => {
        const melhorou = progresso.guardarResultado(dados.id, resultado);
        if (melhorou && resultado.estrelas === 3) {
          mostrarAviso(`"${dados.nome}" com três estrelas.`);
        }
      },
      aoNavegar: (direcao) => {
        if (direcao === "lista") {
          encerrarBancada();
          mostrarLista();
          return;
        }
        if (direcao === "pular") progresso.marcarPulado(dados.id);
        const passo = direcao === "anterior" ? -1 : 1;
        const destino = posicao + passo;
        if (destino < 0 || destino >= lote.desafios.length) {
          mostrarAviso(
            destino < 0 ? "Este é o primeiro do lote." : "Fim do lote. Volte à lista para o próximo.",
            "alerta",
          );
          return;
        }
        abrir(indiceDoLote, destino);
      },
    },
  });
}

function encerrarBancada() {
  if (bancada && typeof bancada.encerrar === "function") {
    try {
      bancada.encerrar();
    } catch (erro) {
      console.warn("Falha ao encerrar a bancada", erro);
    }
  }
  bancada = null;
}

export function encerrar() {
  encerrarBancada();
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
}
