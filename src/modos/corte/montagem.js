// Bancada de montagem com chapas.
//
// O aluno planta chapas no espaço como quem monta uma caixa de papelão. Quem
// descobre os encaixes é o programa: toda vez que a montagem muda, as juntas
// são recalculadas e aparecem no 3D. O plano de corte é o fim da linha — e só
// sai certo se a montagem estiver certa, o que é exatamente a lição.
//
// A navegação é a mesma do Criação Livre 3D de propósito: quem aprendeu a
// girar a câmera lá não pode ter que aprender de novo aqui. Os modos do
// ponteiro e os modos da garra têm os mesmos nomes, os mesmos ícones e os
// mesmos atalhos.

import * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";

import { carregarEstilo } from "../../core/carregar-script.js";
import { ouvir } from "../../core/eventos.js";
import { tocar } from "../../core/som.js";
import { valor as ajuste } from "../../core/ajustes.js";
import { t } from "../../core/idioma.js";
import { baixarTexto, carimboDeData } from "../../core/arquivos.js";
import * as bolsa from "../../core/bolsa.js";
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
import { campoArrastavel } from "../../ui/campo-numero.js";
import { grupoDeFerramentas, fecharMenusFlutuantes } from "../../ui/menu-flutuante.js";

import * as cena from "../livre3d/cena.js";
import { cena3d } from "../livre3d/cena.js";
import { nomeDeArquivo } from "../livre/projeto.js";

import * as materiais from "./materiais.js";
import * as chapasMod from "./chapas.js";
import * as imaMod from "./ima.js";
import * as formas from "./formas.js";
import { detectarJuntas } from "./juntas.js";
import { planificarTudo, juntarTiras, seCruza } from "./planificar.js";
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

// Os mesmos quatro modos do Criação Livre 3D, com os mesmos atalhos.
const MODOS_DE_PONTEIRO = [
  { id: "selecionar", icone: "seta", rotulo: "Selecionar" },
  { id: "somar", icone: "somar", rotulo: "Somar à seleção" },
  { id: "mao", icone: "mao", rotulo: "Arrastar a vista" },
  { id: "camera", icone: "camera", rotulo: "Girar a câmera" },
];

const MODOS_DE_GARRA = [
  { id: "base", icone: "naBase", rotulo: "Mover na base", garra: "translate", semY: true },
  { id: "translate", icone: "mover3d", rotulo: "Mover livre", garra: "translate" },
  { id: "rotate", icone: "girar", rotulo: "Girar", garra: "rotate" },
];

const EIXOS_DO_GIRO = [
  { id: "x", rotulo: "X" },
  { id: "y", rotulo: "Y" },
  { id: "z", rotulo: "Z" },
];

let raiz = null;
let areaAtual = null;
let tela = null;
let painelArea = null;
let statusArea = null;
let garra = null;
let punho = null;
let raio = null;
let desligar = [];

let chapas = [];
let selecao = [];
let grupoContador = 0;
let grupo = null;
let grupoJuntas = null;
let ultimoResultado = null;
let trechosDasJuntas = [];
let modoDoPonteiro = "selecionar";
let modoDaGarra = "base";
let eixoDoGiro = "y";
let giroFino = 15;
let arrastando = false;
let punhoAnterior = null;
let grupoIma = null;
let imaLigado = true;
let imaForca = 2;
let imaAnterior = "";

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

// --- Seleção e grupos ---------------------------------------------------

function chapaPorId(id) {
  return chapas.find((item) => item.id === id) || null;
}

function selecionadas() {
  return selecao.map(chapaPorId).filter(Boolean);
}

// Tocar numa chapa agrupada pega o grupo inteiro: é o que faz o grupo
// parecer uma peça só na mão do aluno.
function comOGrupo(ids) {
  const alvo = new Set();
  for (const id of ids) {
    const chapa = chapaPorId(id);
    if (!chapa) continue;
    if (chapa.grupo) {
      for (const outra of chapas) if (outra.grupo === chapa.grupo) alvo.add(outra.id);
    } else {
      alvo.add(id);
    }
  }
  return [...alvo];
}

function selecionar(ids, { somando = false } = {}) {
  const pedido = comOGrupo(Array.isArray(ids) ? ids : [ids].filter(Boolean));
  if (somando) {
    const atual = new Set(selecao);
    // Tocar de novo numa peça já escolhida tira ela da seleção.
    const jaEstava = pedido.length && pedido.every((id) => atual.has(id));
    for (const id of pedido) {
      if (jaEstava) atual.delete(id);
      else atual.add(id);
    }
    selecao = [...atual];
  } else {
    selecao = pedido;
  }
  redesenhar();
  atualizarPainel();
}

function agrupar() {
  const lista = selecionadas();
  if (lista.length < 2) {
    tocar("erro");
    mostrarAviso("Escolha pelo menos duas chapas para agrupar.", "alerta");
    return;
  }
  grupoContador += 1;
  const nome = `grupo${grupoContador}`;
  for (const chapa of lista) chapa.grupo = nome;
  tocar("pronto");
  mostrarAviso(`${lista.length} chapas agrupadas. Agora elas andam juntas.`);
  selecionar(lista.map((chapa) => chapa.id));
}

function desagrupar() {
  const lista = selecionadas().filter((chapa) => chapa.grupo);
  if (!lista.length) {
    tocar("erro");
    mostrarAviso("Nenhuma das chapas escolhidas está num grupo.", "alerta");
    return;
  }
  for (const chapa of lista) chapa.grupo = null;
  tocar("clique");
  mostrarAviso(`${lista.length} chapas soltas do grupo.`);
  selecionar(lista.map((chapa) => chapa.id));
}

function quantosGrupos() {
  return new Set(chapas.map((chapa) => chapa.grupo).filter(Boolean)).size;
}

// --- Desenho ------------------------------------------------------------

