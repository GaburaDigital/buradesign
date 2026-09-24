// Fase 3 — Design com Programação, modo livre.
//
// A tela é dividida: à esquerda a área de programação (Blockly no visual do
// Scratch 3), à direita a visualização 3D. Aqui o 3D é só vitrine: a câmera
// anda à vontade, mas nada se edita com a mão — quem monta é o programa.

import { carregarEstilo, carregarScript } from "../../core/carregar-script.js";
import { ouvir } from "../../core/eventos.js";
import { tocar } from "../../core/som.js";
import { valor as ajuste } from "../../core/ajustes.js";
import { t } from "../../core/idioma.js";
import { escolherArquivo, lerJSON, baixarJSON } from "../../core/arquivos.js";
import * as deposito from "../../core/deposito.js";
import { icone } from "../../ui/icones.js";
import { ferramenta as iconeFerramenta } from "../../ui/icones-ferramentas.js";
import {
  mostrarAviso,
  confirmar,
  perguntarTexto,
  abrirPainel,
  fecharPainel,
} from "../../ui/painel.js";
import { grupoDeFerramentas, fecharMenusFlutuantes } from "../../ui/menu-flutuante.js";

import * as cena from "../livre3d/cena.js";
import { cena3d } from "../livre3d/cena.js";
import * as pecas from "../livre3d/pecas.js";
import * as projeto from "../livre3d/projeto.js";
import { CAIXA, PROGRAMA_INICIAL, registrar } from "./blocos.js";
import * as interprete from "./interprete.js";

const ID_CACHE = "blocos:atual";
const VISTAS = [
  ["topo", "Topo"],
  ["frente", "Frente"],
  ["direita", "Direita"],
  ["esquerda", "Esquerda"],
  ["tras", "Trás"],
  ["cantoinho", "Perspectiva"],
];

let Blockly = null;
let workspace = null;
let raiz = null;
let areaAtual = null;
let tela = null;
let statusArea = null;
let execucao = null;
let desligar = [];
let nomeDoProjeto = "Programa 1";
let blocoAceso = null;

// --- Tema --------------------------------------------------------------

function token(nome, alternativa) {
  const lido = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return lido || alternativa;
}

// O Blockly desenha em SVG próprio, fora do alcance do nosso CSS. Então o
// tema dele é montado a partir dos mesmos tokens, e refeito quando o aluno
// troca de tema nos ajustes.
function temaDoBlockly() {
  return Blockly.Theme.defineTheme(`bura-${document.documentElement.dataset.tema || "escuro"}`, {
    base: Blockly.Themes.Zelos,
    componentStyles: {
      workspaceBackgroundColour: token("--fundo-2", "#0c0c0c"),
      toolboxBackgroundColour: token("--fundo-3", "#17191b"),
      toolboxForegroundColour: token("--texto", "#ffffff"),
      flyoutBackgroundColour: token("--fundo", "#000000"),
      flyoutForegroundColour: token("--texto-2", "#b9c0c6"),
      flyoutOpacity: 0.96,
      scrollbarColour: token("--linha-forte", "#7c858c"),
      insertionMarkerColour: token("--verde", "#3fbf5f"),
      insertionMarkerOpacity: 0.5,
      cursorColour: token("--verde", "#3fbf5f"),
      selectedGlowColour: token("--verde", "#3fbf5f"),
    },
    fontStyle: { family: token("--fonte-mono", "monospace"), weight: "bold", size: 11 },
  });
}

function aplicarTema() {
  if (!workspace) return;
  workspace.setTheme(temaDoBlockly());
  cena.desenharBase();
}

// --- Esqueleto ---------------------------------------------------------

function botao(nomeIcone, rotulo, aoClicar, { usarIconeUI = false, extra = "", curto = "" } = {}) {
  const alvo = document.createElement("button");
  alvo.type = "button";
  alvo.className = `botao ${extra}${curto ? " tem-curto" : ""}`.trim();
  alvo.title = rotulo;
  alvo.setAttribute("aria-label", rotulo);
  // No celular o nome inteiro não cabe na linha dos três comandos.
  alvo.innerHTML = `${usarIconeUI ? icone(nomeIcone) : iconeFerramenta(nomeIcone)}<span class="rotulo-acao">${rotulo}</span>${
    curto ? `<span class="rotulo-curto">${curto}</span>` : ""
  }`;
  alvo.addEventListener("click", aoClicar);
  return alvo;
}

function separador() {
  const risco = document.createElement("span");
  risco.className = "separador";
  risco.setAttribute("aria-hidden", "true");
  return risco;
}

