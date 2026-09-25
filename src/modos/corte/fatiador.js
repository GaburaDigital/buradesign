// O fatiador: um modelo 3D vira uma pilha de camadas de chapa.
//
// É o caminho para as formas que não se montam com paredes — um morro, um
// peixe, um rosto. O aluno traz o modelo, escolhe a espessura e vê a pilha
// aparecer; o plano de corte sai igual ao da montagem, com as camadas
// numeradas de baixo para cima.

import * as THREE from "three";

import { carregarEstilo } from "../../core/carregar-script.js";
import { ouvir } from "../../core/eventos.js";
import { tocar } from "../../core/som.js";
import { escolherArquivo, baixarTexto, carimboDeData } from "../../core/arquivos.js";
import { t } from "../../core/idioma.js";
import { icone } from "../../ui/icones.js";
import { ferramenta as iconeFerramenta } from "../../ui/icones-ferramentas.js";
import { mostrarAviso, confirmar, perguntarTexto, abrirPainel, fecharPainel } from "../../ui/painel.js";
import { definirDestino, limparDestino } from "../../ui/painel-bolsa.js";
import { campoArrastavel } from "../../ui/campo-numero.js";
import { grupoDeFerramentas, fecharMenusFlutuantes } from "../../ui/menu-flutuante.js";

import * as cena from "../livre3d/cena.js";
import { cena3d } from "../livre3d/cena.js";
import * as projeto from "../livre3d/projeto.js";
import { nomeDeArquivo } from "../livre/projeto.js";

import * as materiais from "./materiais.js";
import { fatiarModelo } from "./fatias.js";
import { arranjar } from "./arranjo.js";
import { montarPlanoSVG, listaDePecas } from "./planosvg.js";

const VISTAS = [
  ["cantoinho", "Perspectiva"],
  ["frente", "Frente"],
  ["direita", "Direita"],
  ["topo", "Topo"],
];

let raiz = null;
let areaAtual = null;
let tela = null;
let painelArea = null;
let statusArea = null;
let desligar = [];
let grupoCamadas = null;
let camadas = [];
let furoDeAlinhamento = 0;
let separado = false;

function config() {
  return materiais.valores();
}

function temModelo() {
  return Boolean(cena3d.grupoPecas && cena3d.grupoPecas.children.length);
}

// --- Fatiar ------------------------------------------------------------

function limparCamadas() {
  if (!grupoCamadas) return;
  for (const filho of grupoCamadas.children.slice()) {
    filho.geometry?.dispose?.();
    filho.material?.dispose?.();
    grupoCamadas.remove(filho);
  }
  camadas = [];
}

// Cada camada vira uma lasca no 3D, para o aluno ver a pilha antes de cortar.
function desenharCamadas() {
  limparCamadas();
  if (!temModelo()) return;
  const { espessura } = config();
  const resultado = fatiarModelo(cena3d.grupoPecas.children, {
    espessura,
    furoDeAlinhamento,
  });
  camadas = resultado.camadas;

  const caixa = new THREE.Box3();
  for (const peca of cena3d.grupoPecas.children) caixa.expandByObject(peca);
  const tons = cena.paleta3d();

  camadas.forEach((camada, indice) => {
    const forma = new THREE.Shape(camada.contorno.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const furo of camada.furos) {
      forma.holes.push(new THREE.Path(furo.map(([x, y]) => new THREE.Vector2(x, y))));
    }
    let geometria;
    try {
      geometria = new THREE.ExtrudeGeometry(forma, { depth: espessura * 0.92, bevelEnabled: false });
    } catch {
      return;
    }
    geometria.rotateX(Math.PI / 2);
    const malha = new THREE.Mesh(
      geometria,
      new THREE.MeshStandardMaterial({
        color: indice % 2 ? 0xe8c98a : 0xd9b87a,
        roughness: 0.85,
        metalness: 0.02,
      }),
    );
    const folga = separado ? espessura * 0.9 : 0;
    malha.position.y = caixa.min.y + espessura * (indice + 1) + indice * folga;
    const contorno = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometria, 25),
      new THREE.LineBasicMaterial({ color: tons.borda, transparent: true, opacity: 0.7 }),
    );
    malha.add(contorno);
    grupoCamadas.add(malha);
  });

  for (const aviso of resultado.avisos) mostrarAviso(aviso, "alerta");
  atualizarStatus();
}

function mostrarModelo(sim) {
  if (cena3d.grupoPecas) cena3d.grupoPecas.visible = sim;
}

// --- Trazer o modelo ---------------------------------------------------

