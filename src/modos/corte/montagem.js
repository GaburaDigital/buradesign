// Bancada de montagem com chapas.
//
// O aluno planta chapas no espaço como quem monta uma caixa de papelão. Quem
// descobre os encaixes é o programa: toda vez que a montagem muda, as juntas
// são recalculadas e aparecem no 3D. O plano de corte é o fim da linha — e só
// sai certo se a montagem estiver certa, o que é exatamente a lição.

import * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";

import { carregarEstilo } from "../../core/carregar-script.js";
import { ouvir } from "../../core/eventos.js";
import { tocar } from "../../core/som.js";
import { valor as ajuste } from "../../core/ajustes.js";
import { t } from "../../core/idioma.js";
import { baixarTexto, carimboDeData } from "../../core/arquivos.js";
import { icone } from "../../ui/icones.js";
import { ferramenta as iconeFerramenta } from "../../ui/icones-ferramentas.js";
import { mostrarAviso, confirmar, perguntarTexto, abrirPainel, fecharPainel } from "../../ui/painel.js";
import { fala } from "../../ui/aliens.js";
import { campoArrastavel } from "../../ui/campo-numero.js";
import { grupoDeFerramentas, fecharMenusFlutuantes } from "../../ui/menu-flutuante.js";

import * as cena from "../livre3d/cena.js";
import { cena3d } from "../livre3d/cena.js";
import { nomeDeArquivo } from "../livre/projeto.js";

import * as materiais from "./materiais.js";
import * as chapasMod from "./chapas.js";
import { detectarJuntas } from "./juntas.js";
import { planificarTudo } from "./planificar.js";
import { arranjar } from "./arranjo.js";
import { montarPlanoSVG, listaDePecas } from "./planosvg.js";

const VISTAS = [
  ["cantoinho", "Perspectiva"],
  ["topo", "Topo"],
  ["frente", "Frente"],
  ["direita", "Direita"],
  ["esquerda", "Esquerda"],
  ["tras", "Trás"],
];

let raiz = null;
let areaAtual = null;
let tela = null;
let painelArea = null;
let statusArea = null;
let garra = null;
let raio = null;
let desligar = [];

let chapas = [];
let selecionada = null;
let grupo = null;
let grupoJuntas = null;
let ultimoResultado = null;

function config() {
  return materiais.valores();
}

// A mesa de trabalho vai de 0 até a medida dela nos eixos X e Z: a origem do
// mundo é o canto da mesa, não o meio. Toda chapa nova nasce no meio da mesa,
// senão a montagem fica pendurada na quina, meio dentro e meio fora.
function meioDaMesa() {
  const centro = cena.centroDaBase();
  return { x: centro.x, z: centro.z };
}

function pousarNoMeioDaMesa(lista) {
  const meio = meioDaMesa();
  for (const chapa of lista) {
    chapa.centro.x += meio.x;
    chapa.centro.z += meio.z;
  }
  return lista;
}

// --- Desenho -----------------------------------------------------------

function corDaChapa(chapa) {
  const plano = chapa.plano;
  if (plano === "XZ") return 0x8fd19e;
  if (plano === "XY") return 0x7fb3d5;
  return 0xc5a6e0;
}

function redesenhar() {
  if (!grupo) return;
  for (const filho of grupo.children.slice()) {
    filho.geometry?.dispose?.();
    filho.material?.dispose?.();
    grupo.remove(filho);
  }
  const { espessura } = config();
  for (const chapa of chapas) {
    const caixa = chapasMod.extensao(chapa, espessura);
    const malha = new THREE.Mesh(
      new THREE.BoxGeometry(caixa.tamanho.x, caixa.tamanho.y, caixa.tamanho.z),
      new THREE.MeshStandardMaterial({
        color: corDaChapa(chapa),
        roughness: 0.75,
        metalness: 0.02,
        transparent: true,
        opacity: selecionada && selecionada !== chapa.id ? 0.55 : 1,
        emissive: new THREE.Color(selecionada === chapa.id ? cena.paleta3d().guia : 0x000000),
        emissiveIntensity: selecionada === chapa.id ? 0.35 : 0,
      }),
    );
    malha.position.set(chapa.centro.x, chapa.centro.y, chapa.centro.z);
    malha.userData.chapa = chapa.id;
    const contorno = new THREE.LineSegments(
      new THREE.EdgesGeometry(malha.geometry, 20),
      new THREE.LineBasicMaterial({ color: cena.paleta3d().borda }),
    );
    malha.add(contorno);
    grupo.add(malha);
  }
  recalcularJuntas();
  prenderGarra();
}

