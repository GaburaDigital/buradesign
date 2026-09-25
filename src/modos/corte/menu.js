// Porta de entrada do setor Montagem com Peças Cortadas.
//
// Duas bancadas na mesma oficina, como o Criação Livre tem 2D e 3D: montar a
// peça com chapas encaixadas, ou fatiar um modelo 3D em camadas. As duas
// terminam no mesmo lugar — um plano de corte em SVG, em milímetros de
// verdade — então o botão de trocar de bancada fica dentro das duas.

import { carregarEstilo } from "../../core/carregar-script.js";
import { t } from "../../core/idioma.js";
import { tocar } from "../../core/som.js";
import { ferramenta } from "../../ui/icones-ferramentas.js";
import { icone } from "../../ui/icones.js";
import { fala } from "../../ui/aliens.js";

const OPCOES = [
  {
    id: "montagem",
    icone: "chapaFrente",
    nome: "Montagem com chapas",
    descricao:
      "Você põe as chapas de pé e deitadas, o programa acha os cantos e desenha os dedos de encaixe sozinho.",
    detalhes: [
      "Caixa pronta por medida, ou chapa por chapa",
      "Dedos de encaixe automáticos, com ajuste de largura e folga",
      "Material da escola com a fresta já certa: MDF, papelão, acrílico e EVA",
      "Plano de corte em SVG, peças numeradas e arrumadas na chapa",
    ],
    carregar: () => import("./montagem.js"),
  },
  {
    id: "fatiador",
    icone: "fatiar",
    nome: "Fatiar um modelo",
    descricao:
      "Pegue um modelo 3D seu e corte-o em camadas da espessura da chapa. Empilhando as camadas, o modelo volta.",
    detalhes: [
      "Traz o modelo do Design 3D, da bolsa ou de um arquivo STL, OBJ ou GLB",
      "Camadas na espessura da chapa escolhida, vistas empilhadas ou separadas",
      "Furo de alinhamento no meio para enfiar um palito e não errar a ordem",
      "Mesmo plano de corte em SVG, com as camadas numeradas na ordem de montar",
    ],
    carregar: () => import("./fatiador.js"),
  },
];

let moduloAberto = null;
let areaAtual = null;

export async function montar(area, setor, aoVoltar) {
  // O estilo do setor entra aqui e não na bancada: sem isto a primeira tela
  // aparece crua, que foi o que aconteceu no Criação Livre.
  carregarEstilo("styles/livre.css");
  carregarEstilo("styles/corte.css");
  areaAtual = area;
  encerrarFilho();
  area.innerHTML = "";
  area.classList.remove("conteudo--cheio");

  const tela = document.createElement("div");
  tela.className = "inicio";
  tela.innerHTML = `
    <div class="inicio__cabecalho">
      <h1>${t("setores.corte.nome")}</h1>
      <p>${t("setores.corte.descricao")}</p>
    </div>
    ${fala("krux", "Na chapa não tem desfazer. Mede duas vezes aqui dentro, corta uma vez lá fora.")}
    <ul class="modos"></ul>`;
  area.append(tela);

  const lista = tela.querySelector(".modos");
  for (const opcao of OPCOES) {
    const item = document.createElement("li");
    item.className = "modo";
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "modo__botao";
    botao.innerHTML = `${ferramenta(opcao.icone)}<span>${opcao.nome}</span>`;
    botao.addEventListener("click", () => abrir(opcao, area, aoVoltar));

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
  tela.append(voltar);
}

async function abrir(opcao, area, aoVoltarDaCasca) {
  tocar("clique");
  const modulo = await opcao.carregar();
  moduloAberto = modulo;
  // Cada bancada recebe duas saídas: voltar para esta escolha e pular direto
  // para a outra bancada, sem passar por aqui.
  await modulo.montar(
    area,
    opcao,
    () => {
      encerrarFilho();
      montar(area, opcao, aoVoltarDaCasca);
    },
    {
      aoTrocar: async () => {
        const outra = OPCOES.find((item) => item.id !== opcao.id);
        encerrarFilho();
        await abrir(outra, area, aoVoltarDaCasca);
      },
    },
  );
}

function encerrarFilho() {
  if (moduloAberto && typeof moduloAberto.encerrar === "function") {
    try {
      moduloAberto.encerrar();
    } catch (erro) {
      console.warn("Falha ao encerrar a bancada", erro);
    }
  }
  moduloAberto = null;
}

export function encerrar() {
  encerrarFilho();
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
}