async function importarModelo() {
  const arquivo = await escolherArquivo(".stl,.obj,.glb,.gltf");
  if (!arquivo) return;
  try {
    projeto.limparMesa();
    await projeto.importarArquivo(arquivo);
    mostrarModelo(true);
    desenharCamadas();
    mostrarModelo(false);
    cena.enquadrar();
    tocar("pronto");
    atualizarPainel();
  } catch (erro) {
    tocar("erro");
    mostrarAviso(erro.message || "Não consegui ler esse arquivo.", "erro");
  }
}

async function trazerDoDesign3d() {
  const guardado = await projeto.lerDoCache();
  if (!guardado) {
    mostrarAviso("Não há projeto 3D salvo neste navegador.", "alerta");
    return;
  }
  try {
    projeto.desempacotar(guardado);
    desenharCamadas();
    mostrarModelo(false);
    cena.enquadrar();
    tocar("pronto");
    atualizarPainel();
    mostrarAviso(`"${guardado.nome || "Projeto 3D"}" trazido para o fatiador.`);
  } catch {
    mostrarAviso("Não consegui abrir esse projeto.", "erro");
  }
}

async function limparModelo() {
  if (!temModelo()) return;
  const certeza = await confirmar("Isso tira o modelo e as camadas da bancada. Continuar?");
  if (!certeza) return;
  projeto.limparMesa();
  limparCamadas();
  atualizarPainel();
  atualizarStatus();
}

// --- Plano de corte ----------------------------------------------------

function abrirPlano() {
  if (!camadas.length) {
    mostrarAviso("Traga um modelo e fatie antes de pedir o plano.", "alerta");
    return;
  }
  const cfg = config();
  const arranjo = arranjar(camadas, {
    chapaLargura: cfg.chapaLargura,
    chapaAltura: cfg.chapaAltura,
    respiro: cfg.respiro,
  });
  const svg = montarPlanoSVG(arranjo, {
    material: materiais.nomeDoMaterial(),
    espessura: cfg.espessura,
  });
  const lista = listaDePecas(arranjo);

  const corpo = document.createElement("div");
  corpo.className = "corte__plano";
  const resumo = document.createElement("p");
  resumo.className = "dica";
  const aproveita = arranjo.aproveitamento.map((n) => `${Math.round(n)}%`).join(", ");
  resumo.textContent = `${lista.length} camada(s) · ${arranjo.folhas.length} folha(s) de ${cfg.chapaLargura} × ${cfg.chapaAltura} mm · aproveitamento ${aproveita}`;

  const moldura = document.createElement("div");
  moldura.className = "corte__previa";
  moldura.innerHTML = svg.replace(/<\?xml[^>]*\?>/, "");

  const nota = document.createElement("p");
  nota.className = "dica";
  nota.textContent =
    "As camadas saem numeradas de baixo para cima: empilhe na ordem e a forma volta.";

  corpo.append(resumo, moldura, nota);
  if (arranjo.grandes.length) {
    const alerta = document.createElement("p");
    alerta.className = "dica dica--alerta";
    alerta.textContent = `${arranjo.grandes.length} camada(s) não cabem na chapa escolhida.`;
    corpo.append(alerta);
  }

  abrirPainel({
    titulo: "Plano de corte das camadas",
    corpo,
    botoes: [
      {
        rotulo: "Baixar SVG",
        variante: "destaque",
        aoClicar: async () => {
          const nome = await perguntarTexto("Baixar plano de corte", "Nome do arquivo:", "camadas");
          if (nome === null) return;
          baixarTexto(`${nomeDeArquivo(nome)}_${carimboDeData()}.svg`, svg, "image/svg+xml");
          tocar("salvar");
        },
      },
      { rotulo: "Fechar" },
    ],
  });
}

// --- Painel ------------------------------------------------------------

function grupoPainel(titulo) {
  const secao = document.createElement("section");
  secao.className = "grupo-propriedades";
  const cabeca = document.createElement("h3");
  cabeca.textContent = titulo;
  secao.append(cabeca);
  return secao;
}

// O campoArrastavel monta o rótulo e o campo juntos, do mesmo jeito que no
// Design 3D. As chaves dele são "rotulo" e "valorInicial": passar "valor"
// deixava toda a coluna da direita em branco.
function campoNumero(rotulo, valorAtual, aoAplicar, opcoes = {}) {
  return campoArrastavel({ rotulo, valorInicial: valorAtual, aoAplicar, ...opcoes });
}

function campoLista(rotulo, valorAtual, opcoes, aoMudar) {
  const linha = document.createElement("label");
  linha.className = "campo";
  const nome = document.createElement("span");
  nome.className = "campo__rotulo";
  nome.textContent = rotulo;
  const escolha = document.createElement("select");
  for (const opcao of opcoes) {
    const item = document.createElement("option");
    item.value = opcao.id;
    item.textContent = opcao.nome;
    if (opcao.id === valorAtual) item.selected = true;
    escolha.append(item);
  }
  escolha.addEventListener("change", () => aoMudar(escolha.value));
  linha.append(nome, escolha);
  return linha;
}