function corDaChapa(chapa) {
  // Chapa agrupada ganha um tom próprio, para o grupo se enxergar de longe.
  if (chapa.grupo) {
    const numero = Number(String(chapa.grupo).replace(/\D/g, "")) || 1;
    const tons = [0xe0b26a, 0x8fd19e, 0x7fb3d5, 0xc5a6e0, 0xd58f8f];
    return tons[(numero - 1) % tons.length];
  }
  const q = chapasMod.quadro(chapa);
  if (!q) return 0xb0b7bd;
  const eixo = q.porLocal.n.eixo;
  if (eixo === "y") return 0x8fd19e;
  if (eixo === "z") return 0x7fb3d5;
  return 0xc5a6e0;
}

function malhaDe(id) {
  return grupo ? grupo.children.find((filho) => filho.userData.chapa === id) || null : null;
}

function posicionarMalha(malha, chapa) {
  malha.position.set(chapa.centro.x, chapa.centro.y, chapa.centro.z);
  malha.rotation.set(
    (chapa.giro.x * Math.PI) / 180,
    (chapa.giro.y * Math.PI) / 180,
    (chapa.giro.z * Math.PI) / 180,
    "XYZ",
  );
}

// A chapa na tela é a peça planificada, extrudada na espessura do material.
// Ou seja: o que aparece no 3D é exatamente o que vai sair da cortadora, com
// os dentes e os rasgos no lugar. Era isso que faltava para o aluno enxergar
// onde a montagem vai ficar dentada antes de gastar chapa.
function geometriaDaChapa(peca, espessura, chapa) {
  if (!peca || peca.contorno.length < 3 || seCruza(peca.contorno)) {
    // Contorno impossível (dente em cima de dente): cai no retângulo liso, que
    // pelo menos não some da tela.
    return new THREE.BoxGeometry(chapa.largura, chapa.altura, espessura);
  }
  const meioU = chapa.largura / 2;
  const meioV = chapa.altura / 2;
  const forma = new THREE.Shape(
    peca.contorno.map(([u, v]) => new THREE.Vector2(u - meioU, v - meioV)),
  );
  for (const furo of peca.furos || []) {
    forma.holes.push(new THREE.Path(furo.map(([u, v]) => new THREE.Vector2(u - meioU, v - meioV))));
  }
  let geometria;
  try {
    geometria = new THREE.ExtrudeGeometry(forma, { depth: espessura, bevelEnabled: false });
  } catch {
    return new THREE.BoxGeometry(chapa.largura, chapa.altura, espessura);
  }
  // O extrude nasce de z=0 para cima; a chapa mora centrada na espessura.
  geometria.translate(0, 0, -espessura / 2);
  return geometria;
}

function redesenhar() {
  if (!grupo) return;
  for (const filho of grupo.children.slice()) {
    filho.traverse?.((neto) => {
      neto.geometry?.dispose?.();
      neto.material?.dispose?.();
    });
    grupo.remove(filho);
  }
  const { espessura } = config();
  // As juntas vêm antes do desenho agora: são elas que dizem onde ficam os
  // dentes, e sem elas a chapa sairia lisa.
  recalcularJuntas();
  const planificadas = new Map(
    planificarTudo(chapas, espessura, ultimoResultado).map((peca) => [peca.id, peca]),
  );

  const escolhidas = new Set(selecao);
  for (const chapa of chapas) {
    const malha = new THREE.Mesh(
      geometriaDaChapa(planificadas.get(chapa.id), espessura, chapa),
      new THREE.MeshStandardMaterial({
        color: corDaChapa(chapa),
        roughness: 0.75,
        metalness: 0.02,
        transparent: true,
        opacity: escolhidas.size && !escolhidas.has(chapa.id) ? 0.5 : 1,
        emissive: new THREE.Color(escolhidas.has(chapa.id) ? cena.paleta3d().guia : 0x000000),
        emissiveIntensity: escolhidas.has(chapa.id) ? 0.3 : 0,
      }),
    );
    posicionarMalha(malha, chapa);
    malha.userData.chapa = chapa.id;
    const contorno = new THREE.LineSegments(
      new THREE.EdgesGeometry(malha.geometry, 20),
      new THREE.LineBasicMaterial({ color: cena.paleta3d().borda }),
    );
    malha.add(contorno);
    grupo.add(malha);
  }
  desenharFaixasDasJuntas();
  prenderGarra();
}

// Só mexe no que já está desenhado. Serve para o arrasto, onde refazer a
// geometria a cada quadro deixava o celular engasgado.
function reposicionarMalhas() {
  for (const chapa of chapas) {
    const malha = malhaDe(chapa.id);
    if (malha) posicionarMalha(malha, chapa);
  }
}

// Onde duas chapas se encontram. Guarda o trecho de encontro de cada junta
// para a faixa poder ser desenhada por cima da montagem.
function recalcularJuntas() {
  const { espessura, dedo, kerf, folga } = config();
  ultimoResultado = detectarJuntas(chapas, espessura, { dedo, kerf, folga });

  const porId = new Map(chapas.map((chapa) => [chapa.id, chapa]));
  trechosDasJuntas = [];
  for (const junta of ultimoResultado.juntas) {
    const a = porId.get(junta.a);
    const b = porId.get(junta.b);
    if (!a || !b) continue;
    const ca = chapasMod.extensao(a, espessura);
    const cb = chapasMod.extensao(b, espessura);
    trechosDasJuntas.push({
      junta,
      de: {
        x: Math.max(ca.min.x, cb.min.x),
        y: Math.max(ca.min.y, cb.min.y),
        z: Math.max(ca.min.z, cb.min.z),
      },
      ate: {
        x: Math.min(ca.max.x, cb.max.x),
        y: Math.min(ca.max.y, cb.max.y),
        z: Math.min(ca.max.z, cb.max.z),
      },
    });
  }
  atualizarStatus();
}

