// Setor Criação Livre, visualização 2D.
// Este arquivo monta a tela e liga as ferramentas; a lógica de cada uma mora
// no seu próprio arquivo dentro desta pasta.

import { carregarScript, carregarEstilo } from "../../core/carregar-script.js";
import { ouvir } from "../../core/eventos.js";
import { tocar } from "../../core/som.js";
import { escolherArquivo, lerJSON } from "../../core/arquivos.js";
import { t } from "../../core/idioma.js";
import { icone } from "../../ui/icones.js";
import { ferramenta as iconeFerramenta } from "../../ui/icones-ferramentas.js";
import { mostrarAviso, confirmar, perguntarTexto, abrirPainel, fecharPainel } from "../../ui/painel.js";
import { grupoDeFerramentas, fecharMenusFlutuantes } from "../../ui/menu-flutuante.js";
import { definirDestino, limparDestino } from "../../ui/painel-bolsa.js";
import { valor as ajuste } from "../../core/ajustes.js";

import { cena, definirSelecao, limparSelecao, encaixarPonto, mostrar, deMm, unidade, passoDoEncaixe } from "./estado.js";
import * as mesa from "./mesa.js";
import * as formas from "./formas.js";
import * as texto from "./texto.js";
import * as selecao from "./selecao.js";
import * as caneta from "./caneta.js";
import * as remodelar from "./remodelar.js";
import * as combinar from "./combinar.js";
import * as historico from "./historico.js";
import * as projeto from "./projeto.js";
import * as painel from "./painel.js";

const FERRAMENTAS = [
  { id: "selecionar", icone: "seta", rotulo: "Selecionar", tecla: "V" },
  { id: "mao", icone: "mao", rotulo: "Arrastar", tecla: "H" },
  { id: "remodelar", icone: "nos", rotulo: "Remodelar", tecla: "N" },
  { id: "caneta", icone: "caneta", rotulo: "Caneta", tecla: "P" },
  {
    grupo: "quadrados",
    icone: "quadrado",
    rotulo: "Quadrados",
    opcoes: [
      { id: "quadrado", icone: "quadrado", rotulo: "Quadrado" },
      { id: "retangulo", icone: "retangulo", rotulo: "Retângulo" },
    ],
  },
  {
    grupo: "circulos",
    icone: "circulo",
    rotulo: "Círculos",
    opcoes: [
      { id: "circulo", icone: "circulo", rotulo: "Círculo" },
      { id: "elipse", icone: "elipse", rotulo: "Elipse" },
    ],
  },
  { id: "poligono", icone: "poligono", rotulo: "Polígono", forma: true },
  { id: "estrela", icone: "estrela", rotulo: "Estrela", forma: true },
  { id: "engrenagem", icone: "engrenagem", rotulo: "Engrenagem", forma: true },
  { id: "texto", icone: "texto", rotulo: "Texto" },
];

let raiz = null;
let tela = null;
let barraStatus = null;
let desligar = [];
let salvamentoPendente = null;
let areaAtual = null;
let nomeDoProjeto = "Projeto sem nome";

function botaoDaBarra(nomeIcone, rotulo, aoClicar, { usarIconeUI = false, extra = "" } = {}) {
  const alvo = document.createElement("button");
  alvo.type = "button";
  alvo.className = `botao ${extra}`;
  alvo.title = rotulo;
  alvo.setAttribute("aria-label", rotulo);
  const desenho = usarIconeUI ? icone(nomeIcone) : iconeFerramenta(nomeIcone);
  alvo.innerHTML = `${desenho}<span class="rotulo-acao">${rotulo}</span>`;
  alvo.addEventListener("click", () => {
    tocar("clique");
    aoClicar(alvo);
  });
  return alvo;
}