function montarEsqueleto(area, aoVoltar) {
  area.innerHTML = "";
  areaAtual = area;
  area.classList.add("conteudo--cheio");
  raiz = document.createElement("div");
  raiz.className = "livre blocos";
  raiz.innerHTML = `
    <div class="livre__barra" role="toolbar" aria-label="Ações do programa"></div>
    <div class="blocos__corpo">
      <section class="blocos__lado blocos__lado--programa" aria-label="Área de programação">
        <header class="blocos__cabecalho">
          <h2>Área de programação</h2>
          <div class="blocos__controles"></div>
        </header>
        <div class="blocos__area" id="area-blocos"></div>
        <div class="blocos__zoom" role="group" aria-label="Zoom da área de programação"></div>
      </section>
      <section class="blocos__lado blocos__lado--palco livre__palco" aria-label="Visualização 3D">
        <canvas id="tela-blocos" aria-label="Visualização do modelo"></canvas>
        <div class="palco__canto palco__canto--topo-direita"></div>
        <div class="palco__canto palco__canto--zoom"></div>
        <p class="blocos__selo" data-selo>Visualização — o modelo é montado pelo programa</p>
      </section>
    </div>
    <p class="livre__status"></p>`;
  area.append(raiz);

  const barra = raiz.querySelector(".livre__barra");
  barra.append(
    botao("voltar", t("acoes.voltarSetor"), aoVoltar, {
      usarIconeUI: true,
      extra: "com-rotulo botao--destaque",
    }),
    separador(),
    grupoDeFerramentas({
      id: "arquivo",
      icone: "arquivo",
      rotulo: t("acoes.arquivo"),
      modo: "barra",
      opcoes: [
        { id: "salvar", icone: "arquivo", rotulo: "Salvar no navegador", aoEscolher: salvarComNome },
        { id: "baixar", icone: "exportar", rotulo: "Baixar programa", aoEscolher: baixarPrograma },
        { id: "abrir", icone: "pasta", rotulo: "Abrir programa", aoEscolher: abrirPrograma },
        { id: "importar", icone: "pasta", rotulo: "Importar de arquivo", aoEscolher: importarPrograma },
        { id: "stl", icone: "exportar", rotulo: "Exportar STL", aoEscolher: exportarSTL },
        { id: "bolsa", icone: "guardarBolsa", rotulo: "Guardar na bolsa", aoEscolher: guardarNaBolsa },
      ],
    }),
    separador(),
    botao("lixo", "Limpar programa", limparPrograma, { extra: "botao--perigo com-rotulo" }),
    botao("telaCheia", t("acoes.telaCheia"), alternarTelaCheia),
    botao("alternar3d", "Ver 3D", alternarLado, { extra: "so-estreito com-rotulo-sempre", }),
  );

  const controles = raiz.querySelector(".blocos__controles");
  controles.append(
    botao("iniciar", "Iniciar", () => rodar({ lento: false }), {
      extra: "com-rotulo botao--ok",
      curto: "iniciar",
    }),
    botao("lento", "Iniciar no modo lento", () => rodar({ lento: true }), {
      extra: "com-rotulo",
      curto: "lento",
    }),
    botao("parar", "Parar", parar, { extra: "com-rotulo botao--perigo", curto: "parar" }),
  );

  const cantoBlocos = raiz.querySelector(".blocos__zoom");
  cantoBlocos.append(
    botao("mais", "Aproximar os blocos", () => workspace?.zoomCenter(1)),
    botao("menos", "Afastar os blocos", () => workspace?.zoomCenter(-1)),
    botao("enquadrar", "Enquadrar o programa", () => {
      if (!workspace) return;
      workspace.setScale(0.82);
      workspace.scrollCenter();
    }),
    botao("lixo", "Apagar o bloco escolhido", apagarBlocoEscolhido, { extra: "botao--perigo" }),
  );

  const cantoDireito = raiz.querySelector(".palco__canto--topo-direita");
  cantoDireito.append(
    grupoDeFerramentas({
      id: "vistas",
      icone: "cameraCubo",
      rotulo: t("acoes.vistas"),
      modo: "barra",
      opcoes: VISTAS.map(([nome, rotulo]) => ({ id: nome, icone: "cameraCubo", rotulo })),
      aoEscolher: (opcao) => cena.olharDe(opcao.id),
    }),
  );

  const zoom = raiz.querySelector(".palco__canto--zoom");
  zoom.append(
    botao("mais", "Aproximar", () => aproximar(1.2)),
    botao("menos", "Afastar", () => aproximar(1 / 1.2)),
    botao("enquadrar", "Enquadrar base", () => cena.enquadrar()),
    botao("camera3d", "Enquadrar o modelo", () => interprete.enquadrarResultado()),
  );

  tela = raiz.querySelector("#tela-blocos");
  statusArea = raiz.querySelector(".livre__status");
}