// A faixa da junta: uma barra grossa e acesa em cima do encontro das duas
// chapas. Os dentes já aparecem recortados na própria chapa; a faixa é o que
// diz qual borda casa com qual, inclusive quando uma tampa a outra.
function desenharFaixasDasJuntas() {
  if (!grupoJuntas) return;
  for (const filho of grupoJuntas.children.slice()) {
    filho.geometry?.dispose?.();
    filho.material?.dispose?.();
    grupoJuntas.remove(filho);
  }
  const { espessura } = config();
  const escolhidas = new Set(selecao);
  const tons = cena.paleta3d();

  for (const trecho of trechosDasJuntas) {
    const de = new THREE.Vector3(trecho.de.x, trecho.de.y, trecho.de.z);
    const ate = new THREE.Vector3(trecho.ate.x, trecho.ate.y, trecho.ate.z);
    const comprimento = de.distanceTo(ate);
    if (comprimento < 0.5) continue;
    // Com nada escolhido, a faixa é discreta: os dentes já estão desenhados na
    // chapa e a faixa não pode tapar eles. Ela só engrossa e passa por cima de
    // tudo quando o aluno escolhe uma das duas chapas da junta, que é quando
    // ele está perguntando "esta borda casa com qual?".
    const acesa = escolhidas.has(trecho.junta.a) || escolhidas.has(trecho.junta.b);
    const grossura = espessura * (acesa ? 0.9 : 0.3);
    const barra = new THREE.Mesh(
      new THREE.BoxGeometry(grossura, grossura, comprimento),
      new THREE.MeshBasicMaterial({
        color: trecho.junta.tipo === "te" ? tons.ima : tons.guia,
        transparent: true,
        opacity: acesa ? 0.7 : 0.35,
        depthTest: !acesa,
      }),
    );
    barra.position.copy(de.clone().add(ate).multiplyScalar(0.5));
    barra.lookAt(ate);
    barra.renderOrder = acesa ? 6 : 4;
    grupoJuntas.add(barra);
  }
}

// --- Garra --------------------------------------------------------------

function prenderGarra() {
  if (!garra || !punho) return;
  const lista = selecionadas();
  if (!lista.length) {
    garra.detach();
    punho.visible = false;
    return;
  }
  const { espessura } = config();
  const centro = chapasMod.centroDasChapas(lista, espessura);
  punho.position.set(centro.x, centro.y, centro.z);
  punho.rotation.set(0, 0, 0);
  punho.updateMatrixWorld(true);
  punho.visible = true;
  guardarPunho();
  garra.attach(punho);
}

// No começo do arrasto guardo onde cada chapa escolhida estava. Todo quadro
// do arrasto recalcula a posição a partir daí, e não a partir do quadro
// anterior: assim o ímã pode puxar e soltar quantas vezes quiser sem que o
// erro vá se acumulando, e a peça volta exatamente para onde estava se o
// aluno arrastar de volta.
function guardarPunho() {
  punhoAnterior = {
    posicao: punho.position.clone(),
    giro: punho.quaternion.clone(),
    chapas: selecionadas().map((chapa) => ({
      id: chapa.id,
      centro: { ...chapa.centro },
      giro: { ...chapa.giro },
    })),
  };
  imaAnterior = "";
}

// Do quaternion da garra para a matriz que as chapas entendem.
function matrizDoQuaternion(quaternion) {
  const m = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
  const te = m.elements;
  return [
    [te[0], te[4], te[8]],
    [te[1], te[5], te[9]],
    [te[2], te[6], te[10]],
  ];
}

function seguirGarra() {
  if (!punhoAnterior) return;
  const lista = selecionadas();
  if (!lista.length) return;
  const { espessura } = config();

  // 1. Volta para o estado do começo do arrasto.
  const porId = new Map(punhoAnterior.chapas.map((guardada) => [guardada.id, guardada]));
  for (const chapa of lista) {
    const guardada = porId.get(chapa.id);
    if (!guardada) continue;
    chapa.centro = { ...guardada.centro };
    chapa.giro = { ...guardada.giro };
  }

  // 2. Aplica o giro que a garra acumulou até agora.
  const giroDelta = punho.quaternion.clone().multiply(punhoAnterior.giro.clone().invert());
  if (Math.abs(giroDelta.w) < 0.9999999) {
    const pivo = punhoAnterior.posicao;
    chapasMod.aplicarGiroDoMundo(lista, matrizDoQuaternion(giroDelta), {
      x: pivo.x,
      y: pivo.y,
      z: pivo.z,
    });
  }

  // 3. Anda o tanto que a garra andou, pisando no grid. O grid conta a partir
  // de onde a chapa estava, e não de múltiplos redondos do mundo — senão uma
  // parede de 43,5 mm nunca conseguiria encostar na vizinha.
  const bruto = punho.position.clone().sub(punhoAnterior.posicao);
  const passo = cena.passoDoEncaixe();
  const andado = imaMod.passoDoGrid({ x: bruto.x, y: bruto.y, z: bruto.z }, passo);
  chapasMod.moverChapas(lista, andado);

  // 4. O ímã puxa para a chapa vizinha mais perto.
  let marcas = [];
  if (imaLigado) {
    const escolhidas = new Set(lista.map((chapa) => chapa.id));
    const paradas = chapas.filter((chapa) => !escolhidas.has(chapa.id));
    const achado = imaMod.encaixar(lista, paradas, { espessura, forca: imaForca });
    if (achado.marcas.length) {
      chapasMod.moverChapas(lista, achado.correcao);
      marcas = achado.marcas;
    }
  }

  // O clique só sai quando o ímã acabou de pegar num lugar novo: é o aviso
  // sonoro da "travadinha", e repetido a cada quadro viraria barulho.
  const agora = imaMod.assinatura(marcas);
  if (agora !== imaAnterior) {
    if (agora) tocar("encaixe");
    imaAnterior = agora;
  }
  desenharMarcasDoIma(marcas);
  reposicionarMalhas();
}