function montarEsqueleto(area, aoVoltar) {
  area.innerHTML = "";
  areaAtual = area;
  area.classList.add("conteudo--cheio");
  raiz = document.createElement("div");
  raiz.className = "livre";
  raiz.innerHTML = `
    <div class="livre__barra" role="toolbar" aria-label="Ações do projeto"></div>
    <div class="livre__corpo">
      <nav class="livre__ferramentas" aria-label="Caixa de ferramentas"></nav>
      <div class="livre__palco">
        <canvas id="tela-2d" aria-label="Mesa de corte"></canvas>
        <div class="palco__canto palco__canto--zoom"></div>
      </div>
      <aside class="livre__painel" aria-label="Propriedades"></aside>
    </div>
    <p class="livre__status" aria-live="off"></p>`;
  area.append(raiz);

  const barra = raiz.querySelector(".livre__barra");
  barra.append(
    botaoDaBarra("voltar", t("acoes.voltarSetor"), aoVoltar, {
      usarIconeUI: true,
      extra: "com-rotulo botao--destaque",
    }),
    separador(),
    botaoDaBarra("desfazer", "Desfazer", () => {
      if (!historico.desfazer()) mostrarAviso("Nada para desfazer.", "alerta");
      apos();
    }),
    botaoDaBarra("refazer", "Refazer", () => {
      if (!historico.refazer()) mostrarAviso("Nada para refazer.", "alerta");
      apos();
    }),
    separador(),
    grupoDeFerramentas({
      id: "arquivo2d",
      icone: "arquivo",
      rotulo: t("acoes.arquivo"),
      modo: "barra",
      opcoes: [
        { id: "salvar", icone: "arquivo", rotulo: "Salvar no navegador", aoEscolher: salvarComNome },
        { id: "baixar", icone: "exportar", rotulo: "Baixar projeto", aoEscolher: baixarComNome },
        { id: "abrir", icone: "pasta", rotulo: "Abrir projeto", aoEscolher: abrirProjeto },
        { id: "svg", icone: "exportar", rotulo: "Exportar SVG", aoEscolher: exportar },
        { id: "bolsa", icone: "guardarBolsa", rotulo: "Guardar na bolsa", aoEscolher: guardarNaBolsa },
      ],
    }),
    grupoDeFerramentas({
      id: "editar2d",
      icone: "unir",
      rotulo: "Editar",
      modo: "barra",
      opcoes: [
        { id: "copiar", icone: "quadrado", rotulo: t("acoes.copiar"), aoEscolher: copiar },
        { id: "colar", icone: "quadrado", rotulo: t("acoes.colar"), aoEscolher: colar },
        { id: "duplicar", icone: "quadrado", rotulo: t("acoes.duplicar"), aoEscolher: duplicar },
      ],
    }),
    separador(),
    botaoDaBarra("concluir", "Concluir forma", () => {
      caneta.terminar();
      apos();
    }, { extra: "acao-caneta" }),
    botaoDaBarra("fecharForma", "Fechar forma", () => {
      caneta.fechar();
      apos();
    }, { extra: "acao-caneta" }),
    botaoDaBarra("alternar3d", "Alternar para 3D", aoVoltar, { extra: "com-rotulo" }),
    botaoDaBarra("lixo", "Limpar base", limparBase, { extra: "botao--perigo com-rotulo" }),
    botaoDaBarra("telaCheia", t("acoes.telaCheia"), alternarTelaCheia),
  );

  const zoom = raiz.querySelector(".palco__canto--zoom");
  zoom.append(
    botaoDaBarra("mais", "Aproximar", () => mesa.aproximar(1.25)),
    botaoDaBarra("menos", "Afastar", () => mesa.aproximar(1 / 1.25)),
    botaoDaBarra("enquadrar", "Enquadrar mesa", () => mesa.enquadrar()),
  );

  const atalhoPainel = document.createElement("button");
  atalhoPainel.type = "button";
  atalhoPainel.className = "botao-propriedades";
  atalhoPainel.innerHTML = `${iconeFerramenta("regua")}<span>Propriedades</span>`;
  atalhoPainel.addEventListener("click", alternarPainel);
  raiz.querySelector(".livre__palco").append(atalhoPainel);

  const caixa = raiz.querySelector(".livre__ferramentas");
  for (const item of FERRAMENTAS) {
    if (item.grupo) {
      caixa.append(
        grupoDeFerramentas({
          id: item.grupo,
          icone: item.icone,
          rotulo: item.rotulo,
          opcoes: item.opcoes,
          aoEscolher: (opcao) => escolherFerramenta(opcao.id),
        }),
      );
      continue;
    }
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "ferramenta";
    alvo.dataset.ferramenta = item.id;
    alvo.title = item.tecla ? `${item.rotulo} (${item.tecla})` : item.rotulo;
    alvo.setAttribute("aria-label", item.rotulo);
    alvo.innerHTML = `${iconeFerramenta(item.icone)}<span>${item.rotulo}</span>`;
    alvo.addEventListener("click", () => escolherFerramenta(item.id));
    caixa.append(alvo);
  }

  barraStatus = raiz.querySelector(".livre__status");
  painel.ligarPainel(raiz.querySelector(".livre__painel"));
  tela = raiz.querySelector("#tela-2d");
}