// As juntas viram riscos verdes na montagem: o aluno vê onde vai ter dedo
// antes de gastar chapa.
function recalcularJuntas() {
  const { espessura, dedo, kerf, folga } = config();
  ultimoResultado = detectarJuntas(chapas, espessura, { dedo, kerf, folga });

  for (const filho of grupoJuntas.children.slice()) {
    filho.geometry?.dispose?.();
    filho.material?.dispose?.();
    grupoJuntas.remove(filho);
  }
  const pontos = [];
  const porId = new Map(chapas.map((chapa) => [chapa.id, chapa]));
  for (const junta of ultimoResultado.juntas) {
    const a = porId.get(junta.a);
    const b = porId.get(junta.b);
    if (!a || !b) continue;
    const ca = chapasMod.extensao(a, espessura);
    const cb = chapasMod.extensao(b, espessura);
    const de = { x: Math.max(ca.min.x, cb.min.x), y: Math.max(ca.min.y, cb.min.y), z: Math.max(ca.min.z, cb.min.z) };
    const ate = { x: Math.min(ca.max.x, cb.max.x), y: Math.min(ca.max.y, cb.max.y), z: Math.min(ca.max.z, cb.max.z) };
    pontos.push(de.x, de.y, de.z, ate.x, ate.y, ate.z);
  }
  if (pontos.length) {
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute("position", new THREE.Float32BufferAttribute(pontos, 3));
    // A junta mora dentro do encontro das duas chapas, então ficava escondida
    // pelas próprias chapas. Sem teste de profundidade ela aparece por cima,
    // que é o que interessa: o aluno vê onde vai nascer dedo antes de cortar.
    const linhas = new THREE.LineSegments(
      geometria,
      new THREE.LineBasicMaterial({
        color: cena.paleta3d().guia,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      }),
    );
    linhas.renderOrder = 5;
    grupoJuntas.add(linhas);
  }
  atualizarStatus();
}

function chapaSelecionada() {
  return chapas.find((chapa) => chapa.id === selecionada) || null;
}

function malhaDe(id) {
  return grupo.children.find((filho) => filho.userData.chapa === id) || null;
}

function prenderGarra() {
  if (!garra) return;
  const alvo = selecionada ? malhaDe(selecionada) : null;
  if (alvo) garra.attach(alvo);
  else garra.detach();
}

function selecionar(id) {
  selecionada = id;
  redesenhar();
  atualizarPainel();
}

// --- Ações -------------------------------------------------------------

function inserirChapa(plano) {
  const { espessura } = config();
  const padrao = { XZ: [80, 60], XY: [80, 50], YZ: [60, 50] }[plano] || [80, 60];
  const meio = meioDaMesa();
  const chapa = chapasMod.novaChapa({
    plano,
    largura: padrao[0],
    altura: padrao[1],
    centro: {
      x: meio.x,
      y: plano === "XZ" ? espessura / 2 : padrao[1] / 2,
      z: meio.z,
    },
  });
  chapas.push(chapa);
  tocar("clique");
  selecionar(chapa.id);
}