// Apagar sem lixeira: o bloco escolhido some, e a tecla Delete faz o mesmo.
function apagarBlocoEscolhido() {
  const escolhido = Blockly?.getSelected?.();
  if (!escolhido || escolhido.isShadow()) {
    mostrarAviso("Toque num bloco antes de apagar.", "alerta");
    return;
  }
  escolhido.dispose(true);
  dizer("Bloco apagado.");
}

function alternarLado() {
  raiz.classList.toggle("blocos--ver-3d");
  redimensionar();
}

function alternarTelaCheia() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

function aproximar(fator) {
  const alvo = cena3d.orbita.target;
  const posicao = cena3d.camera.position;
  posicao.sub(alvo).multiplyScalar(1 / fator).add(alvo);
  cena3d.orbita.update();
}

function dizer(texto) {
  if (statusArea) statusArea.textContent = texto;
}

// --- Execução ----------------------------------------------------------

// O destaque é uma classe no SVG do bloco, com contorno verde pelo CSS. O
// highlightBlock do Blockly existe, mas nesta versão não marca nada na tela.
function marcar(bloco, ligado) {
  try {
    bloco?.getSvgRoot?.()?.classList.toggle("bura-rodando", ligado);
  } catch {
    // o bloco pode ter sumido no meio do caminho
  }
}

function acender(bloco) {
  if (blocoAceso && blocoAceso !== bloco) marcar(blocoAceso, false);
  blocoAceso = bloco || null;
  if (bloco) marcar(bloco, true);
}

function marcarRodando(ligado) {
  raiz?.classList.toggle("blocos--rodando", ligado);
}

function parar() {
  if (!execucao) {
    dizer("Nada rodando.");
    return;
  }
  execucao.parar();
  execucao = null;
  marcarRodando(false);
  acender(null);
  tocar("clique");
  dizer("Programa interrompido.");
}

function rodar({ lento }) {
  if (execucao) execucao.parar();
  execucao = null;
  acender(null);
  marcarRodando(true);
  dizer(lento ? "Rodando no modo lento…" : "Montando…");
  tocar("clique");

  const comeco = performance.now();
  execucao = interprete.executarPrograma(workspace, {
    lento,
    intervalo: 420,
    aoDestacar: (bloco) => acender(bloco),
    aoFim: (estado) => {
      execucao = null;
      marcarRodando(false);
      acender(null);
      interprete.enquadrarResultado();
      const quantas = cena3d.grupoPecas.children.length;
      const tempo = Math.round(performance.now() - comeco);
      dizer(`Pronto: ${quantas} peça(s) em ${tempo} ms.`);
      tocar(quantas ? "pronto" : "clique");
      if (!quantas) mostrarAviso("O programa rodou, mas não criou nenhuma peça.", "alerta");
      guardarNoCache();
    },
    aoErro: (erro) => {
      execucao = null;
      marcarRodando(false);
      acender(null);
      tocar("erro");
      dizer(erro.message);
      mostrarAviso(erro.message, "erro");
    },
  });

  if (!execucao) marcarRodando(false);
}

// --- Arquivo -----------------------------------------------------------

function programaAtual() {
  return Blockly.serialization.workspaces.save(workspace);
}

function carregarPrograma(dados) {
  if (!dados) return false;
  try {
    Blockly.serialization.workspaces.load(dados, workspace);
    return true;
  } catch (erro) {
    console.warn("Programa não pôde ser lido", erro);
    return false;
  }
}

function pacote(nome) {
  return {
    formato: "buradesign.programa",
    versao: 1,
    modo: "blocos",
    nome: nome || nomeDoProjeto,
    programa: programaAtual(),
    salvoEm: new Date().toISOString(),
  };
}

async function guardarNoCache() {
  if (!ajuste("salvarSozinho")) return;
  try {
    await deposito.guardar("projetos", {
      id: ID_CACHE,
      nome: nomeDoProjeto,
      modo: "blocos",
      criadoEm: Date.now(),
      pacote: pacote(nomeDoProjeto),
    });
  } catch {
    // sem espaço ou sem IndexedDB: não vale derrubar a aula por isso
  }
}

async function salvarComNome() {
  const nome = await perguntarTexto("Salvar no navegador", "Nome do programa:", nomeDoProjeto);
  if (nome === null) return;
  nomeDoProjeto = nome;
  await deposito.guardar("projetos", {
    id: deposito.novoId("programa"),
    nome,
    modo: "blocos",
    criadoEm: Date.now(),
    pacote: pacote(nome),
  });
  await guardarNoCache();
  tocar("salvar");
  mostrarAviso(`"${nome}" salvo neste navegador.`);
}