function alternarPainel() {
  raiz.classList.toggle("livre--painel-aberto");
  document.body.classList.toggle("sem-rodape", raiz.classList.contains("livre--painel-aberto"));
}

function alternarTelaCheia() {
  const alvo = document.documentElement;
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
    return;
  }
  const pedir = alvo.requestFullscreen || alvo.webkitRequestFullscreen;
  if (!pedir) {
    mostrarAviso("Este navegador não deixa entrar em tela cheia.", "alerta");
    return;
  }
  pedir.call(alvo).catch(() => mostrarAviso("Não consegui entrar em tela cheia.", "alerta"));
}

function separador() {
  const barra = document.createElement("span");
  barra.className = "separador";
  return barra;
}

function escolherFerramenta(id) {
  if (cena.ferramenta === "caneta" && id !== "caneta") caneta.terminar();
  if (cena.ferramenta === "remodelar" && id !== "remodelar") remodelar.sair();
  cena.ferramenta = id;
  for (const alvo of raiz.querySelectorAll(".ferramenta")) {
    alvo.classList.toggle("ferramenta--ativa", alvo.dataset.ferramenta === id);
  }
  raiz.classList.toggle("livre--caneta", id === "caneta");
  raiz.classList.toggle("livre--mao", id === "mao");
  if (id === "remodelar") {
    remodelar.definirAlvo(cena.selecao[0] || null);
  } else {
    selecao.atualizarGuias();
  }
  tocar("clique");
  painel.desenhar();
  atualizarStatus();
}

function apos() {
  selecao.atualizarGuias();
  painel.desenhar();
  atualizarStatus();
  agendarSalvamento();
}

function atualizarStatus(ponto) {
  if (!barraStatus) return;
  const zoom = cena.paper ? Math.round(cena.paper.view.zoom * 100) : 100;
  const passo = passoDoEncaixe();
  const posicao = ponto ? `x ${mostrar(ponto.x)}  y ${mostrar(ponto.y)}` : `unidade ${unidade()}`;
  const encaixe = passo ? `encaixe ${deMm(passo).toFixed(passo < 10 ? 1 : 0)} ${unidade()}` : "sem encaixe";
  barraStatus.textContent = `${posicao}  ·  ${encaixe}  ·  zoom ${zoom}%  ·  ${cena.camadaPecas ? cena.camadaPecas.children.length : 0} peças`;
}

// --- Ações da barra ----------------------------------------------------

async function salvarComNome() {
  const nome = await perguntarTexto("Salvar no navegador", "Nome do projeto:", nomeDoProjeto);
  if (nome === null) return;
  nomeDoProjeto = nome;
  await projeto.salvarComNome(nome);
  await projeto.salvarNoCache(nome);
  tocar("salvar");
  mostrarAviso(`"${nome}" salvo neste navegador.`);
}

async function baixarComNome() {
  const nome = await perguntarTexto("Baixar projeto", "Nome do arquivo:", nomeDoProjeto);
  if (nome === null) return;
  nomeDoProjeto = nome;
  projeto.baixarProjeto(nome);
  tocar("salvar");
}

async function limparBase() {
  const certeza = await confirmar(
    "Isso apaga tudo que está na mesa. O trabalho salvo em arquivo não é afetado. Continuar?",
  );
  if (!certeza) return;
  cena.camadaPecas.removeChildren();
  limparSelecao();
  historico.registrar();
  await projeto.salvarNoCache(nomeDoProjeto);
  tocar("clique");
  mostrarAviso("Mesa limpa.");
  apos();
}