async function gerarCaixa() {
  const corpo = document.createElement("div");
  corpo.className = "corte__formulario";
  const valores = { largura: 120, altura: 80, profundidade: 90, comTampa: false };
  // O campoArrastavel já traz o próprio rótulo. Envolver ele num outro rótulo
  // deixava a caixa sem valor nenhum na tela, porque as chaves do objeto
  // ("valor" em vez de "valorInicial") não eram as que ele lê.
  const campo = (rotulo, chave, minimo, maximo) =>
    campoArrastavel({
      rotulo,
      valorInicial: valores[chave],
      min: minimo,
      max: maximo,
      passo: 1,
      inteiro: true,
      sufixo: "mm",
      aoAplicar: (numero) => {
        valores[chave] = numero;
      },
    });
  const tampa = document.createElement("label");
  tampa.className = "campo campo--linha";
  const caixinha = document.createElement("input");
  caixinha.type = "checkbox";
  caixinha.addEventListener("change", () => {
    valores.comTampa = caixinha.checked;
  });
  const rotuloTampa = document.createElement("span");
  rotuloTampa.className = "campo__rotulo";
  rotuloTampa.textContent = "Com tampa";
  tampa.append(caixinha, rotuloTampa);

  corpo.append(
    campo("Largura (mm)", "largura", 20, 1200),
    campo("Altura (mm)", "altura", 20, 1200),
    campo("Profundidade (mm)", "profundidade", 20, 1200),
    tampa,
  );

  const feito = await new Promise((resolver) => {
    // Fechar o painel dispara o "aoFechar" mesmo no modo silencioso. Sem esta
    // trava, o "não" chegava primeiro e o Montar não montava nada.
    let respondido = false;
    const responder = (resposta) => {
      if (respondido) return;
      respondido = true;
      resolver(resposta);
      fecharPainel({ silencioso: true });
    };
    abrirPainel({
      titulo: "Caixa pronta",
      corpo,
      botoes: [
        { rotulo: "Montar", variante: "destaque", aoClicar: () => responder(true) },
        { rotulo: t("acoes.cancelar"), aoClicar: () => responder(false) },
      ],
      aoFechar: () => responder(false),
    });
  });
  if (!feito) return;

  const { espessura } = config();
  chapasMod.reiniciarContagem(0);
  chapas = pousarNoMeioDaMesa(chapasMod.montarCaixa({ ...valores, espessura }));
  selecionada = null;
  tocar("pronto");
  redesenhar();
  atualizarPainel();
  cena.enquadrar();
  mostrarAviso(`Caixa de ${valores.largura} × ${valores.altura} × ${valores.profundidade} mm montada.`);
}

async function apagarChapa() {
  const chapa = chapaSelecionada();
  if (!chapa) {
    mostrarAviso("Escolha uma chapa antes.", "alerta");
    return;
  }
  chapas = chapas.filter((item) => item.id !== chapa.id);
  selecionada = null;
  redesenhar();
  atualizarPainel();
}

function duplicarChapa() {
  const chapa = chapaSelecionada();
  if (!chapa) {
    mostrarAviso("Escolha uma chapa antes.", "alerta");
    return;
  }
  const copia = chapasMod.novaChapa({
    plano: chapa.plano,
    largura: chapa.largura,
    altura: chapa.altura,
    centro: { ...chapa.centro, x: chapa.centro.x + 10, z: chapa.centro.z + 10 },
  });
  chapas.push(copia);
  selecionar(copia.id);
}

async function limparTudo() {
  if (!chapas.length) return;
  const certeza = await confirmar("Isso apaga todas as chapas da montagem. Continuar?");
  if (!certeza) return;
  chapas = [];
  selecionada = null;
  chapasMod.reiniciarContagem(0);
  redesenhar();
  atualizarPainel();
}

// --- Plano de corte ----------------------------------------------------

function calcularPlano() {
  const cfg = config();
  if (!chapas.length) return null;
  const resultado = detectarJuntas(chapas, cfg.espessura, cfg);
  const planos = planificarTudo(chapas, cfg.espessura, resultado);
  const arranjo = arranjar(planos, {
    chapaLargura: cfg.chapaLargura,
    chapaAltura: cfg.chapaAltura,
    respiro: cfg.respiro,
  });
  return { resultado, planos, arranjo, cfg };
}