async function baixarPrograma() {
  const nome = await perguntarTexto("Baixar programa", "Nome do arquivo:", nomeDoProjeto);
  if (nome === null) return;
  nomeDoProjeto = nome;
  baixarJSON(`${nome}.buraprog.json`, pacote(nome));
  tocar("salvar");
}

async function importarPrograma() {
  const arquivo = await escolherArquivo(".json");
  if (!arquivo) return;
  try {
    const lido = await lerJSON(arquivo);
    if (lido?.formato !== "buradesign.programa") {
      throw new Error("Este arquivo não é um programa do BuraDESIGN.");
    }
    if (!carregarPrograma(lido.programa)) throw new Error("Não consegui abrir esse programa.");
    nomeDoProjeto = lido.nome || nomeDoProjeto;
    tocar("pronto");
    mostrarAviso(`"${nomeDoProjeto}" carregado.`);
  } catch (erro) {
    tocar("erro");
    mostrarAviso(erro.message || "Arquivo inválido.", "erro");
  }
}

async function abrirPrograma() {
  const salvos = (await deposito.listar("projetos")).filter(
    (item) => item.modo === "blocos" && item.id !== ID_CACHE,
  );
  const corpo = document.createElement("div");
  if (!salvos.length) {
    const vazio = document.createElement("p");
    vazio.className = "dica";
    vazio.textContent = "Nenhum programa salvo neste navegador ainda.";
    corpo.append(vazio);
  } else {
    const lista = document.createElement("ul");
    lista.className = "lista-projetos";
    for (const item of salvos.sort((a, b) => b.criadoEm - a.criadoEm)) {
      const linha = document.createElement("li");
      const abrir = document.createElement("button");
      abrir.type = "button";
      abrir.className = "botao";
      abrir.textContent = item.nome || "Sem nome";
      abrir.addEventListener("click", () => {
        if (carregarPrograma(item.pacote?.programa)) {
          nomeDoProjeto = item.nome || nomeDoProjeto;
          fecharPainel();
          tocar("pronto");
          mostrarAviso(`"${nomeDoProjeto}" carregado.`);
        } else {
          mostrarAviso("Não consegui abrir esse programa.", "erro");
        }
      });
      const apagar = document.createElement("button");
      apagar.type = "button";
      apagar.className = "botao botao--perigo";
      apagar.innerHTML = `${icone("lixeira")}<span>Apagar</span>`;
      apagar.addEventListener("click", async () => {
        await deposito.remover("projetos", item.id);
        linha.remove();
      });
      linha.append(abrir, apagar);
      lista.append(linha);
    }
    corpo.append(lista);
  }
  abrirPainel({ titulo: "Abrir programa", corpo, botoes: [{ rotulo: "Fechar" }] });
}

async function exportarSTL() {
  if (!cena3d.grupoPecas.children.length) {
    mostrarAviso("Rode o programa antes de exportar.", "alerta");
    return;
  }
  const nome = await perguntarTexto("Exportar STL", "Nome do arquivo:", nomeDoProjeto);
  if (nome === null) return;
  const feito = projeto.exportarSTL({ apenasSelecao: false, nome });
  if (!feito) {
    mostrarAviso("Não há peça positiva para exportar.", "alerta");
    return;
  }
  tocar("salvar");
  mostrarAviso("STL baixado.");
}

async function guardarNaBolsa() {
  const tudo = cena3d.grupoPecas.children.slice();
  if (!tudo.length) {
    mostrarAviso("Rode o programa antes de guardar na bolsa.", "alerta");
    return;
  }
  const nome = await perguntarTexto("Guardar na bolsa", "Nome da peça:", nomeDoProjeto);
  if (nome === null) return;
  // A bolsa guarda a seleção; aqui o que vale é o modelo inteiro.
  const antes = cena3d.selecao;
  cena3d.selecao = tudo;
  try {
    await projeto.enviarParaBolsa(nome);
    tocar("salvar");
    mostrarAviso("Modelo guardado na bolsa.");
  } finally {
    cena3d.selecao = antes;
  }
}

async function limparPrograma() {
  const certeza = await confirmar("Isso apaga os blocos e o modelo. Continuar?");
  if (!certeza) return;
  parar();
  workspace.clear();
  carregarPrograma(PROGRAMA_INICIAL);
  interprete.limparCena();
  dizer("Programa novo.");
}

// --- Montagem ----------------------------------------------------------

