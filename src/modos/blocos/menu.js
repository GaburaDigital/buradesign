// Porta de entrada do setor Design com Programação.
// O aluno escolhe entre programar livre, sem nota nem meta, e a trilha de
// desafios. Os desafios chegam no próximo lote; a porta já fica aqui para a
// tela não mudar de lugar depois.

import { carregarEstilo } from "../../core/carregar-script.js";
import { t } from "../../core/idioma.js";
import { tocar } from "../../core/som.js";
import { ferramenta } from "../../ui/icones-ferramentas.js";
import { icone } from "../../ui/icones.js";
import { mostrarAviso } from "../../ui/painel.js";
import { fala } from "../../ui/aliens.js";

const OPCOES = [
  {
    id: "programaLivre",
    icone: "programaLivre",
    nome: "Programação de modelo livre",
    descricao: "Tela dividida: blocos de um lado, modelo 3D do outro. Sem meta, sem relógio.",
    detalhes: [
      "Blocos de ponteiro, formas, combinar e repetir",
      "Iniciar, iniciar no modo lento e parar",
      "A câmera anda à vontade; o modelo é só do programa",
      "Exporta STL, guarda na bolsa e salva o programa",
    ],
    carregar: () => import("./livre.js"),
  },
  {
    id: "desafios",
    icone: "desafios",
    nome: "Desafios de programação",
    descricao: "Sessenta missões em três lotes, do primeiro cubo até uma caixa com tampa que encaixa.",
    detalhes: [
      "Lote 1: com as medidas no enunciado",
      "Lote 2: sem medida — a peça pronta aparece em 3D para você contar e comparar",
      "Lote 3: peças que encaixam, laço dentro de laço e bloco seu com parâmetro",
      "Ordem livre, com dicas e desafio pulável",
    ],
    carregar: () => import("./desafios.js"),
  },
];

let moduloAberto = null;
let areaAtual = null;

export async function montar(area, setor, aoVoltar) {
  carregarEstilo("styles/livre.css");
  areaAtual = area;
  encerrarFilho();
  area.innerHTML = "";
  area.classList.remove("conteudo--cheio");

  const telaInicial = document.createElement("div");
  telaInicial.className = "inicio";
  telaInicial.innerHTML = `
    <div class="inicio__cabecalho">
      <h1>${t("setores.blocos.nome")}</h1>
      <p>${t("setores.blocos.descricao")}</p>
    </div>
    ${fala("nibla", "Aqui a peça não sai da sua mão: sai da sua ordem. Escreve o passo a passo e a máquina monta.")}
    <ul class="modos"></ul>`;
  area.append(telaInicial);

  const lista = telaInicial.querySelector(".modos");
  for (const opcao of OPCOES) {
    const item = document.createElement("li");
    item.className = `modo${opcao.emObras ? " modo--fechado" : ""}`;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "modo__botao";
    botao.innerHTML = `${ferramenta(opcao.icone)}<span>${opcao.nome}</span>`;
    botao.addEventListener("click", () => {
      if (opcao.emObras) {
        tocar("erro");
        mostrarAviso("Os desafios chegam no próximo lote. Por enquanto, programe livre.", "alerta");
        return;
      }
      abrir(opcao, area, aoVoltar);
    });

    const detalhes = document.createElement("div");
    detalhes.className = "modo__detalhes";
    detalhes.innerHTML = `<p>${opcao.descricao}</p><ul>${opcao.detalhes
      .map((linha) => `<li>${linha}</li>`)
      .join("")}</ul>`;

    item.append(botao, detalhes);
    lista.append(item);
  }

  const voltar = document.createElement("button");
  voltar.type = "button";
  voltar.className = "botao";
  voltar.innerHTML = `${icone("voltar")}<span>${t("acoes.voltar")}</span>`;
  voltar.addEventListener("click", () => {
    tocar("clique");
    aoVoltar();
  });
  telaInicial.append(voltar);
}

async function abrir(opcao, area, aoVoltarDaCasca) {
  tocar("clique");
  const modulo = await opcao.carregar();
  moduloAberto = modulo;
  await modulo.montar(area, opcao, () => {
    encerrarFilho();
    montar(area, opcao, aoVoltarDaCasca);
  });
}

function encerrarFilho() {
  if (moduloAberto && typeof moduloAberto.encerrar === "function") {
    try {
      moduloAberto.encerrar();
    } catch (erro) {
      console.warn("Falha ao encerrar o modo", erro);
    }
  }
  moduloAberto = null;
}

export function encerrar() {
  encerrarFilho();
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
}