function abrirPlano() {
  const plano = calcularPlano();
  if (!plano) {
    mostrarAviso("Monte alguma chapa antes de pedir o plano.", "alerta");
    return;
  }
  const svg = montarPlanoSVG(plano.arranjo, {
    material: materiais.nomeDoMaterial(),
    espessura: plano.cfg.espessura,
  });
  const lista = listaDePecas(plano.arranjo);

  const corpo = document.createElement("div");
  corpo.className = "corte__plano";
  const resumo = document.createElement("p");
  resumo.className = "dica";
  const aproveita = plano.arranjo.aproveitamento.map((n) => `${Math.round(n)}%`).join(", ");
  resumo.textContent = `${lista.length} peça(s) · ${plano.arranjo.folhas.length} folha(s) de ${plano.cfg.chapaLargura} × ${plano.cfg.chapaAltura} mm · aproveitamento ${aproveita} · ${plano.resultado.juntas.length} junta(s)`;

  const moldura = document.createElement("div");
  moldura.className = "corte__previa";
  moldura.innerHTML = svg.replace(/<\?xml[^>]*\?>/, "");

  const tabela = document.createElement("table");
  tabela.className = "corte__lista";
  tabela.innerHTML = `<thead><tr><th>Nº</th><th>Peça</th><th>Tamanho</th><th>Folha</th></tr></thead><tbody>${lista
    .map(
      (item) =>
        `<tr><td>${item.numero}</td><td>${item.nome}${item.girada ? " (girada)" : ""}</td><td>${item.largura} × ${item.altura} mm</td><td>${item.folha}</td></tr>`,
    )
    .join("")}</tbody>`;

  corpo.append(resumo, moldura, tabela);
  if (plano.arranjo.grandes.length) {
    const alerta = document.createElement("p");
    alerta.className = "dica dica--alerta";
    alerta.textContent = `${plano.arranjo.grandes.length} peça(s) não cabem na chapa escolhida: ${plano.arranjo.grandes
      .map((p) => p.nome)
      .join(", ")}.`;
    corpo.append(alerta);
  }
  for (const aviso of plano.resultado.avisos.slice(0, 4)) {
    const linha = document.createElement("p");
    linha.className = "dica dica--alerta";
    linha.textContent = aviso;
    corpo.append(linha);
  }

  abrirPainel({
    titulo: "Plano de corte",
    corpo,
    botoes: [
      {
        rotulo: "Baixar SVG",
        variante: "destaque",
        aoClicar: async () => {
          const nome = await perguntarTexto("Baixar plano de corte", "Nome do arquivo:", "plano_de_corte");
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

function botao(nomeIcone, rotulo, aoClicar, extra = "") {
  const alvo = document.createElement("button");
  alvo.type = "button";
  alvo.className = `botao com-rotulo ${extra}`.trim();
  alvo.title = rotulo;
  alvo.setAttribute("aria-label", rotulo);
  alvo.innerHTML = `${iconeFerramenta(nomeIcone)}<span class="rotulo-acao">${rotulo}</span>`;
  alvo.addEventListener("click", () => {
    tocar("clique");
    aoClicar();
  });
  return alvo;
}

function linhaBotoes(...botoes) {
  const linha = document.createElement("div");
  linha.className = "linha-botoes";
  linha.append(...botoes.filter(Boolean));
  return linha;
}

function atualizarPainel() {
  if (!painelArea) return;
  painelArea.innerHTML = "";
  const cfg = config();

  const material = grupoPainel("Chapa");
  material.append(
    campoLista("Material", cfg.material, materiais.MATERIAIS, (id) => {
      materiais.definir({ material: id });
      redesenhar();
      atualizarPainel();
    }),
    campoNumero("Espessura (mm)", cfg.espessura, (n) => {
      materiais.definir({ espessura: n });
      redesenhar();
      atualizarPainel();
    }, { min: 0.5, max: 30, passo: 0.5 }),
    campoNumero("Folga de corte, kerf (mm)", cfg.kerf, (n) => {
      materiais.definir({ kerf: n });
      redesenhar();
    }, { min: 0, max: 3, passo: 0.05 }),
    campoNumero("Folga do encaixe (mm)", cfg.folga, (n) => {
      materiais.definir({ folga: n });
      redesenhar();
    }, { min: 0, max: 2, passo: 0.05 }),
    campoNumero("Tamanho do dedo (mm)", cfg.dedo, (n) => {
      materiais.definir({ dedo: n });
      redesenhar();
    }, { min: 3, max: 80, passo: 1 }),
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
    campoNumero("Respiro entre peças (mm)", cfg.respiro, (n) => materiais.definir({ respiro: n }), {
      min: 0,
      max: 20,
      passo: 0.5,
    }),
  );

  painelArea.append(material, folha);

  const chapa = chapaSelecionada();
  if (chapa) {
    const plano = chapasMod.PLANOS[chapa.plano];
    const secao = grupoPainel(chapa.nome);
    secao.append(
      campoLista(
        "Como está plantada",
        chapa.plano,
        Object.entries(chapasMod.PLANOS).map(([id, item]) => ({ id, nome: item.nome })),
        (id) => {
          chapa.plano = id;
          redesenhar();
          atualizarPainel();
        },
      ),
      campoNumero(`${plano.rotuloU} (mm)`, chapa.largura, (n) => {
        chapa.largura = n;
        redesenhar();
      }, { min: 5, max: 2000, passo: 1 }),
      campoNumero(`${plano.rotuloV} (mm)`, chapa.altura, (n) => {
        chapa.altura = n;
        redesenhar();
      }, { min: 5, max: 2000, passo: 1 }),
      campoNumero("Posição X (mm)", chapa.centro.x, (n) => {
        chapa.centro.x = n;
        redesenhar();
      }, { min: -1000, max: 1000, passo: 1 }),
      campoNumero("Posição Y (mm)", chapa.centro.y, (n) => {
        chapa.centro.y = n;
        redesenhar();
      }, { min: -1000, max: 1000, passo: 1 }),
      campoNumero("Posição Z (mm)", chapa.centro.z, (n) => {
        chapa.centro.z = n;
        redesenhar();
      }, { min: -1000, max: 1000, passo: 1 }),
      linhaBotoes(
        botao("duplicar", "Duplicar", duplicarChapa),
        botao("lixo", "Apagar", apagarChapa, "botao--perigo"),
      ),
    );
    painelArea.append(secao);
  } else {
    const dica = document.createElement("p");
    dica.className = "dica";
    dica.textContent = "Toque numa chapa para ajustar o tamanho e a posição dela.";
    painelArea.append(dica);
  }
}

function atualizarStatus() {
  if (!statusArea) return;
  const cfg = config();
  const medidas = chapasMod.medidasDaCaixa(chapas, cfg.espessura);
  const juntas = ultimoResultado ? ultimoResultado.juntas.length : 0;
  const emT = ultimoResultado ? ultimoResultado.juntas.filter((j) => j.tipo === "te").length : 0;
  statusArea.textContent = chapas.length
    ? `${chapas.length} chapa(s) · ${materiais.nomeDoMaterial()} · montagem ${Math.round(medidas.largura)} × ${Math.round(medidas.altura)} × ${Math.round(medidas.profundidade)} mm · ${juntas} junta(s)${emT ? ` (${emT} em T)` : ""}`
    : "Comece por uma caixa pronta ou plante uma chapa.";
}

// --- Montagem da tela --------------------------------------------------

function montarEsqueleto(area, aoVoltar, aoTrocar) {
  area.innerHTML = "";
  areaAtual = area;
  area.classList.add("conteudo--cheio");
  raiz = document.createElement("div");
  raiz.className = "livre livre3d corte";
  raiz.innerHTML = `
    <div class="livre__barra" role="toolbar" aria-label="Ações da montagem"></div>
    <div class="livre__corpo">
      <nav class="livre__ferramentas" aria-label="Chapas"></nav>
      <div class="livre__palco">
        <canvas id="tela-corte" aria-label="Montagem com chapas"></canvas>
        <div class="palco__canto palco__canto--topo-direita"></div>
        <div class="palco__canto palco__canto--zoom"></div>
      </div>
      <aside class="livre__painel" aria-label="Chapa e folha"></aside>
    </div>
    <p class="livre__status"></p>`;
  area.append(raiz);

  const barra = raiz.querySelector(".livre__barra");
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

  barra.append(
    botaoBarra("voltar", t("acoes.voltarSetor"), aoVoltar, "com-rotulo botao--destaque", true),
    risco(),
    botaoBarra("caixas", "Caixa pronta", gerarCaixa, "com-rotulo"),
    botaoBarra("planoCorte", "Plano de corte", abrirPlano, "com-rotulo botao--destaque"),
    risco(),
    botaoBarra("fatiar", "Ir para o fatiador", aoTrocar, "com-rotulo"),
    botaoBarra("lixo", "Limpar montagem", limparTudo, "botao--perigo com-rotulo"),
  );

  const caixa = raiz.querySelector(".livre__ferramentas");
  for (const [id, plano] of Object.entries(chapasMod.PLANOS)) {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "ferramenta";
    const desenho = id === "XZ" ? "chapaDeitada" : id === "XY" ? "chapaFrente" : "chapaLado";
    alvo.innerHTML = `${iconeFerramenta(desenho)}<span>${plano.nome}</span>`;
    alvo.addEventListener("click", () => inserirChapa(id));
    caixa.append(alvo);
  }

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
    botaoBarra("mais", "Aproximar", () => aproximar(1.2)),
    botaoBarra("menos", "Afastar", () => aproximar(1 / 1.2)),
    botaoBarra("enquadrar", "Enquadrar", () => cena.enquadrar()),
  );

  tela = raiz.querySelector("#tela-corte");
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
    LEFT: null,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  cena3d.orbita.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_PAN };

  grupo = new THREE.Group();
  grupoJuntas = new THREE.Group();
  cena3d.cena.add(grupo, grupoJuntas);
  raio = new THREE.Raycaster();

  garra = new TransformControls(cena3d.camera, tela);
  garra.setMode("translate");
  garra.setTranslationSnap(1);
  garra.setSize(0.8 * Number(ajuste("alcas") || 1));
  garra.addEventListener("dragging-changed", (evento) => {
    cena3d.orbita.enabled = !evento.value;
    if (!evento.value) {
      const chapa = chapaSelecionada();
      const malha = chapa ? malhaDe(chapa.id) : null;
      if (chapa && malha) {
        chapa.centro = {
          x: Math.round(malha.position.x * 10) / 10,
          y: Math.round(malha.position.y * 10) / 10,
          z: Math.round(malha.position.z * 10) / 10,
        };
        redesenhar();
        atualizarPainel();
      }
    }
  });
  garra.addEventListener("objectChange", () => recalcularJuntas());
  const ajudante = garra.getHelper ? garra.getHelper() : garra;
  cena3d.cena.add(ajudante);

  const aoClicar = (evento) => {
    if (evento.button !== 0 || garra.dragging) return;
    const retangulo = tela.getBoundingClientRect();
    const ponteiro = new THREE.Vector2(
      ((evento.clientX - retangulo.left) / retangulo.width) * 2 - 1,
      -((evento.clientY - retangulo.top) / retangulo.height) * 2 + 1,
    );
    raio.setFromCamera(ponteiro, cena3d.camera);
    const acertos = raio.intersectObjects(grupo.children, false);
    selecionar(acertos.length ? acertos[0].object.userData.chapa : null);
  };
  tela.addEventListener("pointerdown", aoClicar);
  desligar.push(() => tela.removeEventListener("pointerdown", aoClicar));

  const aoTeclar = (evento) => {
    if (!raiz || !raiz.isConnected) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(evento.target?.tagName)) return;
    if (evento.key === "Delete" || evento.key === "Backspace") {
      if (!selecionada) return;
      evento.preventDefault();
      apagarChapa();
      return;
    }
    if (evento.key === "Escape") selecionar(null);
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "d") {
      evento.preventDefault();
      duplicarChapa();
    }
  };
  window.addEventListener("keydown", aoTeclar);
  desligar.push(() => window.removeEventListener("keydown", aoTeclar));

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
        redesenhar();
      }
      if (chave === "opacidadeBase" || chave === "*") cena.atualizarOpacidadeDaBase();
    }),
  );

  chapas = [];
  selecionada = null;
  chapasMod.reiniciarContagem(0);
  redesenhar();
  atualizarPainel();
  cena.enquadrar();
  cena.comecarDesenho();
  mostrarAviso("Comece pela caixa pronta e depois mexa no que quiser.");
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
  try {
    garra?.detach?.();
    garra?.dispose?.();
  } catch {
    // ignora
  }
  garra = null;
  grupo = null;
  grupoJuntas = null;
  chapas = [];
  selecionada = null;
  ultimoResultado = null;
  try {
    cena.encerrar();
  } catch (erro) {
    console.warn("Falha ao encerrar a cena da montagem", erro);
  }
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
  raiz = null;
  tela = null;
  painelArea = null;
  statusArea = null;
}