function interruptor(rotulo, ligado, aoMudar) {
  const linha = document.createElement("label");
  linha.className = "campo campo--linha";
  const caixa = document.createElement("input");
  caixa.type = "checkbox";
  caixa.checked = ligado;
  caixa.addEventListener("change", () => aoMudar(caixa.checked));
  const nome = document.createElement("span");
  nome.className = "campo__rotulo";
  nome.textContent = rotulo;
  linha.append(caixa, nome);
  return linha;
}

function atualizarPainel() {
  if (!painelArea) return;
  painelArea.innerHTML = "";
  const cfg = config();

  const chapa = grupoPainel("Chapa");
  chapa.append(
    campoLista("Material", cfg.material, materiais.MATERIAIS, (id) => {
      materiais.definir({ material: id });
      desenharCamadas();
      atualizarPainel();
    }),
    campoNumero("Espessura (mm)", cfg.espessura, (n) => {
      materiais.definir({ espessura: n });
      desenharCamadas();
      atualizarPainel();
    }, { min: 0.5, max: 30, passo: 0.5 }),
  );

  const pilha = grupoPainel("Camadas");
  pilha.append(
    campoNumero("Furo de alinhamento (mm)", furoDeAlinhamento, (n) => {
      furoDeAlinhamento = n;
      desenharCamadas();
    }, { min: 0, max: 30, passo: 0.5 }),
    interruptor("Separar as camadas para ver", separado, (ligado) => {
      separado = ligado;
      desenharCamadas();
    }),
    interruptor("Mostrar o modelo por baixo", Boolean(cena3d.grupoPecas?.visible), (ligado) => {
      mostrarModelo(ligado);
    }),
  );

  const folha = grupoPainel("Folha de corte");
  folha.append(
    campoLista("Tamanho", cfg.chapa, materiais.CHAPAS, (id) => {
      materiais.definir({ chapa: id });
      atualizarPainel();
    }),
    campoNumero("Largura (mm)", cfg.chapaLargura, (n) => {
      materiais.definir({ chapaLargura: n });
      atualizarPainel();
    }, { min: 50, max: 3000, passo: 10 }),
    campoNumero("Altura (mm)", cfg.chapaAltura, (n) => {
      materiais.definir({ chapaAltura: n });
      atualizarPainel();
    }, { min: 50, max: 3000, passo: 10 }),
  );

  painelArea.append(chapa, pilha, folha);
  if (!temModelo()) {
    const dica = document.createElement("p");
    dica.className = "dica";
    dica.textContent = "Traga um modelo: da bolsa, do Design 3D ou de um arquivo STL.";
    painelArea.append(dica);
  }
}

function atualizarStatus() {
  if (!statusArea) return;
  const cfg = config();
  statusArea.textContent = camadas.length
    ? `${camadas.length} camada(s) de ${cfg.espessura} mm · ${materiais.nomeDoMaterial()}`
    : temModelo()
      ? "Modelo na bancada. Ajuste a espessura para fatiar."
      : "Traga um modelo para fatiar.";
}

// --- Tela --------------------------------------------------------------