// Abrir: lista o que está salvo no navegador e oferece o arquivo do computador.
async function abrirProjeto() {
  const salvos = await projeto.listarSalvos();
  const corpo = document.createElement("div");

  if (!salvos.length) {
    const vazio = document.createElement("p");
    vazio.className = "dica";
    vazio.textContent = "Nenhum projeto salvo neste navegador ainda.";
    corpo.append(vazio);
  } else {
    const lista = document.createElement("ul");
    lista.className = "bolsa-lista";
    for (const registro of salvos) {
      const linha = document.createElement("li");
      linha.className = "bolsa-item";
      const quando = new Date(registro.criadoEm).toLocaleString("pt-BR");
      linha.innerHTML = `<div class="bolsa-item__dados">
        <div class="bolsa-item__nome">${registro.nome}</div>
        <div class="bolsa-item__meta">${quando}</div>
      </div>`;
      const abrir = document.createElement("button");
      abrir.type = "button";
      abrir.className = "botao botao--destaque";
      abrir.textContent = "Abrir";
      abrir.addEventListener("click", () => {
        try {
          projeto.desempacotar(registro.pacote);
          nomeDoProjeto = registro.nome;
          mesa.redefinirMesa(cena.mesa);
          historico.iniciar();
          fecharPainel();
          apos();
          tocar("pronto");
          mostrarAviso(`"${registro.nome}" aberto.`);
        } catch {
          mostrarAviso("Não consegui abrir esse projeto.", "erro");
        }
      });
      const apagar = document.createElement("button");
      apagar.type = "button";
      apagar.className = "botao botao--perigo";
      apagar.textContent = "Apagar";
      apagar.addEventListener("click", async () => {
        await projeto.apagarSalvo(registro.id);
        fecharPainel();
        abrirProjeto();
      });
      linha.append(abrir, apagar);
      lista.append(linha);
    }
    corpo.append(lista);
  }

  abrirPainel({
    titulo: "Abrir projeto",
    corpo,
    botoes: [
      {
        rotulo: "Abrir arquivo do computador",
        icone: "pasta",
        aoClicar: () => {
          fecharPainel();
          abrirArquivo();
        },
      },
    ],
  });
}

async function abrirArquivo() {
  const arquivo = await escolherArquivo(".json,.burad,application/json");
  if (!arquivo) return;
  try {
    const conteudo = await lerJSON(arquivo);
    projeto.desempacotar(conteudo);
    mesa.redefinirMesa(cena.mesa);
    historico.iniciar();
    apos();
    tocar("pronto");
    mostrarAviso("Projeto aberto.");
  } catch {
    tocar("erro");
    mostrarAviso("Não consegui ler esse arquivo de projeto.", "erro");
  }
}

async function exportar() {
  const apenasSelecao = cena.selecao.length > 0;
  const nome = await perguntarTexto("Exportar SVG", "Nome do arquivo:", nomeDoProjeto);
  if (nome === null) return;
  projeto.exportarSVG({ apenasSelecao, nome });
  mostrarAviso(apenasSelecao ? "SVG da seleção baixado." : "SVG da mesa inteira baixado.");
}

async function guardarNaBolsa() {
  if (!cena.selecao.length) {
    mostrarAviso("Selecione as peças que quer guardar.", "alerta");
    return;
  }
  const nome = await perguntarTexto("Guardar na bolsa", "Nome da peça:", "Peça 2D");
  if (nome === null) return;
  await projeto.enviarParaBolsa(nome.trim() || "Peça 2D");
  tocar("salvar");
  mostrarAviso("Peça guardada na bolsa.");
}

const areaDeTransferencia = [];

function copiar() {
  if (!cena.selecao.length) {
    mostrarAviso("Selecione alguma peça primeiro.", "alerta");
    return;
  }
  areaDeTransferencia.length = 0;
  for (const item of cena.selecao) {
    areaDeTransferencia.push(item.exportJSON({ asString: true, precision: 4 }));
  }
  mostrarAviso(`${areaDeTransferencia.length} peça(s) copiada(s).`);
}

function colar() {
  if (!areaDeTransferencia.length) {
    mostrarAviso("Nada copiado ainda.", "alerta");
    return;
  }
  const passo = Math.max(5, cena.paper ? 5 : 5);
  const novas = [];
  for (const json of areaDeTransferencia) {
    const item = cena.paper.project.importJSON(json);
    if (!item) continue;
    cena.camadaPecas.addChild(item);
    item.position = item.position.add([passo, passo]);
    novas.push(item);
  }
  definirSelecao(novas);
  historico.registrar();
  apos();
}

