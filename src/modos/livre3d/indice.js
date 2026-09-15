// Setor Criação Livre, visualização 3D.
// Monta a tela, liga a navegação e o painel de propriedades. A geometria mora
// em solidos.js, as peças em pecas.js e o arquivo em projeto.js.

import * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";

import { carregarEstilo } from "../../core/carregar-script.js";
import { ouvir } from "../../core/eventos.js";
import { tocar } from "../../core/som.js";
import { valor as ajuste } from "../../core/ajustes.js";
import { escolherArquivo, lerJSON } from "../../core/arquivos.js";
import { t } from "../../core/idioma.js";
import { icone } from "../../ui/icones.js";
import { ferramenta as iconeFerramenta } from "../../ui/icones-ferramentas.js";
import {
  mostrarAviso,
  confirmar,
  perguntarTexto,
  abrirPainel,
  fecharPainel,
} from "../../ui/painel.js";
import { definirDestino, limparDestino } from "../../ui/painel-bolsa.js";
import { fala } from "../../ui/aliens.js";
import { campoArrastavel } from "../../ui/campo-numero.js";
import { grupoDeFerramentas, fecharMenusFlutuantes } from "../../ui/menu-flutuante.js";

import * as cena from "./cena.js";
import { cena3d } from "./cena.js";
import { DEFINICOES, nomeDe } from "./solidos.js";
import * as pecas from "./pecas.js";
import * as projeto from "./projeto.js";
import * as texto3d from "./texto3d.js";
import * as travessia from "./travessia.js";
import * as malha from "./malha.js";
import * as ponte from "../livre/ponte.js";

const GRUPOS_DE_SOLIDOS = [
  { id: "caixas", icone: "caixas", rotulo: "Caixas", tipos: ["cubo", "cuboide", "dado"] },
  {
    id: "arredondados",
    icone: "arredondados",
    rotulo: "Arredondados",
    tipos: ["esfera", "meiaEsfera", "cilindro", "cone"],
  },
  { id: "prismas", icone: "prismas", rotulo: "Prismas", tipos: ["prisma", "prismaEstrela"] },
  { id: "palitos", icone: "palitos", rotulo: "Palitos", tipos: ["palitoPicole", "palitoChurrasco"] },
  {
    id: "engrenagens",
    icone: "engrenagens",
    rotulo: "Engrenagens",
    tipos: ["engrenagem3d", "cremalheira"],
  },
  { id: "outros", icone: "outrosSolidos", rotulo: "Outros", tipos: ["torus", "anel", "piramide"] },
];

const MODOS_DE_PONTEIRO = [
  { id: "selecionar", icone: "seta", rotulo: "Selecionar" },
  { id: "somar", icone: "somar", rotulo: "Somar à seleção" },
  { id: "mao", icone: "mao", rotulo: "Arrastar a vista" },
  { id: "camera", icone: "camera", rotulo: "Girar a câmera" },
];

const VISTAS = [
  ["topo", "Topo"],
  ["frente", "Frente"],
  ["direita", "Direita"],
  ["esquerda", "Esquerda"],
  ["tras", "Trás"],
  ["cantoinho", "Perspectiva"],
];
const MODOS_DE_GARRA = [
  { id: "base", icone: "naBase", rotulo: "Mover na base", garra: "translate", semY: true },
  { id: "translate", icone: "mover3d", rotulo: "Mover livre", garra: "translate" },
  { id: "rotate", icone: "girar", rotulo: "Girar", garra: "rotate" },
  { id: "scale", icone: "escalar", rotulo: "Escalar", garra: "scale" },
];

let modoDaGarra = "base";
let modoDoPonteiro = "selecionar";
const areaDeTransferencia = [];

let raiz = null;
let tela = null;
let areaAtual = null;
let painelArea = null;
let statusArea = null;
let garra = null;
let raio = null;
let desligar = [];
let nomeDoProjeto = "Projeto 3D";
let salvamentoPendente = null;
const passado = [];
const futuro = [];

// --- Histórico por fotografias ----------------------------------------

function foto() {
  return JSON.stringify(cena3d.grupoPecas.children.map((peca) => pecas.serializar(peca)));
}
let ultimaFoto = "[]";

function registrar() {
  const agora = foto();
  if (agora === ultimaFoto) return;
  passado.push(ultimaFoto);
  if (passado.length > 30) passado.shift();
  futuro.length = 0;
  ultimaFoto = agora;
  agendarSalvamento();
}

function restaurar(json) {
  soltarGarra();
  projeto.limparMesa();
  for (const registro of JSON.parse(json)) pecas.reconstruir(registro);
  ultimaFoto = foto();
  atualizarPainel();
}

function desfazer() {
  if (!passado.length) return false;
  futuro.push(ultimaFoto);
  restaurar(passado.pop());
  return true;
}

function refazer() {
  if (!futuro.length) return false;
  passado.push(ultimaFoto);
  restaurar(futuro.pop());
  return true;
}

// --- Seleção -----------------------------------------------------------

function selecionar(lista) {
  cena3d.selecao = lista.filter(Boolean);
  pecas.destacar(cena3d.selecao);
  if (cena3d.selecao.length === 1) garra.attach(cena3d.selecao[0]);
  else soltarGarra();
  if (cena3d.selecao.length) pecas.atualizarMarcaDeContato(cena3d.selecao);
  else pecas.esconderMarcaDeContato();
  atualizarPainel();
  atualizarStatus();
}

function soltarGarra() {
  if (garra) garra.detach();
}

function pecaSobOPonteiro(evento) {
  const retangulo = tela.getBoundingClientRect();
  const ponteiro = new THREE.Vector2(
    ((evento.clientX - retangulo.left) / retangulo.width) * 2 - 1,
    -((evento.clientY - retangulo.top) / retangulo.height) * 2 + 1,
  );
  raio.setFromCamera(ponteiro, cena3d.camera);
  const encontrados = raio.intersectObjects(cena3d.grupoPecas.children, false);
  return encontrados.length ? encontrados[0].object : null;
}

// --- Layout ------------------------------------------------------------

function botaoDaBarra(nomeIcone, rotulo, aoClicar, { usarIconeUI = false, extra = "" } = {}) {
  const alvo = document.createElement("button");
  alvo.type = "button";
  alvo.className = `botao ${extra}`;
  alvo.title = rotulo;
  alvo.setAttribute("aria-label", rotulo);
  alvo.innerHTML = `${usarIconeUI ? icone(nomeIcone) : iconeFerramenta(nomeIcone)}<span class="rotulo-acao">${rotulo}</span>`;
  alvo.addEventListener("click", () => {
    tocar("clique");
    aoClicar();
  });
  return alvo;
}

function separador() {
  const barra = document.createElement("span");
  barra.className = "separador";
  return barra;
}