function montarEsqueleto(area, aoVoltar, aoTrocar) {
  area.innerHTML = "";
  areaAtual = area;
  area.classList.add("conteudo--cheio");
  raiz = document.createElement("div");
  raiz.className = "livre livre3d corte";
  raiz.innerHTML = `
    <div class="livre__barra" role="toolbar" aria-label="Ações do fatiador"></div>
    <div class="livre__corpo">
      <nav class="livre__ferramentas" aria-label="Trazer modelo"></nav>
      <div class="livre__palco">
        <canvas id="tela-fatiador" aria-label="Modelo fatiado em camadas"></canvas>
        <div class="palco__canto palco__canto--topo-direita"></div>
        <div class="palco__canto palco__canto--zoom"></div>
      </div>
      <aside class="livre__painel" aria-label="Camadas e folha"></aside>
    </div>
    <p class="livre__status"></p>`;
  area.append(raiz);

  const botaoBarra = (nomeIcone, rotulo, aoClicar, extra = "", usarIconeUI = false) => {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = `botao ${extra}`.trim();
    alvo.title = rotulo;
    alvo.setAttribute("aria-label", rotulo);
    alvo.innerHTML = `${usarIconeUI ? icone(nomeIcone) : iconeFerramenta(nomeIcone)}<span class="rotulo-acao">${rotulo}</span>`;
    alvo.addEventListener("click", () => {
      tocar("clique");
      aoClicar();
    });
    return alvo;
  };
  const risco = () => {
    const linha = document.createElement("span");
    linha.className = "separador";
    return linha;
  };

  raiz.querySelector(".livre__barra").append(
    botaoBarra("voltar", t("acoes.voltarSetor"), aoVoltar, "com-rotulo botao--destaque", true),
    risco(),
    botaoBarra("fatiar", "Fatiar de novo", () => desenharCamadas(), "com-rotulo"),
    botaoBarra("planoCorte", "Plano de corte", abrirPlano, "com-rotulo botao--destaque"),
    risco(),
    botaoBarra("chapaFrente", "Ir para a montagem", aoTrocar, "com-rotulo"),
    botaoBarra("lixo", "Limpar bancada", limparModelo, "botao--perigo com-rotulo"),
  );

  const caixa = raiz.querySelector(".livre__ferramentas");
  const ferramenta = (nomeIcone, rotulo, aoClicar) => {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "ferramenta";
    alvo.innerHTML = `${iconeFerramenta(nomeIcone)}<span>${rotulo}</span>`;
    alvo.addEventListener("click", aoClicar);
    return alvo;
  };
  caixa.append(
    ferramenta("caixas", "Importar STL", importarModelo),
    ferramenta("cubo3d", "Trazer do Design 3D", trazerDoDesign3d),
    ferramenta("guardarBolsa", "Trazer da bolsa", () => {
      mostrarAviso("Abra a bolsa lá em cima e toque na peça que quer fatiar.");
    }),
  );

  raiz.querySelector(".palco__canto--topo-direita").append(
    grupoDeFerramentas({
      id: "vistas",
      icone: "cameraCubo",
      rotulo: t("acoes.vistas"),
      modo: "barra",
      opcoes: VISTAS.map(([nome, rotulo]) => ({ id: nome, icone: "cameraCubo", rotulo })),
      aoEscolher: (opcao) => cena.olharDe(opcao.id),
    }),
  );

  raiz.querySelector(".palco__canto--zoom").append(
    botaoBarra("mais", "Aproximar", () => aproximar(1.2)),
    botaoBarra("menos", "Afastar", () => aproximar(1 / 1.2)),
    botaoBarra("enquadrar", "Enquadrar", () => cena.enquadrar()),
  );

  tela = raiz.querySelector("#tela-fatiador");
  painelArea = raiz.querySelector(".livre__painel");
  statusArea = raiz.querySelector(".livre__status");
}

function aproximar(fator) {
  const alvo = cena3d.orbita.target;
  cena3d.camera.position.sub(alvo).multiplyScalar(1 / fator).add(alvo);
  cena3d.orbita.update();
}

export async function montar(area, setor, aoVoltar, opcoes = {}) {
  carregarEstilo("styles/livre.css");
  carregarEstilo("styles/corte.css");
  materiais.carregar();
  montarEsqueleto(area, aoVoltar, opcoes.aoTrocar || (() => {}));

  cena.iniciar(tela);
  cena3d.orbita.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.PAN,
  };
  cena3d.orbita.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  grupoCamadas = new THREE.Group();
  cena3d.cena.add(grupoCamadas);
  projeto.limparMesa();

  const palco = raiz.querySelector(".livre__palco");
  const observador = new ResizeObserver(() => cena.redimensionar(palco.clientWidth, palco.clientHeight));
  observador.observe(palco);
  desligar.push(() => observador.disconnect());
  cena.redimensionar(palco.clientWidth, palco.clientHeight);

  desligar.push(
    ouvir("ajuste:mudou", ({ chave }) => {
      if (!cena3d.renderizador) return;
      if (chave === "tema" || chave === "gridMilimetros" || chave === "*") {
        cena.desenharBase();
        desenharCamadas();
      }
      if (chave === "opacidadeBase" || chave === "*") cena.atualizarOpacidadeDaBase();
    }),
  );

  definirDestino((item) => {
    if (!cena3d.renderizador) return false;
    projeto.limparMesa();
    const deu = projeto.colocarDaBolsa(item);
    if (!deu) return false;
    desenharCamadas();
    mostrarModelo(false);
    cena.enquadrar();
    atualizarPainel();
    return true;
  });
  desligar.push(() => limparDestino());

  atualizarPainel();
  atualizarStatus();
  cena.enquadrar();
  cena.comecarDesenho();
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
  limparCamadas();
  grupoCamadas = null;
  camadas = [];
  try {
    cena.encerrar();
  } catch (erro) {
    console.warn("Falha ao encerrar a cena do fatiador", erro);
  }
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
  raiz = null;
  tela = null;
  painelArea = null;
  statusArea = null;
}