// Um risco na cor do ímã em cima da borda que grudou, para o aluno ver por
// que a peça parou ali.
function desenharMarcasDoIma(marcas) {
  if (!grupoIma) return;
  for (const filho of grupoIma.children.slice()) {
    filho.geometry?.dispose?.();
    filho.material?.dispose?.();
    grupoIma.remove(filho);
  }
  if (!marcas.length) return;
  const { espessura } = config();
  const minha = imaMod.caixaDoConjunto(selecionadas(), espessura);
  if (!minha) return;
  const folga = 4;
  const pontos = [];
  for (const marca of marcas) {
    const outros = ["x", "y", "z"].filter((eixo) => eixo !== marca.eixo);
    const canto = (a, b) => {
      const ponto = { [marca.eixo]: marca.valor };
      ponto[outros[0]] = a ? minha.max[outros[0]] + folga : minha.min[outros[0]] - folga;
      ponto[outros[1]] = b ? minha.max[outros[1]] + folga : minha.min[outros[1]] - folga;
      return ponto;
    };
    const volta = [canto(false, false), canto(true, false), canto(true, true), canto(false, true)];
    for (let i = 0; i < 4; i += 1) {
      const um = volta[i];
      const outro = volta[(i + 1) % 4];
      pontos.push(um.x, um.y, um.z, outro.x, outro.y, outro.z);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.Float32BufferAttribute(pontos, 3));
  const linhas = new THREE.LineSegments(
    geometria,
    new THREE.LineBasicMaterial({
      color: cena.paleta3d().ima,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    }),
  );
  linhas.renderOrder = 7;
  grupoIma.add(linhas);
}

function trocarGarra(id) {
  modoDaGarra = id;
  const ficha = MODOS_DE_GARRA.find((modo) => modo.id === id) || MODOS_DE_GARRA[0];
  if (!garra) return;
  garra.setMode(ficha.garra);
  garra.showX = true;
  garra.showZ = true;
  garra.showY = !ficha.semY;
  const selo = raiz?.querySelector("[data-selo-garra]");
  if (selo) selo.innerHTML = `${iconeFerramenta(ficha.icone)}<span>${ficha.rotulo}</span>`;
}

// Ação do dedo ou do botão esquerdo. Igualzinho ao Criação Livre 3D: sem
// isto, no celular não sobrava jeito nenhum de girar a câmera.
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
  orbita.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
  orbita.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  orbita.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  const selo = raiz?.querySelector("[data-selo]");
  if (selo) {
    selo.innerHTML = `${iconeFerramenta(ficha.icone)}<span>${ficha.rotulo}</span>`;
    selo.classList.add("selo-ponteiro--visivel");
  }
  mostrarAviso(`Toque na tela: ${ficha.rotulo.toLowerCase()}.`);
}

// --- Girar pelo botão ---------------------------------------------------

function girarSelecao(graus) {
  const lista = selecionadas();
  if (!lista.length) {
    tocar("erro");
    mostrarAviso("Escolha uma chapa ou um grupo antes de girar.", "alerta");
    return;
  }
  const { espessura } = config();
  const pivo = chapasMod.centroDasChapas(lista, espessura);
  chapasMod.girarChapas(lista, eixoDoGiro, graus, pivo);
  tocar("clique");
  redesenhar();
  atualizarPainel();
}

// --- Ações --------------------------------------------------------------

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
  selecionar([chapa.id]);
}