function duplicar() {
  if (!cena.selecao.length) {
    mostrarAviso("Selecione alguma peça primeiro.", "alerta");
    return;
  }
  combinar.duplicar(cena.selecao);
  apos();
}

function agendarSalvamento() {
  if (!ajuste("salvarSozinho")) return;
  clearTimeout(salvamentoPendente);
  salvamentoPendente = setTimeout(() => {
    projeto.salvarNoCache(nomeDoProjeto).catch(() => {});
  }, 1200);
}

// --- Teclado -----------------------------------------------------------

function ligarTeclado() {
  const aoTeclar = (evento) => {
    if (!raiz || !raiz.isConnected) return;
    const alvo = evento.target;
    if (alvo && ["INPUT", "SELECT", "TEXTAREA"].includes(alvo.tagName)) return;
    const comando = evento.ctrlKey || evento.metaKey;

    if (comando && evento.key.toLowerCase() === "z") {
      evento.preventDefault();
      if (evento.shiftKey) historico.refazer();
      else historico.desfazer();
      apos();
      return;
    }
    if (comando && evento.key.toLowerCase() === "y") {
      evento.preventDefault();
      historico.refazer();
      apos();
      return;
    }
    if (comando && evento.key.toLowerCase() === "a") {
      evento.preventDefault();
      selecao.selecionarTudo();
      painel.desenhar();
      return;
    }
    if (comando && evento.key.toLowerCase() === "d") {
      evento.preventDefault();
      duplicar();
      return;
    }
    if (comando && evento.key.toLowerCase() === "c") {
      copiar();
      return;
    }
    if (comando && evento.key.toLowerCase() === "v") {
      colar();
      return;
    }

    switch (evento.key) {
      case "Escape":
        if (cena.ferramenta === "caneta") caneta.cancelar();
        else limparSelecao();
        apos();
        break;
      case "Enter":
        if (cena.ferramenta === "caneta") {
          caneta.terminar();
          apos();
        }
        break;
      case "Delete":
      case "Backspace":
        if (selecao.apagarSelecao()) {
          evento.preventDefault();
          apos();
        }
        break;
      case "ArrowLeft":
        selecao.empurrar(-1, 0);
        break;
      case "ArrowRight":
        selecao.empurrar(1, 0);
        break;
      case "ArrowUp":
        selecao.empurrar(0, -1);
        break;
      case "ArrowDown":
        selecao.empurrar(0, 1);
        break;
      case "v":
      case "V":
        escolherFerramenta("selecionar");
        break;
      case "n":
      case "N":
        escolherFerramenta("remodelar");
        break;
      case "p":
      case "P":
        escolherFerramenta("caneta");
        break;
      case "h":
      case "H":
        escolherFerramenta("mao");
        break;
      default:
        break;
    }
  };
  window.addEventListener("keydown", aoTeclar);
  desligar.push(() => window.removeEventListener("keydown", aoTeclar));
}

// --- Ferramenta do paper ----------------------------------------------

function ligarFerramentaDoPaper() {
  const paper = cena.paper;
  const utensilio = new paper.Tool();

  utensilio.onMouseDown = (evento) => {
    const atual = cena.ferramenta;
    if (atual === "mao") return undefined;
    if (atual === "selecionar") return selecao.aoPressionar(evento);
    if (atual === "remodelar") return remodelar.aoPressionar(evento);
    if (atual === "caneta") return caneta.aoPressionar(evento);
    if (atual === "texto") return criarTexto(evento.point);
    return criarForma(atual, evento.point);
  };

  utensilio.onMouseDrag = (evento) => {
    const atual = cena.ferramenta;
    if (atual === "selecionar") return selecao.aoArrastar(evento);
    if (atual === "remodelar") return remodelar.aoArrastar(evento);
    if (atual === "caneta") return caneta.aoArrastar(evento);
    return undefined;
  };

  utensilio.onMouseUp = (evento) => {
    const atual = cena.ferramenta;
    if (atual === "selecionar") {
      selecao.aoSoltar(evento);
      painel.desenhar();
      agendarSalvamento();
    }
    if (atual === "remodelar") {
      remodelar.aoSoltar(evento);
      agendarSalvamento();
    }
  };

  utensilio.onMouseMove = (evento) => {
    atualizarStatus(evento.point);
    if (cena.ferramenta === "caneta") caneta.aoMover(evento);
  };
}

