// Porta de entrada do setor Criação Livre: o aluno escolhe entre desenhar em
// 2D para corte ou modelar em 3D para impressão. Os dois modos moram em
// pastas próprias e são carregados só quando escolhidos.

import { carregarEstilo } from "../../core/carregar-script.js";
import { t } from "../../core/idioma.js";
import { tocar } from "../../core/som.js";
import { ferramenta } from "../../ui/icones-ferramentas.js";
import { icone } from "../../ui/icones.js";
import { fala } from "../../ui/aliens.js";

const OPCOES = [
  {
    id: "design2d",
    icone: "quadrado",
    chaveNome: "setores.design2d.nome",
    chaveDescricao: "setores.design2d.descricao",
    detalhes: [
      "Formas básicas, estrela e engrenagem",
      "Caneta bezier e remodelador de pontos",
      "Texto com acentos virando caminho",
      "Exporta SVG em milímetros para a cortadora",
    ],
    carregar: () => import("./indice.js"),
  },
  {
    id: "design3d",
    icone: "cubo3d",
    chaveNome: "setores.design3d.nome",
    chaveDescricao: "setores.design3d.descricao",
    detalhes: [
      "Catorze sólidos rígidos com medidas",
      "Peça negativa para abrir furos",
      "Importa STL, OBJ e GLB",
      "Exporta STL para a impressora 3D",
    ],
    carregar: () => import("../livre3d/indice.js"),
  },
];

let moduloAberto = null;
let areaAtual = null;

export async function montar(area, setor, aoVoltar) {
  // Sem isto, na primeira entrada a tela aparecia crua: o estilo do setor só
  // era carregado quando uma das bancadas abria.
  carregarEstilo("styles/livre.css");
  areaAtual = area;
  encerrarFilho();
  area.innerHTML = "";
  area.classList.remove("conteudo--cheio");

  const tela = document.createElement("div");
  tela.className = "inicio";
  tela.innerHTML = `
    <div class="inicio__cabecalho">
      <h1>${t("setores.livre.nome")}</h1>
      <p>${t("setores.livre.descricao")}</p>
    </div>
    ${fala("zorp", "Duas bancadas, mesma oficina. Escolhe uma; o que você criar numa pode ir para a outra pela bolsa.")}
    <ul class="modos"></ul>`;
  area.append(tela);

  const lista = tela.querySelector(".modos");
  for (const opcao of OPCOES) {
    const item = document.createElement("li");
    item.className = "modo";
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "modo__botao";
    botao.innerHTML = `${ferramenta(opcao.icone)}<span>${t(opcao.chaveNome)}</span>`;
    botao.addEventListener("click", () => abrir(opcao, area, aoVoltar));

    const detalhes = document.createElement("div");
    detalhes.className = "modo__detalhes";
    detalhes.innerHTML = `<p>${t(opcao.chaveDescricao)}</p><ul>${opcao.detalhes
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
  tela.append(voltar);
}

async function abrir(opcao, area, aoVoltarDaCasca) {
  tocar("clique");
  const modulo = await opcao.carregar();
  moduloAberto = modulo;
  // O botão de voltar do modo traz de volta para esta escolha, não para a
  // tela inicial. Quem sai da oficina inteira é a marca lá em cima.
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