async function gerarCaixa() {
  const corpo = document.createElement("div");
  corpo.className = "corte__formulario";
  const valores = {
    forma: "caixa",
    largura: 120,
    altura: 80,
    profundidade: 90,
    diametro: 100,
    lados: 6,
    comTampa: false,
    modo: "vinco",
  };

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

  const interruptor = (rotulo, chave) => {
    const linha = document.createElement("label");
    linha.className = "campo campo--linha";
    const caixinha = document.createElement("input");
    caixinha.type = "checkbox";
    caixinha.checked = Boolean(valores[chave]);
    caixinha.addEventListener("change", () => {
      valores[chave] = caixinha.checked;
    });
    const nome = document.createElement("span");
    nome.className = "campo__rotulo";
    nome.textContent = rotulo;
    linha.append(caixinha, nome);
    return linha;
  };

  const medidas = document.createElement("div");
  medidas.className = "corte__formulario";

  // O formulário troca de cara conforme a forma: pedir profundidade de um
  // dodecaedro não faz sentido nenhum, e campo que não serve confunde.
  function redesenharMedidas() {
    medidas.innerHTML = "";
    if (valores.forma === "caixa") {
      medidas.append(
        campo("Largura (mm)", "largura", 20, 1200),
        campo("Altura (mm)", "altura", 20, 1200),
        campo("Profundidade (mm)", "profundidade", 20, 1200),
        interruptor("Com tampa", "comTampa"),
      );
      return;
    }
    if (valores.forma === "dodecaedro") {
      const nota = document.createElement("p");
      nota.className = "dica";
      nota.textContent =
        "Sai em duas flores de seis pentágonos, com as dobras gravadas. Dobre as duas e encaixe uma na outra.";
      medidas.append(campo("Diâmetro (mm)", "diametro", 40, 600), nota);
      return;
    }

    const lados = valores.forma === "prisma" ? formas.LADOS_DO_PRISMA : formas.LADOS_DA_PIRAMIDE;
    if (!lados.includes(valores.lados)) valores.lados = lados[lados.length - 1];
    medidas.append(
      campoLista(
        "Lados",
        String(valores.lados),
        lados.map((n) => ({ id: String(n), nome: `${n} lados` })),
        (id) => {
          valores.lados = Number(id);
        },
      ),
      campo("Diâmetro (mm)", "diametro", 30, 800),
      campo("Altura (mm)", "altura", 20, 1200),
    );
    if (valores.forma === "prisma") {
      medidas.append(
        interruptor("Com tampa", "comTampa"),
        campoLista(
          "Como montar a lateral",
          valores.modo,
          [
            { id: "vinco", nome: "Planificado com vinco (papelão, EVA)" },
            { id: "soltas", nome: "Paredes soltas com abas (MDF, acrílico)" },
          ],
          (id) => {
            valores.modo = id;
          },
        ),
      );
    } else {
      const nota = document.createElement("p");
      nota.className = "dica";
      nota.textContent =
        "As faces entram na base por abas. Lembre: a face é tão alta quanto a inclinação, não quanto a pirâmide.";
      medidas.append(nota);
    }
  }

  corpo.append(
    campoLista("Forma", valores.forma, formas.FORMAS, (id) => {
      valores.forma = id;
      redesenharMedidas();
    }),
    medidas,
  );
  redesenharMedidas();

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

  const { espessura, dedo } = config();
  chapasMod.reiniciarContagem(0);
  let novas;
  let recado;
  if (valores.forma === "prisma") {
    novas = formas.montarPrisma({ ...valores, espessura, dedo });
    recado = `Prisma de ${valores.lados} lados, ${valores.diametro} mm de diâmetro.`;
  } else if (valores.forma === "piramide") {
    novas = formas.montarPiramide({ ...valores, espessura, dedo });
    recado = `Pirâmide de ${valores.lados} lados, ${valores.altura} mm de altura.`;
  } else if (valores.forma === "dodecaedro") {
    novas = formas.montarDodecaedro({ ...valores, espessura });
    recado = `Dodecaedro de ${valores.diametro} mm. Duas flores para dobrar.`;
  } else {
    novas = chapasMod.montarCaixa({ ...valores, espessura });
    recado = `Caixa de ${valores.largura} × ${valores.altura} × ${valores.profundidade} mm.`;
  }

  pousarNoMeioDaMesa(novas);
  // A forma pronta chega como um grupo só: ela é uma peça na cabeça do aluno,
  // não um monte de chapa solta que ele precisa juntar na mão.
  grupoContador += 1;
  for (const chapa of novas) chapa.grupo = `grupo${grupoContador}`;
  chapas = novas;
  tocar("pronto");
  selecionar([]);
  cena.enquadrar();
  mostrarAviso(`${recado} Montada e já agrupada.`);
}

async function apagarSelecao() {
  const lista = selecionadas();
  if (!lista.length) {
    mostrarAviso("Escolha uma chapa antes.", "alerta");
    return;
  }
  const alvo = new Set(lista.map((chapa) => chapa.id));
  chapas = chapas.filter((chapa) => !alvo.has(chapa.id));
  selecionar([]);
}

function duplicarSelecao() {
  const lista = selecionadas();
  if (!lista.length) {
    mostrarAviso("Escolha uma chapa antes.", "alerta");
    return;
  }
  // Duplicar um grupo dá outro grupo, não cinco chapas soltas.
  const mapaDeGrupos = new Map();
  const copias = lista.map((chapa) => {
    let novoGrupo = null;
    if (chapa.grupo) {
      if (!mapaDeGrupos.has(chapa.grupo)) {
        grupoContador += 1;
        mapaDeGrupos.set(chapa.grupo, `grupo${grupoContador}`);
      }
      novoGrupo = mapaDeGrupos.get(chapa.grupo);
    }
    return chapasMod.novaChapa({
      plano: chapa.plano,
      largura: chapa.largura,
      altura: chapa.altura,
      centro: { ...chapa.centro, x: chapa.centro.x + 10, z: chapa.centro.z + 10 },
      giro: { ...chapa.giro },
      grupo: novoGrupo,
      nome: `${chapa.nome} (cópia)`,
    });
  });
  chapas.push(...copias);
  tocar("clique");
  selecionar(copias.map((chapa) => chapa.id));
}

async function limparTudo() {
  if (!chapas.length) return;
  const certeza = await confirmar("Isso apaga todas as chapas da montagem. Continuar?");
  if (!certeza) return;
  chapas = [];
  chapasMod.reiniciarContagem(0);
  grupoContador = 0;
  selecionar([]);
}

// --- Bolsa --------------------------------------------------------------

function fotografar() {
  try {
    cena3d.renderizador.render(cena3d.cena, cena3d.camera);
    return cena3d.renderizador.domElement.toDataURL("image/png");
  } catch {
    return "";
  }
}

async function guardarNaBolsa() {
  const lista = selecionadas().length ? selecionadas() : chapas;
  if (!lista.length) {
    tocar("erro");
    mostrarAviso("Não há chapa nenhuma para guardar.", "alerta");
    return;
  }
  const nome = await perguntarTexto("Guardar na bolsa", "Nome da montagem:", "Montagem");
  if (nome === null) return;
  const { espessura } = config();
  const medidas = chapasMod.medidasDaCaixa(lista, espessura);
  await bolsa.adicionar({
    nome,
    tipo: "montagem",
    origem: "corte",
    dados: {
      // O grupo viaja junto: quem sobe agrupado, desce agrupado.
      chapas: lista.map((chapa) => ({
        nome: chapa.nome,
        plano: chapa.plano,
        largura: chapa.largura,
        altura: chapa.altura,
        centro: { ...chapa.centro },
        giro: { ...chapa.giro },
        grupo: chapa.grupo || null,
      })),
      espessura,
      larguraMm: Number(medidas.largura.toFixed(2)),
      alturaMm: Number(medidas.altura.toFixed(2)),
      profundidadeMm: Number(medidas.profundidade.toFixed(2)),
      previa: fotografar(),
    },
  });
  tocar("salvar");
  mostrarAviso(`"${nome}" guardada na bolsa com ${lista.length} chapa(s).`);
}