function criarForma(tipo, ponto) {
  if (!formas.DEFINICOES[tipo]) return;
  const peca = formas.criar(tipo, encaixarPonto(ponto));
  if (!peca) return;
  definirSelecao([peca]);
  historico.registrar();
  escolherFerramenta("selecionar");
  apos();
}

async function criarTexto(ponto) {
  const conteudo = await perguntarTexto("Texto", "O que escrever na peça:", texto.PADRAO.texto);
  if (conteudo === null) return;
  try {
    const peca = await texto.criar(encaixarPonto(ponto), { texto: conteudo });
    if (!peca) {
      mostrarAviso("Esse texto não gerou caminho. Tente outras letras.", "alerta");
      return;
    }
    definirSelecao([peca]);
    historico.registrar();
    escolherFerramenta("selecionar");
    apos();
  } catch {
    tocar("erro");
    mostrarAviso("Não consegui carregar a fonte.", "erro");
  }
}

// --- Ciclo de vida -----------------------------------------------------

// Botão do meio arrasta a vista em qualquer ferramenta, como nos programas
// de CAD. No celular isso é feito pela ferramenta Arrastar.
function ligarArrasteDoMeio() {
  let arrastando = false;
  let ultimo = null;

  const comecar = (evento) => {
    // Botão do meio em qualquer ferramenta, ou botão esquerdo com a mão.
    const comAMao = cena.ferramenta === "mao" && evento.button === 0;
    if (evento.button !== 1 && !comAMao) return;
    evento.preventDefault();
    arrastando = true;
    ultimo = { x: evento.clientX, y: evento.clientY };
    tela.setPointerCapture?.(evento.pointerId);
    tela.style.cursor = "grabbing";
  };
  const mover = (evento) => {
    if (!arrastando || !cena.paper) return;
    const passo = new cena.paper.Point(evento.clientX - ultimo.x, evento.clientY - ultimo.y);
    ultimo = { x: evento.clientX, y: evento.clientY };
    mesa.arrastarCamera(passo);
  };
  const parar = (evento) => {
    if (!arrastando) return;
    arrastando = false;
    tela.releasePointerCapture?.(evento.pointerId);
    tela.style.cursor = "";
  };

  tela.addEventListener("pointerdown", comecar);
  tela.addEventListener("pointermove", mover);
  tela.addEventListener("pointerup", parar);
  tela.addEventListener("pointercancel", parar);
  tela.addEventListener("auxclick", (evento) => evento.preventDefault());
  desligar.push(() => {
    fecharMenusFlutuantes();
    tela.removeEventListener("pointerdown", comecar);
    tela.removeEventListener("pointermove", mover);
    tela.removeEventListener("pointerup", parar);
    tela.removeEventListener("pointercancel", parar);
  });
}

// Atalho de computador: dois cliques com a seta caem no remodelador.
function ligarDuploClique() {
  const aoDuplo = (evento) => {
    if (cena.ferramenta !== "selecionar" || !cena.paper) return;
    const retangulo = tela.getBoundingClientRect();
    const ponto = cena.paper.view.viewToProject(
      new cena.paper.Point(evento.clientX - retangulo.left, evento.clientY - retangulo.top),
    );
    const acertou = cena.camadaPecas.hitTest(ponto, {
      fill: true,
      stroke: true,
      tolerance: 4 / cena.paper.view.zoom,
    });
    if (!acertou) return;
    let alvo = acertou.item;
    while (alvo.parent && alvo.parent !== cena.camadaPecas) alvo = alvo.parent;
    definirSelecao([alvo]);
    escolherFerramenta("remodelar");
  };
  tela.addEventListener("dblclick", aoDuplo);
  desligar.push(() => tela.removeEventListener("dblclick", aoDuplo));
}

