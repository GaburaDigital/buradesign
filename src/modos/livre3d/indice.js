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

import * as cena from "./cena.js";
import { cena3d } from "./cena.js";
import { DEFINICOES, nomeDe } from "./solidos.js";
import * as pecas from "./pecas.js";
import * as projeto from "./projeto.js";

const SOLIDOS = Object.keys(DEFINICOES);
const MODOS_DE_GARRA = [
  { id: "translate", icone: "seta", rotulo: "Mover" },
  { id: "rotate", icone: "engrenagem", rotulo: "Girar" },
  { id: "scale", icone: "quadrado", rotulo: "Escalar" },
];

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
  for (const peca of cena3d.grupoPecas.children) {
    const contorno = peca.getObjectByName("contorno");
    const marcada = cena3d.selecao.includes(peca);
    if (contorno) {
      contorno.material.color.set(
        marcada ? cena.paleta3d().guia : peca.userData.negativo ? 0xe03131 : cena.paleta3d().borda,
      );
      contorno.material.opacity = marcada ? 1 : 0.55;
    }
  }
  if (cena3d.selecao.length === 1) garra.attach(cena3d.selecao[0]);
  else soltarGarra();
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
        <div class="cubo-vistas" aria-label="Direção da câmera"></div>
      </div>
      <aside class="livre__painel" aria-label="Propriedades"></aside>
    </div>
    <p class="livre__status"></p>`;
  area.append(raiz);

  const barra = raiz.querySelector(".livre__barra");
  barra.append(
    botaoDaBarra("voltar", t("acoes.voltar"), aoVoltar, { usarIconeUI: true }),
    separador(),
    botaoDaBarra("desfazer", "Desfazer", () => {
      if (!desfazer()) mostrarAviso("Nada para desfazer.", "alerta");
    }),
    botaoDaBarra("refazer", "Refazer", () => {
      if (!refazer()) mostrarAviso("Nada para refazer.", "alerta");
    }),
    separador(),
    botaoDaBarra("disquete", "Salvar no navegador", salvarComNome, { usarIconeUI: true }),
    botaoDaBarra("baixar", "Baixar projeto", baixarComNome, { usarIconeUI: true }),
    botaoDaBarra("pasta", "Abrir projeto", abrirProjeto),
    botaoDaBarra("enviar", "Importar modelo 3D", importarModelo, { usarIconeUI: true }),
    botaoDaBarra("exportar", "Exportar STL", exportarSTL),
    botaoDaBarra("bolsa", "Guardar na bolsa", guardarNaBolsa, { usarIconeUI: true }),
    separador(),
    botaoDaBarra("menos", "Afastar", () => aproximar(1 / 1.2)),
    botaoDaBarra("mais", "Aproximar", () => aproximar(1.2)),
    botaoDaBarra("enquadrar", "Enquadrar base", () => cena.enquadrar()),
    botaoDaBarra("caminho", "Alternar para 2D", alternarPara2D),
    separador(),
    botaoDaBarra("lixo", "Limpar base", limparBase, { extra: "botao--perigo" }),
    botaoDaBarra("regua", "Propriedades", () => raiz.classList.toggle("livre--painel-aberto"), {
      extra: "so-estreito",
    }),
  );

  const caixa = raiz.querySelector(".livre__ferramentas");
  const modos = document.createElement("div");
  modos.className = "garra-modos";
  for (const modo of MODOS_DE_GARRA) {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "botao";
    alvo.dataset.garra = modo.id;
    alvo.title = modo.rotulo;
    alvo.setAttribute("aria-label", modo.rotulo);
    alvo.innerHTML = iconeFerramenta(modo.icone);
    alvo.addEventListener("click", () => trocarGarra(modo.id));
    modos.append(alvo);
  }
  caixa.append(modos);

  for (const tipo of SOLIDOS) {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "ferramenta";
    alvo.dataset.solido = tipo;
    alvo.innerHTML = `${iconeFerramenta(iconeDoSolido(tipo))}<span>${nomeDe(tipo)}</span>`;
    alvo.addEventListener("click", () => {
      const peca = pecas.criar(tipo);
      if (!peca) return;
      selecionar([peca]);
      registrar();
      tocar("clique");
    });
    caixa.append(alvo);
  }

  const cubo = raiz.querySelector(".cubo-vistas");
  for (const [nome, rotulo] of [
    ["topo", "Topo"],
    ["frente", "Frente"],
    ["direita", "Direita"],
    ["esquerda", "Esquerda"],
    ["tras", "Trás"],
    ["cantoinho", "Perspectiva"],
  ]) {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "botao";
    alvo.textContent = rotulo;
    alvo.addEventListener("click", () => {
      cena.olharDe(nome);
      tocar("clique");
    });
    cubo.append(alvo);
  }

  tela = raiz.querySelector("#tela-3d");
  painelArea = raiz.querySelector(".livre__painel");
  statusArea = raiz.querySelector(".livre__status");
}

function iconeDoSolido(tipo) {
  const mapa = {
    cubo: "cubo3d",
    cuboide: "retangulo",
    esfera: "circulo",
    cilindro: "elipse",
    cone: "poligono",
    torus: "circulo",
    piramide: "poligono",
    prisma: "poligono",
    anel: "circulo",
    prismaEstrela: "estrela",
    dado: "quadrado",
    palitoPicole: "retangulo",
    palitoChurrasco: "regua",
    engrenagem3d: "engrenagem",
  };
  return mapa[tipo] || "cubo3d";
}

function trocarGarra(modo) {
  garra.setMode(modo);
  for (const alvo of raiz.querySelectorAll("[data-garra]")) {
    alvo.classList.toggle("botao--destaque", alvo.dataset.garra === modo);
  }
  tocar("clique");
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
  const caixa = document.createElement("label");
  caixa.className = "propriedade";
  const unidade = ajuste("unidade");
  const nome = document.createElement("span");
  nome.textContent = opcoes.semUnidade ? rotulo : `${rotulo} (${unidade})`;
  const campo = document.createElement("input");
  campo.type = "number";
  campo.value = String(Number(valorAtual.toFixed(opcoes.inteiro ? 0 : 2)));
  campo.step = opcoes.inteiro || opcoes.semUnidade ? "1" : unidade === "cm" ? "0.1" : "1";
  const aplicar = () => {
    const numero = Number(campo.value);
    if (Number.isFinite(numero)) aoAplicar(numero);
  };
  campo.addEventListener("change", aplicar);
  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      aplicar();
    }
  });
  caixa.append(nome, campo);
  return caixa;
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
  return botaoDaBarra(nomeIcone, rotulo, aoClicar, { extra });
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
    painelArea.append(grupo(`${selecionadas.length} peças selecionadas`));
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
  );
  return secao;
}

function trocarBase(mudanca) {
  cena.redefinirBase({ ...cena3d.base, ...mudanca });
  atualizarPainel();
}

function blocoParametros(peca, definicao) {
  const secao = grupo(definicao.nome);
  for (const [chave, campo] of Object.entries(definicao.params)) {
    const atual = peca.userData.params[chave];
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
      botaoSimples("enquadrar", "Pousar na base", () => {
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

function blocoAcoes(selecionadas) {
  const secao = grupo("Peça");
  const negativas = selecionadas.every((peca) => peca.userData.negativo);
  secao.append(
    linhaBotoes(
      botaoSimples("negativo", negativas ? "Voltar a positiva" : "Marcar negativa", () => {
        pecas.marcarNegativo(selecionadas, !negativas);
        registrar();
        atualizarPainel();
      }),
      botaoSimples("unir", "Combinar", () => {
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
      botaoSimples("desunir", "Desunir", () => {
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

function alternarPara2D() {
  const contornos = projeto.contornosNaBase();
  if (!contornos.length) {
    mostrarAviso("Nenhuma peça está encostando na base.", "alerta");
    return;
  }
  mostrarAviso(
    `${contornos.length} peça(s) encostam na base. A passagem para o 2D entra no próximo lote.`,
    "alerta",
  );
}

function agendarSalvamento() {
  if (!ajuste("salvarSozinho")) return;
  clearTimeout(salvamentoPendente);
  salvamentoPendente = setTimeout(() => {
    projeto.salvarNoCache(nomeDoProjeto).catch(() => {});
  }, 1200);
}

// --- Ciclo de vida -----------------------------------------------------

export async function montar(area, setor, aoVoltar) {
  carregarEstilo("styles/livre.css");
  montarEsqueleto(area, () => {
    encerrar();
    aoVoltar();
  });

  cena.iniciar(tela);
  raio = new THREE.Raycaster();

  garra = new TransformControls(cena3d.camera, tela);
  garra.setSize(0.9 * Number(ajuste("alcas") || 1));
  garra.addEventListener("dragging-changed", (evento) => {
    cena3d.orbita.enabled = !evento.value;
    if (!evento.value) {
      const alvo = cena3d.selecao[0];
      if (alvo && garra.getMode() === "translate") {
        alvo.position.x = cena.encaixar(alvo.position.x);
        alvo.position.z = cena.encaixar(alvo.position.z);
      }
      registrar();
      atualizarPainel();
    }
  });
  const ajudante = garra.getHelper ? garra.getHelper() : garra;
  cena3d.cena.add(ajudante);
  trocarGarra("translate");

  const aoClicar = (evento) => {
    if (evento.button !== 0 || garra.dragging) return;
    const alvo = pecaSobOPonteiro(evento);
    const somando = evento.ctrlKey || evento.metaKey || evento.shiftKey;
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
    if (evento.key === "Delete" || evento.key === "Backspace") {
      if (!cena3d.selecao.length) return;
      evento.preventDefault();
      for (const peca of cena3d.selecao) pecas.remover(peca);
      selecionar([]);
      registrar();
      return;
    }
    if (evento.key === "Escape") selecionar([]);
    if (evento.key.toLowerCase() === "g") trocarGarra("translate");
    if (evento.key.toLowerCase() === "r") trocarGarra("rotate");
    if (evento.key.toLowerCase() === "e") trocarGarra("scale");
  };
  window.addEventListener("keydown", aoTeclar);
  desligar.push(() => window.removeEventListener("keydown", aoTeclar));

  const palco = raiz.querySelector(".livre__palco");
  const observador = new ResizeObserver(() => {
    cena.redimensionar(palco.clientWidth, palco.clientHeight);
  });
  observador.observe(palco);
  desligar.push(() => observador.disconnect());
  cena.redimensionar(palco.clientWidth, palco.clientHeight);

  desligar.push(
    ouvir("ajuste:mudou", ({ chave }) => {
      if (!cena3d.renderizador) return;
      if (chave === "tema" || chave === "*") cena.desenharBase();
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

  ultimaFoto = foto();
  cena.comecarDesenho();
  selecionar([]);
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
  clearTimeout(salvamentoPendente);
  if (cena3d.renderizador && ajuste("salvarSozinho")) {
    projeto.salvarNoCache(nomeDoProjeto).catch(() => {});
  }
  garra?.detach?.();
  garra?.dispose?.();
  garra = null;
  cena.encerrar();
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
  raiz = null;
  passado.length = 0;
  futuro.length = 0;
}