// Recebe da bolsa. Tudo que desce vira um grupo só, e desce no meio da mesa.
function colocarDaBolsa(item) {
  const guardadas = item?.dados?.chapas;
  if (!Array.isArray(guardadas) || !guardadas.length) {
    mostrarAviso("Esta peça não é uma montagem de chapas. Use o fatiador ou o Design 3D.", "alerta");
    return false;
  }
  const antigo = new Map();
  const criadas = guardadas.map((guardada) => {
    let novoGrupo = null;
    if (guardada.grupo) {
      if (!antigo.has(guardada.grupo)) {
        grupoContador += 1;
        antigo.set(guardada.grupo, `grupo${grupoContador}`);
      }
      novoGrupo = antigo.get(guardada.grupo);
    }
    return chapasMod.novaChapa({ ...guardada, grupo: novoGrupo });
  });
  // Se veio tudo solto, ainda assim junta num grupo: quem traz da bolsa quer
  // a peça inteira, não um monte de chapa para reunir de novo.
  if (criadas.every((chapa) => !chapa.grupo) && criadas.length > 1) {
    grupoContador += 1;
    for (const chapa of criadas) chapa.grupo = `grupo${grupoContador}`;
  }
  const centro = chapasMod.centroDasChapas(criadas, item?.dados?.espessura || config().espessura);
  const meio = meioDaMesa();
  chapasMod.moverChapas(criadas, { x: meio.x - centro.x, y: 0, z: meio.z - centro.z });
  chapas.push(...criadas);
  selecionar(criadas.map((chapa) => chapa.id));
  cena.enquadrar();
  return true;
}

// --- Plano de corte ----------------------------------------------------

function calcularPlano() {
  const cfg = config();
  if (!chapas.length) return null;
  // A tira dobrada aparece em pedaços no 3D, mas sai inteira na chapa: é o
  // vinco que faz o canto, e cortar em pedaços seria desfazer isso.
  const paraCorte = juntarTiras(chapas);
  const resultado = detectarJuntas(paraCorte, cfg.espessura, cfg);
  const planos = planificarTudo(paraCorte, cfg.espessura, resultado);
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
          const nome = await perguntarTexto(
            "Baixar plano de corte",
            "Nome do arquivo:",
            "plano_de_corte",
          );
          if (nome === null) return;
          baixarTexto(`${nomeDeArquivo(nome)}_${carimboDeData()}.svg`, svg, "image/svg+xml");
          tocar("salvar");
        },
      },
      // Botão sem "aoClicar" não faz nada: o Fechar do plano estava morto.
      { rotulo: "Fechar", aoClicar: () => fecharPainel() },
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

function botaoCurto(rotulo, aoClicar, ativo = false) {
  const alvo = document.createElement("button");
  alvo.type = "button";
  alvo.className = `botao botao--curto${ativo ? " botao--destaque" : ""}`;
  alvo.textContent = rotulo;
  alvo.addEventListener("click", aoClicar);
  return alvo;
}

function linhaBotoes(...botoes) {
  const linha = document.createElement("div");
  linha.className = "linha-botoes";
  linha.append(...botoes.filter(Boolean));
  return linha;
}