function montarEsqueleto(area, aoVoltar) {
  area.innerHTML = "";
  areaAtual = area;
  area.classList.add("conteudo--cheio");
  raiz = document.createElement("div");
  raiz.className = "livre livre3d";
  raiz.innerHTML = `
    <div class="livre__barra" role="toolbar" aria-label="Ações do projeto"></div>
    <div class="livre__corpo">
      <nav class="livre__ferramentas" aria-label="Caixa de ferramentas"></nav>
      <div class="livre__palco">
        <canvas id="tela-3d" aria-label="Base de impressão"></canvas>
        <div class="palco__canto palco__canto--topo-esquerda"></div>
        <div class="palco__canto palco__canto--topo-direita"></div>
        <div class="palco__canto palco__canto--zoom"></div>
      </div>
      <aside class="livre__painel" aria-label="Propriedades"></aside>
    </div>
    <p class="livre__status"></p>`;
  area.append(raiz);

  const barra = raiz.querySelector(".livre__barra");
  barra.append(
    botaoDaBarra("voltar", t("acoes.voltarSetor"), aoVoltar, {
      usarIconeUI: true,
      extra: "com-rotulo botao--destaque",
    }),
    separador(),
    botaoDaBarra("desfazer", "Desfazer", () => {
      if (!desfazer()) mostrarAviso("Nada para desfazer.", "alerta");
    }),
    botaoDaBarra("refazer", "Refazer", () => {
      if (!refazer()) mostrarAviso("Nada para refazer.", "alerta");
    }),
    separador(),
    grupoDeFerramentas({
      id: "arquivo",
      icone: "arquivo",
      rotulo: t("acoes.arquivo"),
      modo: "barra",
      opcoes: [
        { id: "salvar", icone: "arquivo", rotulo: "Salvar no navegador", aoEscolher: salvarComNome },
        { id: "baixar", icone: "exportar", rotulo: "Baixar projeto", aoEscolher: baixarComNome },
        { id: "abrir", icone: "pasta", rotulo: "Abrir projeto", aoEscolher: abrirProjeto },
        { id: "importar", icone: "caixas", rotulo: "Importar modelo 3D", aoEscolher: importarModelo },
        { id: "stl", icone: "exportar", rotulo: "Exportar STL", aoEscolher: exportarSTL },
        { id: "bolsa", icone: "guardarBolsa", rotulo: "Guardar na bolsa", aoEscolher: guardarNaBolsa },
      ],
    }),
    grupoDeFerramentas({
      id: "editar",
      icone: "unir",
      rotulo: "Editar",
      modo: "barra",
      opcoes: [
        { id: "copiar", icone: "caixas", rotulo: t("acoes.copiar"), aoEscolher: copiar },
        { id: "colar", icone: "caixas", rotulo: t("acoes.colar"), aoEscolher: colar },
        { id: "duplicar", icone: "caixas", rotulo: t("acoes.duplicar"), aoEscolher: duplicar },
      ],
    }),
    separador(),
    botaoDaBarra("alternar2d", "Alternar para 2D", alternarPara2D, { extra: "com-rotulo" }),
    botaoDaBarra("lixo", "Limpar base", limparBase, { extra: "botao--perigo com-rotulo" }),
    botaoDaBarra("telaCheia", t("acoes.telaCheia"), alternarTelaCheia),
    botaoDaBarra("regua", "Propriedades", alternarPainel, { extra: "so-estreito com-rotulo-sempre" }),
  );

  const caixa = raiz.querySelector(".livre__ferramentas");
  // Os quatro modos moram num grupo só: antes o último ficava escondido
  // atrás da rolagem da coluna.
  caixa.append(
    grupoDeFerramentas({
      id: "movimento",
      icone: "naBase",
      rotulo: "Modo de movimento",
      opcoes: MODOS_DE_GARRA.map((modo, indice) => ({
        id: modo.id,
        icone: modo.icone,
        rotulo: `${modo.rotulo}  (${indice + 1})`,
      })),
      aoEscolher: (opcao) => trocarGarra(opcao.id),
    }),
  );
  const seloGarra = document.createElement("span");
  seloGarra.className = "selo-ponteiro selo-ponteiro--visivel";
  seloGarra.dataset.seloGarra = "";
  caixa.append(seloGarra);

  for (const grupo of GRUPOS_DE_SOLIDOS) {
    caixa.append(
      grupoDeFerramentas({
        id: grupo.id,
        icone: grupo.icone,
        rotulo: grupo.rotulo,
        opcoes: grupo.tipos.map((tipo) => ({
          id: tipo,
          icone: iconeDoSolido(tipo),
          rotulo: nomeDe(tipo),
        })),
        aoEscolher: (opcao) => inserirSolido(opcao.id),
      }),
    );
  }

  const textoBotao = document.createElement("button");
  textoBotao.type = "button";
  textoBotao.className = "ferramenta";
  textoBotao.innerHTML = `${iconeFerramenta("texto")}<span>Texto 3D</span>`;
  textoBotao.addEventListener("click", inserirTexto3d);
  caixa.append(textoBotao);

  const caminhoBotao = document.createElement("button");
  caminhoBotao.type = "button";
  caminhoBotao.className = "ferramenta";
  caminhoBotao.innerHTML = `${iconeFerramenta("caminho")}<span>Caminho 2D</span>`;
  caminhoBotao.addEventListener("click", inserirCaminho2d);
  caixa.append(caminhoBotao);

  const estileteBotao = document.createElement("button");
  estileteBotao.type = "button";
  estileteBotao.className = "ferramenta";
  estileteBotao.innerHTML = `${iconeFerramenta("caneta")}<span>Estilete</span>`;
  estileteBotao.addEventListener("click", abrirEstilete);
  caixa.append(estileteBotao);

  // Controles flutuantes por cima da cena: ocupam pouco e deixam a área 3D
  // respirar, que é o que falta no celular.
  const cantoEsquerdo = raiz.querySelector(".palco__canto--topo-esquerda");
  cantoEsquerdo.append(
    grupoDeFerramentas({
      id: "ponteiro",
      icone: "ponteiro",
      rotulo: t("acoes.ponteiro"),
      modo: "barra",
      opcoes: MODOS_DE_PONTEIRO.map((modo) => ({ ...modo })),
      aoEscolher: (opcao) => trocarPonteiro(opcao.id),
    }),
  );
  const selo = document.createElement("span");
  selo.className = "selo-ponteiro";
  selo.dataset.selo = "";
  cantoEsquerdo.append(selo);

  // Modos da malha: só aparecem quando a peça está em edição.
  const caixaDaMalha = document.createElement("div");
  caixaDaMalha.className = "canto-malha";
  caixaDaMalha.dataset.malha = "";
  caixaDaMalha.append(
    grupoDeFerramentas({
      id: "modoMalha",
      icone: "nos",
      rotulo: "Ajuste da malha",
      modo: "barra",
      opcoes: malha.MODOS.map((modo) => ({ id: modo.id, icone: "nos", rotulo: modo.rotulo })),
      aoEscolher: (opcao) => {
        malha.definirModo(opcao.id);
        garra?.detach();
        atualizarSeloDaMalha();
        atualizarPainel();
      },
    }),
  );
  const seloMalha = document.createElement("span");
  seloMalha.className = "selo-ponteiro selo-ponteiro--visivel";
  seloMalha.dataset.seloMalha = "";
  caixaDaMalha.append(seloMalha);
  raiz.querySelector(".palco__canto--topo-esquerda").after(caixaDaMalha);

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
    botaoDaBarra("mais", "Aproximar", () => aproximar(1.2)),
    botaoDaBarra("menos", "Afastar", () => aproximar(1 / 1.2)),
    botaoDaBarra("enquadrar", "Enquadrar base", () => cena.enquadrar()),
  );

  const atalhoPainel = document.createElement("button");
  atalhoPainel.type = "button";
  atalhoPainel.className = "botao-propriedades";
  atalhoPainel.innerHTML = `${iconeFerramenta("regua")}<span>Propriedades</span>`;
  atalhoPainel.addEventListener("click", alternarPainel);
  raiz.querySelector(".livre__palco").append(atalhoPainel);

  tela = raiz.querySelector("#tela-3d");
  painelArea = raiz.querySelector(".livre__painel");
  statusArea = raiz.querySelector(".livre__status");
}

