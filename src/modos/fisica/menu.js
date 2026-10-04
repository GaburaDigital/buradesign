// Porta de entrada do setor Simulação de Mecânica.
//
// Duas bancadas: a física 2D, para alavanca, engrenagem e mecanismo visto de
// um lado só, e a física 3D, para quando o peso e o atrito das peças num
// espaço inteiro importarem. São motores de física diferentes, e misturar as
// duas numa bancada só daria duas bancadas meio prontas.
//
// Antes de entrar em qualquer uma delas, o aluno confirma um aviso: simular
// física é a coisa mais pesada que este aplicativo faz, e um computador de
// sala de aula pode engasgar. É melhor avisar antes do que o aluno achar que
// o aplicativo quebrou.

import { carregarEstilo } from "../../core/carregar-script.js";
import { t } from "../../core/idioma.js";
import { tocar } from "../../core/som.js";
import { valor as ajuste } from "../../core/ajustes.js";
import { ferramenta } from "../../ui/icones-ferramentas.js";
import { icone } from "../../ui/icones.js";
import { fala } from "../../ui/aliens.js";
import { abrirPainel, fecharPainel } from "../../ui/painel.js";

const OPCOES = [
  {
    id: "sim2d",
    icone: "juntaPino",
    nome: "Simulação física 2D",
    descricao:
      "Montagem vista de um lado só, como um desenho técnico que se mexe. É onde alavanca, engrenagem, biela e came ficam fáceis de entender.",
    detalhes: [
      "Peças de mecanismo prontas: barra, placa, disco, roda, engrenagem e sólido",
      "Restrições de dois pontos: você marca o ponto em cada peça, como no Roblox Studio",
      "Motor amarelo de kit e dois servos, com torque de verdade e slider ao vivo",
      "Engrenagem com dente de involuta desenhado e razão garantida pelos dentes",
      "Nove montagens prontas, cada uma com um experimento para fazer",
      "Aceita caminho 2D vindo da bolsa",
    ],
    carregar: () => import("./sim2d.js"),
  },
  {
    id: "sim3d",
    icone: "cubo3d",
    nome: "Simulação física 3D",
    descricao:
      "A mesma ideia no espaço inteiro, considerando peso e atrito das peças em três dimensões. Ainda em construção.",
    detalhes: [
      "Vai trazer as peças da mesa do Design 3D e as montagens de chapas",
      "Motor, servo, pino e solda com os mesmos números da bancada 2D",
      "Colisão simplificada por padrão, com opção de colisão exata por peça",
    ],
    emObras: true,
  },
];

let moduloAberto = null;
let areaAtual = null;

export async function montar(area, setor, aoVoltar) {
  carregarEstilo("styles/livre.css");
  carregarEstilo("styles/fisica.css");
  areaAtual = area;
  encerrarFilho();
  area.innerHTML = "";
  area.classList.remove("conteudo--cheio");

  const telaInicial = document.createElement("div");
  telaInicial.className = "inicio";
  telaInicial.innerHTML = `
    <div class="inicio__cabecalho">
      <h1>${t("setores.fisica.nome")}</h1>
      <p>${t("setores.fisica.descricao")}</p>
    </div>
    ${fala("pip", "Eu testo até quebrar. Se a sua alavanca aguenta aqui dentro, ela aguenta na mesa de verdade.")}
    <ul class="modos"></ul>`;
  area.append(telaInicial);

  const lista = telaInicial.querySelector(".modos");
  for (const opcao of OPCOES) {
    const item = document.createElement("li");
    item.className = `modo${opcao.emObras ? " modo--fechado" : ""}`;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "modo__botao";
    botao.innerHTML = `${ferramenta(opcao.icone)}<span>${opcao.nome}</span>${
      opcao.emObras ? '<span class="modo__selo">em breve</span>' : ""
    }`;
    if (opcao.emObras) {
      botao.disabled = true;
      botao.title = "Esta bancada ainda está sendo construída.";
    } else {
      botao.addEventListener("click", () => comAviso(opcao, area, aoVoltar));
    }

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

// O aviso de entrada. Aparece sempre, e quem já sabe disso de cor desliga ele
// nos ajustes — não numa caixinha aqui dentro, porque desligar sem querer um
// aviso que o professor quer que a turma leia é fácil demais.
function comAviso(opcao, area, aoVoltar) {
  tocar("clique");
  if (!ajuste("avisoSimulacao")) {
    abrir(opcao, area, aoVoltar);
    return;
  }

  const corpo = document.createElement("div");
  corpo.innerHTML = `
    <p>A simulação de física é a parte mais pesada do BuraDESIGN. O aparelho
    fica calculando o tempo todo em que a simulação estiver ligada, e numa
    máquina mais simples ele pode esquentar, ficar lento ou até travar.</p>
    <p class="dica">O que ajuda, se travar: usar o <strong>modo lento</strong>,
    manter a montagem pequena (até umas 40 peças) e fechar as outras abas.
    Quando o aparelho não estiver dando conta, a própria bancada vai parar a
    simulação e oferecer o modo lento — ela nunca acelera errando, porque passo
    grande é o que faz peça atravessar peça.</p>
    <p class="dica">Parar a simulação devolve todas as peças para onde estavam.
    Testar nunca estraga a sua montagem.</p>
    <p class="dica">Este aviso pode ser desligado em Ajustes, em "Avisar antes
    de entrar na simulação".</p>`;

  let respondido = false;
  const responder = (vai) => {
    if (respondido) return;
    respondido = true;
    fecharPainel();
    if (vai) abrir(opcao, area, aoVoltar);
  };

  abrirPainel({
    titulo: "Antes de entrar: modo exigente",
    corpo,
    botoes: [
      { rotulo: "Entendi, quero entrar", variante: "destaque", icone: "concluir", aoClicar: () => responder(true) },
      { rotulo: t("acoes.cancelar"), aoClicar: () => responder(false) },
    ],
    aoFechar: () => responder(false),
  });
}

async function abrir(opcao, area, aoVoltarDaCasca) {
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
      console.warn("Falha ao encerrar a bancada de simulação", erro);
    }
  }
  moduloAberto = null;
}

export function encerrar() {
  encerrarFilho();
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
}