function redimensionar() {
  if (!raiz) return;
  const palco = raiz.querySelector(".blocos__lado--palco");
  cena.redimensionar(palco.clientWidth, palco.clientHeight);
  pecas.atualizarResolucaoDasLinhas(palco.clientWidth, palco.clientHeight);
  if (workspace) Blockly.svgResize(workspace);
}

export async function montar(area, setor, aoVoltar) {
  carregarEstilo("styles/livre.css");
  carregarEstilo("styles/blocos.css");
  montarEsqueleto(area, aoVoltar);
  dizer("Carregando a oficina de blocos…");

  Blockly = await carregarScript("libs/blockly/blockly.min.js", "Blockly");
  await carregarScript("libs/blockly/msg-pt-br.js");
  registrar(Blockly);

  workspace = Blockly.inject(raiz.querySelector("#area-blocos"), {
    // O CSS do próprio Blockly pede um sprite mesmo com a lixeira desligada.
    // Apontando para cá, ele nunca tenta buscar na internet.
    media: "libs/blockly/media/",
    toolbox: CAIXA,
    renderer: "zelos",
    theme: temaDoBlockly(),
    horizontalLayout: false,
    toolboxPosition: "start",
    // A lixeira e o zoom que vêm no Blockly são imagens de um sprite dele, com
    // cara de Google. Ficam desligados: o zoom e o apagar são botões nossos,
    // no mesmo desenho do resto da oficina.
    trashcan: false,
    sounds: false,
    grid: { spacing: 28, length: 3, colour: token("--linha", "#3a4046"), snap: true },
    zoom: { controls: false, wheel: true, startScale: 0.82, minScale: 0.35, maxScale: 2 },
    move: { scrollbars: true, drag: true, wheel: true },
  });

  const guardado = await deposito.buscar("projetos", ID_CACHE).catch(() => null);
  if (!carregarPrograma(guardado?.pacote?.programa)) carregarPrograma(PROGRAMA_INICIAL);
  else {
    nomeDoProjeto = guardado.nome || nomeDoProjeto;
    mostrarAviso("Programa anterior recuperado.");
  }

  const aoMudar = (evento) => {
    if (evento.isUiEvent) return;
    guardarNoCache();
  };
  workspace.addChangeListener(aoMudar);
  desligar.push(() => workspace.removeChangeListener(aoMudar));

  // --- 3D, em modo vitrine ---
  cena.iniciar(tela);
  // Sem garra e sem seleção: o botão esquerdo gira a cena, que é o que faz
  // sentido quando não há nada para pegar com a mão.
  const THREE = cena3d.THREE;
  cena3d.orbita.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.PAN,
  };
  cena3d.orbita.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  cena3d.orbita.enabled = true;
  projeto.limparMesa();
  cena.enquadrar();
  cena.comecarDesenho();

  const palco = raiz.querySelector(".blocos__lado--palco");
  const observador = new ResizeObserver(() => redimensionar());
  observador.observe(palco);
  observador.observe(raiz.querySelector("#area-blocos"));
  desligar.push(() => observador.disconnect());
  redimensionar();

  desligar.push(
    ouvir("ajuste:mudou", ({ chave }) => {
      if (!cena3d.renderizador) return;
      if (chave === "tema" || chave === "gridMilimetros" || chave === "*") aplicarTema();
      if (chave === "opacidadeBase" || chave === "*") cena.atualizarOpacidadeDaBase();
    }),
  );

  const aoTeclar = (evento) => {
    if (!raiz || !raiz.isConnected) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(evento.target?.tagName)) return;
    if (evento.key === "Escape") parar();
  };
  window.addEventListener("keydown", aoTeclar);
  desligar.push(() => window.removeEventListener("keydown", aoTeclar));

  const guardarAoSair = () => guardarNoCache();
  window.addEventListener("pagehide", guardarAoSair);
  desligar.push(() => window.removeEventListener("pagehide", guardarAoSair));

  dizer('Monte os blocos embaixo de "quando eu mandar montar" e aperte Iniciar.');
}

export function encerrar() {
  try {
    execucao?.parar?.();
  } catch {
    // ignora
  }
  execucao = null;
  for (const parada of desligar) {
    try {
      parada();
    } catch {
      // ignora
    }
  }
  desligar = [];
  fecharMenusFlutuantes();
  try {
    workspace?.dispose?.();
  } catch (erro) {
    console.warn("Falha ao encerrar os blocos", erro);
  }
  workspace = null;
  blocoAceso = null;
  try {
    cena.encerrar();
  } catch (erro) {
    console.warn("Falha ao encerrar a cena 3D", erro);
  }
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
  raiz = null;
  tela = null;
}