function secaoDaSelecao() {
  const lista = selecionadas();
  const secao = grupoPainel(
    lista.length === 1 ? lista[0].nome : `${lista.length} chapas escolhidas`,
  );

  const emGrupo = lista.filter((chapa) => chapa.grupo).length;
  if (emGrupo) {
    const nota = document.createElement("p");
    nota.className = "dica";
    nota.textContent =
      emGrupo === lista.length
        ? "Estas chapas estão agrupadas: andam e giram juntas."
        : `${emGrupo} das ${lista.length} estão agrupadas.`;
    secao.append(nota);
  }

  secao.append(
    linhaBotoes(
      botao("agrupar", "Agrupar", agrupar),
      botao("desagrupar", "Desagrupar", desagrupar),
    ),
  );

  // Girar: eixo, depois o tanto.
  const tituloGiro = document.createElement("p");
  tituloGiro.className = "campo__rotulo";
  tituloGiro.textContent = "Girar em volta do eixo";
  const eixos = document.createElement("div");
  eixos.className = "linha-botoes";
  for (const item of EIXOS_DO_GIRO) {
    eixos.append(
      botaoCurto(
        item.rotulo,
        () => {
          eixoDoGiro = item.id;
          atualizarPainel();
        },
        eixoDoGiro === item.id,
      ),
    );
  }
  const passos = document.createElement("div");
  passos.className = "linha-botoes";
  for (const graus of [-90, -45, 45, 90, 180]) {
    passos.append(
      botaoCurto(`${graus > 0 ? "+" : ""}${graus}°`, () => girarSelecao(graus)),
    );
  }
  secao.append(tituloGiro, eixos, passos);
  secao.append(
    campoNumero("Ajuste fino (graus)", giroFino, (n) => {
      giroFino = n;
    }, { min: -180, max: 180, passo: 1 }),
    linhaBotoes(botao("girar", "Girar o ajuste fino", () => girarSelecao(giroFino))),
  );

  if (lista.length === 1) {
    const chapa = lista[0];
    const rotulos = chapasMod.rotulosDaChapa(chapa);
    secao.append(
      campoNumero(`${rotulos.rotuloU} (mm)`, chapa.largura, (n) => {
        chapa.largura = n;
        redesenhar();
      }, { min: 5, max: 2000, passo: 1 }),
      campoNumero(`${rotulos.rotuloV} (mm)`, chapa.altura, (n) => {
        chapa.altura = n;
        redesenhar();
      }, { min: 5, max: 2000, passo: 1 }),
      campoNumero("Posição X (mm)", chapa.centro.x, (n) => {
        chapa.centro.x = n;
        redesenhar();
      }, { min: -2000, max: 2000, passo: 1 }),
      campoNumero("Posição Y (mm)", chapa.centro.y, (n) => {
        chapa.centro.y = n;
        redesenhar();
      }, { min: -2000, max: 2000, passo: 1 }),
      campoNumero("Posição Z (mm)", chapa.centro.z, (n) => {
        chapa.centro.z = n;
        redesenhar();
      }, { min: -2000, max: 2000, passo: 1 }),
    );
    if (!chapasMod.alinhada(chapa)) {
      const alerta = document.createElement("p");
      alerta.className = "dica dica--alerta";
      alerta.textContent =
        "Esta chapa está em ângulo. O encaixe automático dela chega no próximo lote.";
      secao.append(alerta);
    }
  }

  secao.append(
    linhaBotoes(
      botao("duplicar", "Duplicar", duplicarSelecao),
      botao("lixo", "Apagar", apagarSelecao, "botao--perigo"),
    ),
  );
  return secao;
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

  // O ímã e o grid moram juntos: são as duas coisas que decidem onde a chapa
  // pode parar, e o aluno precisa ver as duas lado a lado para entender por
  // que a peça grudou (ou por que não grudou).
  const bancada = grupoPainel("Ajuda para encaixar");
  const passoAtual = cena.passoDoEncaixe();
  const ligaIma = document.createElement("label");
  ligaIma.className = "campo campo--linha";
  const caixaIma = document.createElement("input");
  caixaIma.type = "checkbox";
  caixaIma.checked = imaLigado;
  caixaIma.addEventListener("change", () => {
    imaLigado = caixaIma.checked;
    atualizarPainel();
  });
  const rotuloIma = document.createElement("span");
  rotuloIma.className = "campo__rotulo";
  rotuloIma.textContent = "Ímã de encaixe";
  ligaIma.append(caixaIma, rotuloIma);
  bancada.append(ligaIma);
  if (imaLigado) {
    bancada.append(
      campoNumero("Força do ímã (mm)", imaForca, (n) => {
        imaForca = n;
      }, { min: 0.5, max: 10, passo: 0.5 }),
    );
  }
  const notaGrid = document.createElement("p");
  notaGrid.className = "dica";
  notaGrid.textContent = passoAtual
    ? `A chapa anda de ${passoAtual} em ${passoAtual} mm a partir de onde está. Troque o passo nos Ajustes, em Bancada.`
    : "O passo do grid está desligado nos Ajustes: a chapa anda livre.";
  bancada.append(notaGrid);

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

  painelArea.append(material, bancada, folha);

  if (selecionadas().length) {
    painelArea.append(secaoDaSelecao());
  } else {
    const dica = document.createElement("p");
    dica.className = "dica";
    dica.textContent =
      "Toque numa chapa para ajustar. Segure Shift (ou use o modo Somar) para escolher várias.";
    painelArea.append(dica);
  }
}