// Guarda o trabalho quando a aba some, que é quando o aluno mais perde coisa.
function ligarSalvamentoDeEmergencia() {
  const guardar = () => {
    if (!cena.paper || !ajuste("salvarSozinho")) return;
    projeto.salvarNoCache(nomeDoProjeto).catch(() => {});
  };
  window.addEventListener("pagehide", guardar);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") guardar();
  });
  desligar.push(() => window.removeEventListener("pagehide", guardar));
}

function ligarRedimensionamento() {
  const palco = raiz.querySelector(".livre__palco");
  const ajustar = () => {
    if (!cena.paper || !palco.clientWidth) return;
    cena.paper.view.viewSize = new cena.paper.Size(palco.clientWidth, palco.clientHeight);
    mesa.enquadrar();
    selecao.atualizarGuias();
  };
  const observador = new ResizeObserver(ajustar);
  observador.observe(palco);
  desligar.push(() => observador.disconnect());
}

function ligarOuvintes() {
  desligar.push(
    ouvir("livre:selecao", () => {
      if (cena.ferramenta !== "remodelar") selecao.atualizarGuias();
    }),
  );
  desligar.push(
    ouvir("ajuste:mudou", ({ chave }) => {
      if (!cena.paper) return;
      if (chave === "tema" || chave === "*") {
        mesa.desenharMesa();
        selecao.atualizarGuias();
      }
      painel.desenhar();
      atualizarStatus();
    }),
  );
  desligar.push(ouvir("livre:historico", () => atualizarStatus()));
}

export async function montar(area, setor, aoVoltar) {
  carregarEstilo("styles/livre.css");
  montarEsqueleto(area, () => {
    encerrar();
    aoVoltar();
  });

  try {
    await carregarScript("libs/paper/paper-core.min.js", "paper");
    await carregarScript("libs/opentype/opentype.min.js", "opentype");
    await texto.carregarCatalogo();
  } catch (erro) {
    console.error(erro);
    mostrarAviso("Não consegui carregar as ferramentas de desenho.", "erro");
    return;
  }

  mesa.iniciarPaper(tela);
  mesa.ligarRoda(tela);
  ligarFerramentaDoPaper();
  ligarArrasteDoMeio();
  ligarDuploClique();
  ligarSalvamentoDeEmergencia();
  ligarRedimensionamento();
  ligarTeclado();
  ligarOuvintes();

  // A bolsa passa a saber como entregar uma peça para esta mesa.
  definirDestino((item) => {
    if (!cena.paper || !item?.dados?.svg) return false;
    const posto = projeto.colocarSVGNaMesa(item.dados.svg, item.nome);
    if (!posto) return false;
    historico.registrar();
    apos();
    return true;
  });
  desligar.push(() => limparDestino());

  const guardado = await projeto.lerDoCache();
  if (guardado) {
    try {
      projeto.desempacotar(guardado);
      mesa.redefinirMesa(cena.mesa);
      mostrarAviso("Projeto anterior recuperado.");
    } catch {
      // projeto velho ou corrompido: começa limpo
    }
  }

  painel.ligarContinuacao((item) => {
    definirSelecao([item]);
    escolherFerramenta("caneta");
    const ponta = item.lastSegment.point;
    caneta.continuarDe(item, ponta);
    mostrarAviso("Clique na mesa para seguir o traço. Enter conclui.");
  });

  historico.iniciar();
  escolherFerramenta("selecionar");
  apos();
}

export function encerrar() {
  for (const parar of desligar) {
    try {
      parar();
    } catch {
      // ignora
    }
  }
  desligar = [];
  fecharMenusFlutuantes();
  document.body.classList.remove("sem-rodape");
  clearTimeout(salvamentoPendente);
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
  if (cena.paper) {
    projeto.salvarNoCache().catch(() => {});
    cena.paper.project.clear();
    cena.paper.tools?.forEach((utensilio) => utensilio.remove());
  }
  cena.paper = null;
  cena.selecao = [];
  raiz = null;
}

export async function limparTudo() {
  const certeza = await confirmar("Isso apaga o desenho atual. Continuar?");
  if (!certeza) return;
  cena.camadaPecas.removeChildren();
  limparSelecao();
  await projeto.limparCache();
  historico.registrar();
  apos();
}