function alternarPainel() {
  raiz.classList.toggle("livre--painel-aberto");
  document.body.classList.toggle(
    "sem-rodape",
    raiz.classList.contains("livre--painel-aberto"),
  );
  cena.redimensionar(
    raiz.querySelector(".livre__palco").clientWidth,
    raiz.querySelector(".livre__palco").clientHeight,
  );
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

function inserirSolido(tipo) {
  const peca = pecas.criar(tipo);
  if (!peca) return;
  selecionar([peca]);
  registrar();
}

// Ação do dedo ou do botão esquerdo: selecionar, somar, arrastar ou girar.
function trocarPonteiro(id) {
  modoDoPonteiro = id;
  const ficha = MODOS_DE_PONTEIRO.find((modo) => modo.id === id) || MODOS_DE_PONTEIRO[0];
  const orbita = cena3d.orbita;
  if (!orbita) return;
  if (id === "mao") {
    orbita.mouseButtons.LEFT = THREE.MOUSE.PAN;
    orbita.touches.ONE = THREE.TOUCH.PAN;
  } else if (id === "camera") {
    orbita.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    orbita.touches.ONE = THREE.TOUCH.ROTATE;
  } else {
    orbita.mouseButtons.LEFT = null;
    orbita.touches.ONE = null;
  }
  orbita.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  const selo = raiz?.querySelector("[data-selo]");
  if (selo) {
    selo.innerHTML = `${iconeFerramenta(ficha.icone)}<span>${ficha.rotulo}</span>`;
    selo.classList.add("selo-ponteiro--visivel");
  }
  mostrarAviso(`Toque na tela: ${ficha.rotulo.toLowerCase()}.`);
}

async function inserirTexto3d() {
  const conteudo = await perguntarTexto("Texto 3D", "O que escrever:", texto3d.PADRAO.texto);
  if (conteudo === null) return;
  try {
    await texto3d.preparar();
    const geometria = await texto3d.geometriaDeTexto({ texto: conteudo });
    if (!geometria) {
      mostrarAviso("Esse texto não gerou volume. Tente outras letras.", "alerta");
      return;
    }
    const peca = pecas.pecaDeGeometria(geometria, `Texto: ${conteudo}`);
    selecionar([peca]);
    registrar();
    tocar("pronto");
  } catch (erro) {
    console.error(erro);
    tocar("erro");
    mostrarAviso("Não consegui carregar a fonte.", "erro");
  }
}

// Estilete no estilo do corte guiado: a folha do corte aparece atravessando a
// peça e acompanha cada mudança de direção, posição e ângulo. Só corta quando
// o aluno confirma.
let estilete = null;
let desenhandoCorte = false;
let tracoDoCorte = [];

function abrirEstilete() {
  if (cena3d.selecao.length !== 1) {
    mostrarAviso("Selecione uma peça para cortar.", "alerta");
    return;
  }
  estilete = {
    peca: cena3d.selecao[0],
    modo: "plano",
    eixo: "y",
    deslocamento: 0,
    angulo: 0,
    tipo: "separado",
  };
  pecas.mostrarPlanoDeCorte(estilete.peca, estilete);
  raiz.classList.add("livre--painel-aberto");
  atualizarPainel();
}

function fecharEstilete() {
  estilete = null;
  desenhandoCorte = false;
  tracoDoCorte = [];
  if (cena3d.orbita) cena3d.orbita.enabled = true;
  pecas.esconderPlanoDeCorte();
  atualizarPainel();
}

function atualizarPrevia() {
  if (!estilete) return;
  if (estilete.modo === "livre") {
    pecas.esconderPlanoDeCorte();
    return;
  }
  pecas.mostrarPlanoDeCorte(estilete.peca, estilete);
}

function blocoEstilete() {
  const secao = grupo("Estilete");
  const nota = document.createElement("p");
  nota.className = "dica";
  nota.textContent = "A folha verde mostra onde o corte vai passar.";
  secao.append(nota);

  const seletor = (rotulo, opcoes, chave) => {
    const caixa = document.createElement("label");
    caixa.className = "propriedade";
    caixa.innerHTML = `<span class="propriedade__nome">${rotulo}</span>`;
    const escolha = document.createElement("select");
    for (const opcao of opcoes) {
      const item = document.createElement("option");
      item.value = String(opcao.valor);
      item.textContent = opcao.rotulo;
      if (String(opcao.valor) === String(estilete[chave])) item.selected = true;
      escolha.append(item);
    }
    escolha.addEventListener("change", () => {
      estilete[chave] = escolha.value;
      atualizarPrevia();
      // Mudar o jeito de cortar troca os campos do painel inteiro.
      if (chave === "modo") atualizarPainel();
    });
    caixa.append(escolha);
    return caixa;
  };

  secao.append(
    seletor(
      "Como cortar",
      [
        { valor: "plano", rotulo: "Plano (folha atravessando)" },
        { valor: "livre", rotulo: "Livre (desenhar na peça)" },
      ],
      "modo",
    ),
  );

  if (estilete.modo === "livre") {
    const aviso = document.createElement("p");
    aviso.className = "dica";
    aviso.textContent = desenhandoCorte
      ? "Arraste o dedo ou o mouse por cima da peça e solte para cortar."
      : "Clique em desenhar e contorne na tela a parte que sai.";
    secao.append(
      aviso,
      linhaBotoes(
        botaoSimples("caneta", desenhandoCorte ? "Cancelar desenho" : "Desenhar o corte", () => {
          desenhandoCorte = !desenhandoCorte;
          tracoDoCorte = [];
          pecas.esconderPlanoDeCorte();
          cena3d.orbita.enabled = !desenhandoCorte;
          atualizarPainel();
        }),
        botaoSimples("fechar", "Sair do estilete", fecharEstilete),
      ),
    );
    return secao;
  }

  secao.append(
    seletor(
      "Direção",
      pecas.EIXOS_DE_CORTE.map((eixo) => ({ valor: eixo.id, rotulo: eixo.rotulo })),
      "eixo",
    ),
    campoNumero("Posição", deUnidade(estilete.deslocamento), (numero) => {
      estilete.deslocamento = paraMm(numero);
      atualizarPrevia();
    }),
    campoNumero(
      "Ângulo fino",
      estilete.angulo,
      (numero) => {
        estilete.angulo = Math.max(-89, Math.min(89, numero));
        atualizarPrevia();
      },
      { semUnidade: true },
    ),
    seletor(
      "Tipo",
      [
        { valor: "separado", rotulo: "Separado (duas peças)" },
        { valor: "completo", rotulo: "Completo (uma peça marcada)" },
      ],
      "tipo",
    ),
    linhaBotoes(
      botaoSimples("caneta", "Cortar agora", () => {
        const alvo = estilete.peca;
        const escolhas = { ...estilete };
        const partes = pecas.cortar(alvo, escolhas);
        if (!partes) {
          tocar("erro");
          mostrarAviso("O corte não pegou a peça. Mude a posição.", "alerta");
          return;
        }
        fecharEstilete();
        selecionar(partes);
        registrar();
        tocar("clique");
        mostrarAviso(partes.length > 1 ? "Peça cortada em duas." : "Corte aplicado.");
      }),
      botaoSimples("fechar", "Cancelar", fecharEstilete),
    ),
  );
  return secao;
}

// --- Editor de malha ---------------------------------------------------

let pegaDaMalha = null;
let ultimaPegaDaMalha = null;

function atualizarSeloDaMalha() {
  if (!raiz) return;
  const caixa = raiz.querySelector("[data-malha]");
  const selo = raiz.querySelector("[data-selo-malha]");
  if (!caixa || !selo) return;
  caixa.classList.toggle("canto-malha--visivel", malha.ativo());
  const ficha = malha.MODOS.find((modo) => modo.id === malha.modoAtual());
  selo.innerHTML = `${iconeFerramenta("nos")}<span>${ficha ? ficha.rotulo : ""}</span>`;
}

function entrarNaMalha(peca) {
  if (!malha.entrar(peca)) return;
  pecas.alternarModo([peca], "malha");
  soltarGarra();
  pegaDaMalha = new THREE.Object3D();
  cena3d.cena.add(pegaDaMalha);
  atualizarSeloDaMalha();
  atualizarPainel();
  mostrarAviso("Clique nos pontos da peça para marcar. A seta move o que estiver marcado.");
}

function sairDaMalha() {
  malha.sair();
  if (pegaDaMalha) {
    garra.detach();
    cena3d.cena.remove(pegaDaMalha);
    pegaDaMalha = null;
  }
  atualizarSeloDaMalha();
  atualizarPainel();
}

function prenderGarraNaMalha() {
  const centro = malha.centroDosMarcados();
  if (!centro || !pegaDaMalha) {
    garra?.detach();
    return;
  }
  pegaDaMalha.position.copy(centro);
  ultimaPegaDaMalha = centro.clone();
  garra.setMode("translate");
  garra.attach(pegaDaMalha);
}

function blocoMalha() {
  const secao = grupo("Editar malha");
  const nota = document.createElement("p");
  nota.className = "dica";
  nota.textContent = `Marcados: ${malha.quantosMarcados()}. Segure Shift para somar.`;
  const modos = linhaBotoes(
    ...malha.MODOS.map((modo) =>
      botaoSimples("nos", modo.rotulo, () => {
        malha.definirModo(modo.id);
        garra?.detach();
        atualizarPainel();
      }, malha.modoAtual() === modo.id ? "botao--destaque" : ""),
    ),
  );
  secao.append(nota, modos, linhaBotoes(botaoSimples("fechar", "Sair da malha", sairDaMalha)));
  return secao;
}

// --- Copiar, colar e duplicar ------------------------------------------

function copiar() {
  if (!cena3d.selecao.length) {
    mostrarAviso("Selecione alguma peça primeiro.", "alerta");
    return;
  }
  areaDeTransferencia.length = 0;
  for (const peca of cena3d.selecao) areaDeTransferencia.push(pecas.serializar(peca));
  mostrarAviso(`${areaDeTransferencia.length} peça(s) copiada(s).`);
}

function colar() {
  if (!areaDeTransferencia.length) {
    mostrarAviso("Nada copiado ainda.", "alerta");
    return;
  }
  const passo = Math.max(5, cena.passoDoEncaixe() || 5);
  const novas = areaDeTransferencia
    .map((registro) => pecas.reconstruir({ ...registro }))
    .filter(Boolean);
  for (const peca of novas) {
    peca.position.x += passo;
    peca.position.z += passo;
  }
  selecionar(novas);
  registrar();
  tocar("clique");
}

function duplicar() {
  if (!cena3d.selecao.length) {
    mostrarAviso("Selecione alguma peça primeiro.", "alerta");
    return;
  }
  copiar();
  colar();
}

function iconeDoSolido(tipo) {
  const mapa = {
    cubo: "cubo3d",
    cuboide: "cuboide3d",
    esfera: "esfera3d",
    cilindro: "cilindro3d",
    cone: "cone3d",
    torus: "torus3d",
    piramide: "piramide3d",
    prisma: "prisma3d",
    anel: "anel3d",
    prismaEstrela: "estrela3d",
    dado: "dado3d",
    palitoPicole: "palito3d",
    palitoChurrasco: "espeto3d",
    engrenagem3d: "engrenagem3d",
    meiaEsfera: "meiaEsfera3d",
    cremalheira: "cremalheira3d",
  };
  return mapa[tipo] || "cubo3d";
}

function trocarGarra(modo) {
  const ficha = MODOS_DE_GARRA.find((item) => item.id === modo) || MODOS_DE_GARRA[0];
  modoDaGarra = ficha.id;
  garra.setMode(ficha.garra);
  // No modo "mover na base" a alça de altura some: sobra o plano XZ, que
  // arrasta a peça deslizando pelo chão, com encaixe no grid.
  garra.showY = !ficha.semY;
  garra.showX = true;
  garra.showZ = true;
  const passo = cena.passoDoEncaixe();
  garra.setTranslationSnap(passo || null);
  garra.setRotationSnap(ficha.garra === "rotate" ? Math.PI / 12 : null);
  const selo = raiz?.querySelector("[data-selo-garra]");
  if (selo) selo.innerHTML = `${iconeFerramenta(ficha.icone)}<span>${ficha.rotulo}</span>`;
  tocar("clique");
}

// Câmera no teclado, no espírito do Roblox Studio: W e S vão e voltam, A e D
// andam para os lados, Q e E sobem e descem. Shift anda mais rápido.
function moverCamera(tecla, rapido) {
  const camera = cena3d.camera;
  const alvo = cena3d.orbita.target;
  const passo = (rapido ? 24 : 8) * (camera.position.distanceTo(alvo) / 220 + 0.5);
  const frente = new THREE.Vector3().subVectors(alvo, camera.position).setY(0).normalize();
  const lado = new THREE.Vector3().crossVectors(frente, new THREE.Vector3(0, 1, 0)).normalize();
  const passos = {
    w: frente.clone().multiplyScalar(passo),
    s: frente.clone().multiplyScalar(-passo),
    a: lado.clone().multiplyScalar(-passo),
    d: lado.clone().multiplyScalar(passo),
    q: new THREE.Vector3(0, -passo, 0),
    e: new THREE.Vector3(0, passo, 0),
  };
  const deslocamento = passos[tecla];
  if (!deslocamento) return;
  camera.position.add(deslocamento);
  alvo.add(deslocamento);
  cena3d.orbita.update();
}

const ATALHOS = [
  ["Modos de movimento", [
    ["1", "Mover na base"], ["2", "Mover livre"], ["3", "Girar"], ["4", "Escalar"],
  ]],
  ["Ação do toque e do clique", [
    ["6", "Selecionar"], ["7", "Somar à seleção"], ["8", "Arrastar a vista"], ["9", "Girar a câmera"],
  ]],
  ["Câmera pelo teclado", [
    ["W e S", "Vai e volta"], ["A e D", "Anda para os lados"], ["E e Q", "Sobe e desce"],
    ["Shift", "Anda mais rápido"],
  ]],
  ["Vistas (teclado numérico)", [
    ["7", "Topo"], ["1", "Frente"], ["3", "Direita"], ["4", "Esquerda"], ["9", "Trás"],
    ["5", "Perspectiva"], ["2", "Base"],
  ]],
  ["Edição", [
    ["Ctrl+Z", "Desfazer"], ["Ctrl+Shift+Z", "Refazer"], ["Ctrl+C", "Copiar"],
    ["Ctrl+V", "Colar"], ["Ctrl+D", "Duplicar"], ["Delete", "Apagar"], ["Esc", "Soltar a seleção"],
  ]],
];

function abrirAtalhos() {
  const corpo = document.createElement("div");
  for (const [titulo, linhas] of ATALHOS) {
    const secao = grupo(titulo);
    const lista = document.createElement("ul");
    lista.className = "lista-atalhos";
    for (const [tecla, descricao] of linhas) {
      const item = document.createElement("li");
      item.innerHTML = `<kbd>${tecla}</kbd><span>${descricao}</span>`;
      lista.append(item);
    }
    secao.append(lista);
    corpo.append(secao);
  }
  abrirPainel({ titulo: "Atalhos do teclado", corpo, botoes: [] });
}

function aproximar(fator) {
  const alvo = cena3d.orbita.target;
  const vetor = cena3d.camera.position.clone().sub(alvo).multiplyScalar(1 / fator);
  cena3d.camera.position.copy(alvo.clone().add(vetor));
  cena3d.orbita.update();
}

function atualizarStatus() {
  if (!statusArea) return;
  const unidade = ajuste("unidade");
  const passo = cena.passoDoEncaixe();
  const { largura, profundidade } = cena3d.base;
  const converter = (mm) => (unidade === "cm" ? (mm / 10).toFixed(1) : mm.toFixed(0));
  statusArea.textContent =
    `base ${converter(largura)} x ${converter(profundidade)} ${unidade}  ·  ` +
    `${passo ? `encaixe ${converter(passo)} ${unidade}` : "sem encaixe"}  ·  ` +
    `${cena3d.grupoPecas.children.length} peças  ·  ${cena3d.selecao.length} selecionadas`;
}

// --- Painel ------------------------------------------------------------

function campoNumero(rotulo, valorAtual, aoAplicar, opcoes = {}) {
  const unidade = ajuste("unidade");
  return campoArrastavel({
    rotulo,
    valorInicial: valorAtual,
    passo: opcoes.inteiro || opcoes.semUnidade ? 1 : unidade === "cm" ? 0.1 : 1,
    inteiro: Boolean(opcoes.inteiro),
    sufixo: opcoes.semUnidade ? "" : unidade,
    aoAplicar,
  });
}

function grupo(titulo) {
  const secao = document.createElement("section");
  secao.className = "grupo-propriedades";
  if (titulo) {
    const cabecalho = document.createElement("h3");
    cabecalho.textContent = titulo;
    secao.append(cabecalho);
  }
  return secao;
}

function linhaBotoes(...botoes) {
  const linha = document.createElement("div");
  linha.className = "linha-botoes";
  linha.append(...botoes);
  return linha;
}

function botaoSimples(nomeIcone, rotulo, aoClicar, extra = "") {
  return botaoDaBarra(nomeIcone, rotulo, aoClicar, { extra: `com-rotulo ${extra}` });
}

function deUnidade(mm) {
  return ajuste("unidade") === "cm" ? mm / 10 : mm;
}

function paraMm(numero) {
  return ajuste("unidade") === "cm" ? numero * 10 : numero;
}

function atualizarPainel() {
  if (!painelArea) return;
  painelArea.innerHTML = "";
  const selecionadas = cena3d.selecao;

  if (malha.ativo()) {
    painelArea.append(blocoMalha());
    atualizarStatus();
    return;
  }

  if (estilete && cena3d.grupoPecas.children.includes(estilete.peca)) {
    painelArea.append(blocoEstilete());
    atualizarStatus();
    return;
  }

  if (!selecionadas.length) {
    const oi = document.createElement("div");
    oi.innerHTML = fala(
      "zorp",
      "Clica num sólido da lista que ele aparece na base. Botão direito gira a câmera, botão do meio arrasta.",
    );
    painelArea.append(oi, blocoBase());
    atualizarStatus();
    return;
  }

  if (selecionadas.length === 1) {
    const peca = selecionadas[0];
    const definicao = DEFINICOES[peca.userData.tipo];
    if (definicao) painelArea.append(blocoParametros(peca, definicao));
    painelArea.append(blocoAjusteFino(peca), blocoAparencia(peca));
  } else {
    painelArea.append(grupo(`${selecionadas.length} peças selecionadas`), blocoOrganizar(selecionadas));
  }
  painelArea.append(blocoAcoes(selecionadas));
  atualizarStatus();
}

function blocoBase() {
  const secao = grupo("Base de impressão");
  const { largura, profundidade, grid } = cena3d.base;
  secao.append(
    campoNumero("Largura", deUnidade(largura), (numero) =>
      trocarBase({ largura: paraMm(numero) }),
    ),
    campoNumero("Profundidade", deUnidade(profundidade), (numero) =>
      trocarBase({ profundidade: paraMm(numero) }),
    ),
    campoNumero("Grid", deUnidade(grid), (numero) => trocarBase({ grid: paraMm(numero) })),
    linhaBotoes(botaoSimples("regua", "Atalhos", abrirAtalhos)),
  );
  return secao;
}

function trocarBase(mudanca) {
  cena.redefinirBase({ ...cena3d.base, ...mudanca });
  atualizarPainel();
}

function campoLista(rotulo, valorAtual, opcoes, aoMudar) {
  const caixa = document.createElement("label");
  caixa.className = "propriedade";
  caixa.innerHTML = `<span class="propriedade__nome">${rotulo}</span>`;
  const escolha = document.createElement("select");
  for (const opcao of opcoes) {
    const item = document.createElement("option");
    item.value = String(opcao.valor);
    item.textContent = opcao.rotulo;
    if (String(opcao.valor) === String(valorAtual)) item.selected = true;
    escolha.append(item);
  }
  escolha.addEventListener("change", () => aoMudar(escolha.value));
  caixa.append(escolha);
  return caixa;
}

function blocoParametros(peca, definicao) {
  const secao = grupo(definicao.nome);
  for (const [chave, campo] of Object.entries(definicao.params)) {
    const atual = peca.userData.params[chave];
    if (campo.opcoes) {
      secao.append(
        campoLista(campo.rotulo, atual, campo.opcoes, (valor) => {
          const numero = Number(valor);
          pecas.regerar(peca, { [chave]: Number.isFinite(numero) ? numero : valor });
          registrar();
          atualizarPainel();
        }),
      );
      continue;
    }
    secao.append(
      campoNumero(
        campo.rotulo,
        campo.semUnidade ? atual : deUnidade(atual),
        (numero) => {
          const bruto = campo.semUnidade ? numero : paraMm(numero);
          const limitado = Math.max(campo.min, Math.min(campo.max, bruto));
          pecas.regerar(peca, { [chave]: campo.inteiro ? Math.round(limitado) : limitado });
          registrar();
          atualizarPainel();
        },
        { semUnidade: campo.semUnidade, inteiro: campo.inteiro },
      ),
    );
  }
  return secao;
}

function blocoAjusteFino(peca) {
  const secao = grupo("Ajuste fino");
  const grau = (radiano) => (radiano * 180) / Math.PI;
  secao.append(
    campoNumero("Posição X", deUnidade(peca.position.x), (numero) => {
      peca.position.x = cena.encaixar(paraMm(numero));
      registrar();
    }),
    campoNumero("Altura Y", deUnidade(peca.position.y), (numero) => {
      peca.position.y = paraMm(numero);
      registrar();
    }),
    campoNumero("Posição Z", deUnidade(peca.position.z), (numero) => {
      peca.position.z = cena.encaixar(paraMm(numero));
      registrar();
    }),
    campoNumero("Giro X", grau(peca.rotation.x), (numero) => {
      peca.rotation.x = (numero * Math.PI) / 180;
      registrar();
    }, { semUnidade: true }),
    campoNumero("Giro Y", grau(peca.rotation.y), (numero) => {
      peca.rotation.y = (numero * Math.PI) / 180;
      registrar();
    }, { semUnidade: true }),
    campoNumero("Giro Z", grau(peca.rotation.z), (numero) => {
      peca.rotation.z = (numero * Math.PI) / 180;
      registrar();
    }, { semUnidade: true }),
  );
  const nota = document.createElement("p");
  nota.className = "dica";
  nota.textContent = "Giro em graus. Enter aplica o número.";
  secao.append(
    nota,
    linhaBotoes(
      botaoSimples("naBase", "Pousar na base", () => {
        pecas.pousarNaBase(peca);
        registrar();
        atualizarPainel();
      }),
    ),
  );
  return secao;
}

function blocoAparencia(peca) {
  const secao = grupo("Aparência");
  const paleta = document.createElement("div");
  paleta.className = "paleta";
  for (const cor of pecas.CORES_PECA) {
    const tinta = document.createElement("button");
    tinta.type = "button";
    tinta.className = "tinta";
    tinta.style.background = cor;
    tinta.setAttribute("aria-label", `Pintar de ${cor}`);
    tinta.addEventListener("click", () => {
      peca.userData.cor = cor;
      pecas.vestir(peca);
      registrar();
    });
    paleta.append(tinta);
  }
  const texturas = document.createElement("div");
  texturas.className = "linha-botoes";
  for (const opcao of pecas.TEXTURAS) {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = `botao ${peca.userData.textura === opcao.id ? "botao--destaque" : ""}`;
    alvo.textContent = opcao.rotulo;
    alvo.addEventListener("click", () => {
      peca.userData.textura = opcao.id;
      pecas.vestir(peca);
      registrar();
      atualizarPainel();
    });
    texturas.append(alvo);
  }
  secao.append(paleta, texturas);
  return secao;
}

function blocoOrganizar(selecionadas) {
  const secao = grupo("Organizar");
  const alinhar = (onde) => () => {
    pecas.alinhar(selecionadas, onde);
    registrar();
    atualizarPainel();
  };
  const distribuir = (eixo) => () => {
    if (!pecas.distribuir(selecionadas, eixo)) {
      mostrarAviso("Selecione três peças ou mais para distribuir.", "alerta");
      return;
    }
    registrar();
  };
  secao.append(
    linhaBotoes(
      botaoSimples("alinharEsquerda", "Esquerda", alinhar("esquerda")),
      botaoSimples("alinharCentroH", "Centro em X", alinhar("centroX")),
      botaoSimples("alinharDireita", "Direita", alinhar("direita")),
    ),
    linhaBotoes(
      botaoSimples("alinharTopo", "Frente", alinhar("frente")),
      botaoSimples("alinharMeioV", "Centro em Z", alinhar("centroZ")),
      botaoSimples("alinharBase", "Trás", alinhar("tras")),
    ),
    linhaBotoes(
      botaoSimples("naBase", "Base", alinhar("base")),
      botaoSimples("alinharMeioV", "Centro em Y", alinhar("centroY")),
      botaoSimples("alinharTopo", "Topo", alinhar("topo")),
    ),
    linhaBotoes(
      botaoSimples("distribuirH", "Distribuir em X", distribuir("x")),
      botaoSimples("distribuirV", "Distribuir em Y", distribuir("y")),
      botaoSimples("distribuirH", "Distribuir em Z", distribuir("z")),
    ),
  );
  return secao;
}

function blocoAcoes(selecionadas) {
  const secao = grupo("Peça");
  const negativas = selecionadas.every((peca) => peca.userData.negativo);
  const emMalha = selecionadas.every((peca) => peca.userData.modo === "malha");
  secao.append(
    linhaBotoes(
      botaoSimples("negativo", negativas ? "Voltar a positiva" : "Marcar negativa", () => {
        pecas.marcarNegativo(selecionadas, !negativas);
        registrar();
        atualizarPainel();
      }),
      botaoSimples("unir", "Unir peças", () => {
        if (!pecas.podeCombinar(selecionadas)) {
          mostrarAviso("Selecione pelo menos duas peças.", "alerta");
          return;
        }
        const nova = pecas.combinar(selecionadas);
        if (!nova) {
          mostrarAviso("A combinação não sobrou nada. Reposicione as peças.", "alerta");
          tocar("erro");
          return;
        }
        selecionar([nova]);
        registrar();
      }),
      botaoSimples("desunir", "Separar", () => {
        if (!pecas.podeDesunir(selecionadas)) {
          mostrarAviso("Só dá para desunir uma peça combinada.", "alerta");
          return;
        }
        const voltaram = pecas.desunir(selecionadas[0]);
        selecionar(voltaram || []);
        registrar();
      }),
    ),
    linhaBotoes(
      botaoSimples("nos", emMalha ? "Ver como rígida" : "Ver como malha", () => {
        pecas.alternarModo(selecionadas, emMalha ? "rigida" : "malha");
        registrar();
        atualizarPainel();
      }),
      botaoSimples("nos", "Editar malha", () => {
        if (selecionadas.length !== 1) {
          mostrarAviso("Selecione uma peça só para editar a malha.", "alerta");
          return;
        }
        entrarNaMalha(selecionadas[0]);
      }),
    ),
    linhaBotoes(
      botaoSimples("alternar3d", "Inverter em X", () => {
        pecas.espelhar(selecionadas, "x");
        registrar();
      }),
      botaoSimples("alternar3d", "Inverter em Y", () => {
        pecas.espelhar(selecionadas, "y");
        registrar();
      }),
      botaoSimples("alternar3d", "Inverter em Z", () => {
        pecas.espelhar(selecionadas, "z");
        registrar();
      }),
    ),
    linhaBotoes(
      botaoSimples("lixo", "Apagar", () => {
        for (const peca of selecionadas) pecas.remover(peca);
        selecionar([]);
        registrar();
      }, "botao--perigo"),
    ),
  );
  return secao;
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

async function exportarSTL() {
  const nome = await perguntarTexto("Exportar STL", "Nome do arquivo:", nomeDoProjeto);
  if (nome === null) return;
  const apenasSelecao = cena3d.selecao.length > 0;
  const feito = projeto.exportarSTL({ apenasSelecao, nome });
  if (!feito) {
    mostrarAviso("Não há peça positiva para exportar.", "alerta");
    return;
  }
  mostrarAviso(apenasSelecao ? "STL da seleção baixado." : "STL da base inteira baixado.");
}

async function importarModelo() {
  const arquivo = await escolherArquivo(".stl,.obj,.glb,.gltf");
  if (!arquivo) return;
  try {
    const criadas = await projeto.importarArquivo(arquivo);
    selecionar(criadas.slice(0, 1));
    registrar();
    tocar("pronto");
    mostrarAviso(`${criadas.length} peça(s) importada(s).`);
  } catch (erro) {
    tocar("erro");
    mostrarAviso(erro.message || "Não consegui ler esse arquivo.", "erro");
  }
}

async function guardarNaBolsa() {
  if (!cena3d.selecao.length) {
    mostrarAviso("Selecione as peças que quer guardar.", "alerta");
    return;
  }
  const nome = await perguntarTexto("Guardar na bolsa", "Nome da peça:", "Peça 3D");
  if (nome === null) return;
  await projeto.enviarParaBolsa(nome);
  tocar("salvar");
  mostrarAviso("Peça guardada na bolsa.");
}

async function limparBase() {
  const certeza = await confirmar("Isso apaga tudo que está na base. Continuar?");
  if (!certeza) return;
  soltarGarra();
  projeto.limparMesa();
  selecionar([]);
  registrar();
  mostrarAviso("Base limpa.");
}

async function abrirProjeto() {
  const salvos = await projeto.listarSalvos();
  const corpo = document.createElement("div");
  if (!salvos.length) {
    const vazio = document.createElement("p");
    vazio.className = "dica";
    vazio.textContent = "Nenhum projeto 3D salvo neste navegador ainda.";
    corpo.append(vazio);
  } else {
    const lista = document.createElement("ul");
    lista.className = "bolsa-lista";
    for (const registro of salvos) {
      const linha = document.createElement("li");
      linha.className = "bolsa-item";
      linha.innerHTML = `<div class="bolsa-item__dados">
        <div class="bolsa-item__nome">${registro.nome}</div>
        <div class="bolsa-item__meta">${new Date(registro.criadoEm).toLocaleString("pt-BR")}</div>
      </div>`;
      const abrir = document.createElement("button");
      abrir.type = "button";
      abrir.className = "botao botao--destaque";
      abrir.textContent = "Abrir";
      abrir.addEventListener("click", () => {
        try {
          projeto.desempacotar(registro.pacote);
          nomeDoProjeto = registro.nome;
          cena.redefinirBase(cena3d.base);
          ultimaFoto = foto();
          selecionar([]);
          fecharPainel();
          tocar("pronto");
        } catch {
          mostrarAviso("Não consegui abrir esse projeto.", "erro");
        }
      });
      linha.append(abrir);
      lista.append(linha);
    }
    corpo.append(lista);
  }
  abrirPainel({
    titulo: "Abrir projeto 3D",
    corpo,
    botoes: [
      {
        rotulo: "Abrir arquivo do computador",
        icone: "pasta",
        aoClicar: async () => {
          fecharPainel();
          const arquivo = await escolherArquivo(".json,.burad,application/json");
          if (!arquivo) return;
          try {
            projeto.desempacotar(await lerJSON(arquivo));
            cena.redefinirBase(cena3d.base);
            ultimaFoto = foto();
            selecionar([]);
            mostrarAviso("Projeto aberto.");
          } catch {
            mostrarAviso("Não consegui ler esse arquivo.", "erro");
          }
        },
      },
    ],
  });
}

let voltarParaEscolha = () => {};
let trocarDeModo = null;

// Leva para a bancada 2D o contorno do que encosta na base.
function alternarPara2D() {
  const triangulos = travessia.triangulosNaBase();
  if (!triangulos.length) {
    mostrarAviso("Nenhuma peça está encostando na base para virar contorno.", "alerta");
    trocarDeModo?.();
    return;
  }
  ponte.guardarParaODoisD({ grupos: triangulos, nome: "Contorno da base" });
  // As peças convertidas saem daqui: o desenho é o mesmo trabalho, visto do
  // outro lado, e não uma cópia.
  for (const peca of travessia.pecasNaBase()) pecas.remover(peca);
  selecionar([]);
  projeto.salvarNoCache(nomeDoProjeto).catch(() => {});
  trocarDeModo?.();
}

// Recebe o desenho vindo do 2D e transforma em volume.
function receberDoDoisD() {
  const carga = ponte.retirar("3d");
  if (!carga || !carga.svgs?.length) return;
  try {
    const criadas = [];
    carga.svgs.forEach((svg, indice) => {
      const peca = travessia.extrudarSVG(svg, {
        alturaMm: carga.alturaMm,
        nome: `${carga.nome} ${indice + 1}`,
      });
      if (peca) criadas.push(peca);
    });
    if (!criadas.length) {
      mostrarAviso("O desenho não gerou volume.", "alerta");
      return;
    }
    selecionar(criadas);
    registrar();
    mostrarAviso(`${criadas.length} peça(s) com ${carga.alturaMm} mm de altura.`);
  } catch (erro) {
    console.error(erro);
    mostrarAviso("Não consegui transformar esse desenho em volume.", "erro");
  }
}

// Caminho 2D de um arquivo SVG, direto para a base, já com altura.
async function inserirCaminho2d() {
  const arquivo = await escolherArquivo(".svg,image/svg+xml");
  if (!arquivo) return;
  const altura = await perguntarTexto("Extrusão", "Altura em milímetros:", "10");
  if (altura === null) return;
  try {
    const svg = await arquivo.text();
    const peca = travessia.extrudarSVG(svg, {
      alturaMm: Math.max(0.4, Number(altura) || 10),
      nome: arquivo.name.replace(/\.svg$/i, ""),
    });
    if (!peca) {
      mostrarAviso("Esse SVG não tem caminho fechado para extrudar.", "alerta");
      return;
    }
    selecionar([peca]);
    registrar();
    tocar("pronto");
  } catch (erro) {
    console.error(erro);
    tocar("erro");
    mostrarAviso("Não consegui ler esse SVG.", "erro");
  }
}

function agendarSalvamento() {
  if (!ajuste("salvarSozinho")) return;
  clearTimeout(salvamentoPendente);
  salvamentoPendente = setTimeout(() => {
    projeto.salvarNoCache(nomeDoProjeto).catch(() => {});
  }, 1200);
}

// --- Ciclo de vida -----------------------------------------------------

export async function montar(area, setor, aoVoltar, aoTrocarDeModo) {
  trocarDeModo = aoTrocarDeModo;
  carregarEstilo("styles/livre.css");
  montarEsqueleto(area, () => {
    encerrar();
    aoVoltar();
  });

  voltarParaEscolha = () => {
    encerrar();
    aoVoltar();
  };
  cena.iniciar(tela);
  raio = new THREE.Raycaster();

  garra = new TransformControls(cena3d.camera, tela);
  garra.setSize(0.9 * Number(ajuste("alcas") || 1));
  garra.addEventListener("dragging-changed", (evento) => {
    cena3d.orbita.enabled = !evento.value;
    const alvo = cena3d.selecao[0];
    if (evento.value) {
      pecas.atualizarMarcaDeContato(cena3d.selecao);
      return;
    }
    if (malha.ativo()) {
      registrar();
      return;
    }
    if (alvo && garra.getMode() === "translate") {
      alvo.position.x = cena.encaixar(alvo.position.x);
      alvo.position.z = cena.encaixar(alvo.position.z);
      if (modoDaGarra === "base") pecas.pousarNaBase(alvo);
    }
    pecas.atualizarMarcaDeContato(cena3d.selecao);
    registrar();
    atualizarPainel();
  });
  garra.addEventListener("objectChange", () => {
    if (malha.ativo() && pegaDaMalha && ultimaPegaDaMalha) {
      const passo = pegaDaMalha.position.clone().sub(ultimaPegaDaMalha);
      if (passo.lengthSq() > 0) {
        malha.mover(passo);
        ultimaPegaDaMalha = pegaDaMalha.position.clone();
      }
      return;
    }
    if (modoDaGarra === "base" && cena3d.selecao[0]) pecas.pousarNaBase(cena3d.selecao[0]);
    pecas.atualizarMarcaDeContato(cena3d.selecao);
  });
  const ajudante = garra.getHelper ? garra.getHelper() : garra;
  cena3d.cena.add(ajudante);
  trocarGarra("base");
  trocarPonteiro("selecionar");

  const aoClicar = (evento) => {
    if (evento.button !== 0 || garra.dragging) return;
    if (modoDoPonteiro === "mao" || modoDoPonteiro === "camera") return;
    if (malha.ativo()) {
      const retangulo = tela.getBoundingClientRect();
      const ponteiro = new THREE.Vector2(
        ((evento.clientX - retangulo.left) / retangulo.width) * 2 - 1,
        -((evento.clientY - retangulo.top) / retangulo.height) * 2 + 1,
      );
      raio.setFromCamera(ponteiro, cena3d.camera);
      malha.marcarPeloRaio(raio, evento.shiftKey || modoDoPonteiro === "somar");
      prenderGarraNaMalha();
      atualizarPainel();
      return;
    }
    if (desenhandoCorte) return;
    const alvo = pecaSobOPonteiro(evento);
    const somando = evento.ctrlKey || evento.metaKey || evento.shiftKey || modoDoPonteiro === "somar";
    if (!alvo) {
      if (!somando) selecionar([]);
      return;
    }
    if (somando) {
      const lista = cena3d.selecao.includes(alvo)
        ? cena3d.selecao.filter((peca) => peca !== alvo)
        : [...cena3d.selecao, alvo];
      selecionar(lista);
    } else {
      selecionar([alvo]);
    }
  };
  const pontoNoPlano = (evento) => {
    const retangulo = tela.getBoundingClientRect();
    const ponteiro = new THREE.Vector2(
      ((evento.clientX - retangulo.left) / retangulo.width) * 2 - 1,
      -((evento.clientY - retangulo.top) / retangulo.height) * 2 + 1,
    );
    raio.setFromCamera(ponteiro, cena3d.camera);
    const centro = new THREE.Box3().setFromObject(estilete.peca).getCenter(new THREE.Vector3());
    const frente = new THREE.Vector3();
    cena3d.camera.getWorldDirection(frente);
    const plano = new THREE.Plane().setFromNormalAndCoplanarPoint(frente.clone().negate(), centro);
    const alvo = new THREE.Vector3();
    return raio.ray.intersectPlane(plano, alvo) ? alvo : null;
  };

  const comecarTraco = (evento) => {
    if (!desenhandoCorte || !estilete) return;
    evento.preventDefault();
    tracoDoCorte = [];
    const ponto = pontoNoPlano(evento);
    if (ponto) tracoDoCorte.push(ponto);
    tela.setPointerCapture?.(evento.pointerId);
  };
  const seguirTraco = (evento) => {
    if (!desenhandoCorte || !tracoDoCorte.length) return;
    const ponto = pontoNoPlano(evento);
    if (ponto && ponto.distanceTo(tracoDoCorte[tracoDoCorte.length - 1]) > 0.8) {
      tracoDoCorte.push(ponto);
    }
  };
  const terminarTraco = (evento) => {
    if (!desenhandoCorte || !estilete) return;
    tela.releasePointerCapture?.(evento.pointerId);
    if (tracoDoCorte.length < 3) {
      tracoDoCorte = [];
      return;
    }
    const alvo = estilete.peca;
    const partes = pecas.cortarLivre(alvo, tracoDoCorte, cena3d.camera, {
      separar: estilete.tipo === "separado",
    });
    tracoDoCorte = [];
    desenhandoCorte = false;
    cena3d.orbita.enabled = true;
    if (!partes) {
      tocar("erro");
      mostrarAviso("O desenho não pegou a peça. Tente contornar por cima dela.", "alerta");
      atualizarPainel();
      return;
    }
    fecharEstilete();
    selecionar(partes);
    registrar();
    tocar("clique");
    mostrarAviso("Corte livre aplicado.");
  };

  tela.addEventListener("pointerdown", comecarTraco);
  tela.addEventListener("pointermove", seguirTraco);
  tela.addEventListener("pointerup", terminarTraco);
  desligar.push(() => {
    tela.removeEventListener("pointerdown", comecarTraco);
    tela.removeEventListener("pointermove", seguirTraco);
    tela.removeEventListener("pointerup", terminarTraco);
  });

  tela.addEventListener("pointerdown", aoClicar);
  desligar.push(() => tela.removeEventListener("pointerdown", aoClicar));

  const aoTeclar = (evento) => {
    if (!raiz || !raiz.isConnected) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(evento.target?.tagName)) return;
    const comando = evento.ctrlKey || evento.metaKey;
    if (comando && evento.key.toLowerCase() === "z") {
      evento.preventDefault();
      if (evento.shiftKey) refazer();
      else desfazer();
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
    if (comando && evento.key.toLowerCase() === "d") {
      evento.preventDefault();
      duplicar();
      return;
    }
    if (evento.key === "Delete" || evento.key === "Backspace") {
      if (!cena3d.selecao.length) return;
      evento.preventDefault();
      for (const peca of cena3d.selecao) pecas.remover(peca);
      selecionar([]);
      registrar();
      return;
    }
    if (evento.key === "Escape") selecionar([]);
    const numero = Number(evento.key);
    if (evento.code.startsWith("Numpad") && Number.isFinite(numero)) {
      const vistaNumerica = {
        1: "frente", 3: "direita", 7: "topo", 9: "tras", 4: "esquerda", 5: "cantoinho", 2: "base",
      }[numero];
      if (vistaNumerica) {
        evento.preventDefault();
        cena.olharDe(vistaNumerica);
      }
      return;
    }
    if (numero >= 1 && numero <= 4) {
      trocarGarra(MODOS_DE_GARRA[numero - 1].id);
      return;
    }
    if (numero >= 6 && numero <= 9) {
      trocarPonteiro(MODOS_DE_PONTEIRO[numero - 6].id);
      return;
    }
    if ("wasdqe".includes(evento.key.toLowerCase())) {
      moverCamera(evento.key.toLowerCase(), evento.shiftKey);
      return;
    }
    if (evento.key.toLowerCase() === "b") trocarGarra("base");
    if (evento.key.toLowerCase() === "r") trocarGarra("rotate");
  };
  window.addEventListener("keydown", aoTeclar);
  desligar.push(() => window.removeEventListener("keydown", aoTeclar));

  const palco = raiz.querySelector(".livre__palco");
  const observador = new ResizeObserver(() => {
    cena.redimensionar(palco.clientWidth, palco.clientHeight);
    pecas.atualizarResolucaoDasLinhas(palco.clientWidth, palco.clientHeight);
  });
  observador.observe(palco);
  desligar.push(() => observador.disconnect());
  cena.redimensionar(palco.clientWidth, palco.clientHeight);
  pecas.atualizarResolucaoDasLinhas(palco.clientWidth, palco.clientHeight);

  desligar.push(
    ouvir("ajuste:mudou", ({ chave }) => {
      if (!cena3d.renderizador) return;
      if (chave === "tema" || chave === "*") cena.desenharBase();
      if (chave === "opacidadeBase" || chave === "*") cena.atualizarOpacidadeDaBase();
      if (chave === "snap" || chave === "*") trocarGarra(modoDaGarra);
      if (chave === "alcas") garra.setSize(0.9 * Number(ajuste("alcas") || 1));
      atualizarPainel();
    }),
  );

  definirDestino((item) => {
    if (!cena3d.renderizador) return false;
    const deu = projeto.colocarDaBolsa(item);
    if (!deu) return false;
    registrar();
    selecionar(cena3d.selecao);
    return true;
  });
  desligar.push(() => limparDestino());

  const guardarAoSair = () => {
    if (cena3d.renderizador && ajuste("salvarSozinho")) {
      projeto.salvarNoCache(nomeDoProjeto).catch(() => {});
    }
  };
  window.addEventListener("pagehide", guardarAoSair);
  desligar.push(() => window.removeEventListener("pagehide", guardarAoSair));

  const guardado = await projeto.lerDoCache();
  if (guardado) {
    try {
      projeto.desempacotar(guardado);
      cena.redefinirBase(cena3d.base);
      nomeDoProjeto = guardado.nome || nomeDoProjeto;
      mostrarAviso("Projeto 3D anterior recuperado.");
    } catch {
      // projeto velho: começa limpo
    }
  }

  receberDoDoisD();
  ultimaFoto = foto();
  cena.comecarDesenho();
  selecionar([]);
}

export function encerrar() {
  // Sair não pode falhar no meio: se qualquer passo quebrar, a tela ficaria
  // presa com o 3D já desligado. Por isso tudo aqui é defensivo.
  try {
    garra?.detach?.();
  } catch {
    // ignora
  }
  for (const parar of desligar) {
    try {
      parar();
    } catch {
      // ignora
    }
  }
  desligar = [];
  estilete = null;
  malha.sair();
  fecharMenusFlutuantes();
  document.body.classList.remove("sem-rodape");
  clearTimeout(salvamentoPendente);
  if (cena3d.renderizador && ajuste("salvarSozinho")) {
    projeto.salvarNoCache(nomeDoProjeto).catch(() => {});
  }
  try {
    garra?.dispose?.();
  } catch {
    // ignora
  }
  garra = null;
  try {
    cena.encerrar();
  } catch (erro) {
    console.warn("Falha ao encerrar a cena 3D", erro);
  }
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
  raiz = null;
  passado.length = 0;
  futuro.length = 0;
}