function atualizarStatus() {
  if (!statusArea) return;
  const cfg = config();
  const medidas = chapasMod.medidasDaCaixa(chapas, cfg.espessura);
  const juntas = ultimoResultado ? ultimoResultado.juntas.length : 0;
  const emT = ultimoResultado ? ultimoResultado.juntas.filter((j) => j.tipo === "te").length : 0;
  const grupos = quantosGrupos();
  // A forma pronta traz os encaixes dela calculados, então eles não passam
  // pelo detector. Dizer "0 juntas" numa pirâmide inteirinha encaixada seria
  // mentira; aqui eles entram na conta pelo que são.
  const prontos = chapas.reduce((soma, chapa) => {
    const abas = Object.values(chapa.encaixesFixos || {}).reduce((n, lista) => n + lista.length, 0);
    return soma + abas + (chapa.furosFixos || []).length;
  }, 0);
  const contagem = [
    juntas ? `${juntas} junta(s)${emT ? ` (${emT} em T)` : ""}` : "",
    prontos ? `${prontos} encaixe(s) da forma` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  statusArea.textContent = chapas.length
    ? `${chapas.length} chapa(s)${grupos ? ` em ${grupos} grupo(s)` : ""} · ${materiais.nomeDoMaterial()} · montagem ${Math.round(medidas.largura)} × ${Math.round(medidas.altura)} × ${Math.round(medidas.profundidade)} mm${contagem ? ` · ${contagem}` : ""}${selecao.length ? ` · ${selecao.length} escolhida(s)` : ""}`
    : "Comece por uma caixa pronta ou plante uma chapa.";
}

// --- Montagem da tela --------------------------------------------------

function montarEsqueleto(area, aoVoltar) {
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
        <div class="palco__canto palco__canto--topo-esquerda"></div>
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
    botaoBarra("agrupar", "Agrupar", agrupar, "com-rotulo"),
    botaoBarra("desagrupar", "Desagrupar", desagrupar, "com-rotulo"),
    risco(),
    botaoBarra("guardarBolsa", "Guardar na bolsa", guardarNaBolsa, "com-rotulo"),
    botaoBarra("planoCorte", "Plano de corte", abrirPlano, "com-rotulo botao--destaque"),
    risco(),
    botaoBarra("lixo", "Limpar montagem", limparTudo, "botao--perigo com-rotulo"),
  );

  const caixa = raiz.querySelector(".livre__ferramentas");
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

  for (const [id, plano] of Object.entries(chapasMod.PLANOS)) {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "ferramenta";
    const desenho = id === "XZ" ? "chapaDeitada" : id === "XY" ? "chapaFrente" : "chapaLado";
    alvo.innerHTML = `${iconeFerramenta(desenho)}<span>${plano.nome}</span>`;
    alvo.addEventListener("click", () => inserirChapa(id));
    caixa.append(alvo);
  }

  // Modos do ponteiro por cima da cena, igual ao Criação Livre 3D: é daqui
  // que sai o girar e o arrastar a câmera no celular.
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

function chapaSobOPonteiro(evento) {
  const retangulo = tela.getBoundingClientRect();
  const ponteiro = new THREE.Vector2(
    ((evento.clientX - retangulo.left) / retangulo.width) * 2 - 1,
    -((evento.clientY - retangulo.top) / retangulo.height) * 2 + 1,
  );
  raio.setFromCamera(ponteiro, cena3d.camera);
  const acertos = raio.intersectObjects(grupo.children, false);
  return acertos.length ? acertos[0].object.userData.chapa : null;
}

export async function montar(area, setor, aoVoltar) {
  carregarEstilo("styles/livre.css");
  carregarEstilo("styles/corte.css");
  materiais.carregar();
  montarEsqueleto(area, aoVoltar);

  cena.iniciar(tela);
  grupo = new THREE.Group();
  grupoJuntas = new THREE.Group();
  grupoIma = new THREE.Group();
  cena3d.cena.add(grupo, grupoJuntas, grupoIma);
  raio = new THREE.Raycaster();

  // O punho é um objeto invisível no meio da seleção. A garra segura ele, e
  // o que ele anda ou gira é repassado para todas as chapas escolhidas —
  // é assim que um grupo inteiro se move sem sair do lugar um do outro.
  punho = new THREE.Object3D();
  punho.visible = false;
  cena3d.cena.add(punho);

  garra = new TransformControls(cena3d.camera, tela);
  // Sem snap na garra de propósito. O snap dela arredonda a posição absoluta
  // para múltiplos do passo, e numa caixa de 3 mm as paredes moram em 43,5:
  // com passo de 5 mm não existia posição alcançável que encostasse. Quem
  // pisa no grid agora é o seguirGarra, contando a partir de onde a chapa
  // estava, e o ímã por cima.
  garra.setTranslationSnap(null);
  garra.setRotationSnap((5 * Math.PI) / 180);
  garra.setSize(0.8 * Number(ajuste("alcas") || 1));
  garra.addEventListener("dragging-changed", (evento) => {
    cena3d.orbita.enabled = !evento.value;
    arrastando = evento.value;
    if (evento.value) {
      guardarPunho();
    } else {
      // Arredonda depois do arrasto: número redondo é o que o aluno consegue
      // repetir na régua de verdade. Um décimo de milímetro chega, e é fino o
      // bastante para não estragar o que o ímã acabou de encaixar.
      for (const chapa of selecionadas()) {
        chapa.centro.x = Math.round(chapa.centro.x * 10) / 10;
        chapa.centro.y = Math.round(chapa.centro.y * 10) / 10;
        chapa.centro.z = Math.round(chapa.centro.z * 10) / 10;
      }
      desenharMarcasDoIma([]);
      redesenhar();
      atualizarPainel();
    }
  });
  garra.addEventListener("objectChange", () => {
    seguirGarra();
    if (!arrastando) return;
  });
  const ajudante = garra.getHelper ? garra.getHelper() : garra;
  cena3d.cena.add(ajudante);
  trocarGarra("base");
  trocarPonteiro("selecionar");

  const aoClicar = (evento) => {
    if (evento.button !== 0 || garra.dragging) return;
    if (modoDoPonteiro === "mao" || modoDoPonteiro === "camera") return;
    const alvo = chapaSobOPonteiro(evento);
    const somando =
      evento.shiftKey || evento.ctrlKey || evento.metaKey || modoDoPonteiro === "somar";
    if (!alvo) {
      if (!somando) selecionar([]);
      return;
    }
    selecionar([alvo], { somando });
  };
  tela.addEventListener("pointerdown", aoClicar);
  desligar.push(() => tela.removeEventListener("pointerdown", aoClicar));

  const aoTeclar = (evento) => {
    if (!raiz || !raiz.isConnected) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(evento.target?.tagName)) return;
    const comando = evento.ctrlKey || evento.metaKey;
    if (evento.key === "Delete" || evento.key === "Backspace") {
      if (!selecao.length) return;
      evento.preventDefault();
      apagarSelecao();
      return;
    }
    if (evento.key === "Escape") selecionar([]);
    if (comando && evento.key.toLowerCase() === "a") {
      evento.preventDefault();
      selecionar(chapas.map((chapa) => chapa.id));
      return;
    }
    if (comando && evento.key.toLowerCase() === "d") {
      evento.preventDefault();
      duplicarSelecao();
      return;
    }
    if (comando && evento.key.toLowerCase() === "g") {
      evento.preventDefault();
      if (evento.shiftKey) desagrupar();
      else agrupar();
      return;
    }
    const numero = Number(evento.key);
    if (numero >= 1 && numero <= MODOS_DE_GARRA.length) {
      trocarGarra(MODOS_DE_GARRA[numero - 1].id);
      return;
    }
    if (numero >= 6 && numero <= 5 + MODOS_DE_PONTEIRO.length) {
      trocarPonteiro(MODOS_DE_PONTEIRO[numero - 6].id);
    }
  };
  window.addEventListener("keydown", aoTeclar);
  desligar.push(() => window.removeEventListener("keydown", aoTeclar));

  const palco = raiz.querySelector(".livre__palco");
  const observador = new ResizeObserver(() =>
    cena.redimensionar(palco.clientWidth, palco.clientHeight),
  );
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
      if (chave === "alcas" || chave === "*") garra?.setSize(0.8 * Number(ajuste("alcas") || 1));
    }),
  );

  definirDestino((item) => {
    if (!cena3d.renderizador) return false;
    return colocarDaBolsa(item);
  });
  desligar.push(() => limparDestino());

  chapas = [];
  selecao = [];
  grupoContador = 0;
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
  punho = null;
  punhoAnterior = null;
  grupo = null;
  grupoJuntas = null;
  grupoIma = null;
  chapas = [];
  selecao = [];
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
