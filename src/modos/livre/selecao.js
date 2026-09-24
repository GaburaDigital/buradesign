// Ferramenta Selecionar. Cobre clique, seleção por região, Ctrl para somar,
// arrastar, girar e escalar pelas alças.
// Shift trava o movimento em linha reta, gira de 45 em 45 graus e mantém a
// proporção ao escalar.

import {
  cena,
  definirSelecao,
  limparSelecao,
  encaixar,
  encaixarPonto,
  paleta,
  escalaDasAlcas,
} from "./estado.js";
import { registrar } from "./historico.js";

const CANTOS = [
  { id: 0, x: 0, y: 0 },
  { id: 1, x: 0.5, y: 0 },
  { id: 2, x: 1, y: 0 },
  { id: 3, x: 1, y: 0.5 },
  { id: 4, x: 1, y: 1 },
  { id: 5, x: 0.5, y: 1 },
  { id: 6, x: 0, y: 1 },
  { id: 7, x: 0, y: 0.5 },
];

let modo = null;
let ancora = null;
let cantoAtivo = null;
let proporcional = false;
let inicioArrasto = null;
let posicoesIniciais = [];
let caixaInicial = null;
let anguloInicial = 0;
let regiao = null;
let giroAcumulado = 0;

export function limitesDaSelecao() {
  if (!cena.selecao.length) return null;
  return cena.selecao.reduce(
    (soma, item) => (soma ? soma.unite(item.bounds) : item.bounds.clone()),
    null,
  );
}

// Peça selecionada fica evidente: contorno grosso na cor do guia e
// preenchimento puxado para ela.
function pintarSelecao() {
  const tons = paleta();
  for (const item of cena.camadaPecas.children) {
    const marcada = cena.selecao.includes(item);
    if (marcada === Boolean(item.data.pintadaComoSelecionada)) continue;
    item.data.pintadaComoSelecionada = marcada;
    if (marcada) {
      item.strokeColor = tons.guia;
      item.strokeWidth = 1.2;
      if (item.fillColor) {
        item.fillColor = tons.guia;
        item.fillColor.alpha = 0.5;
      }
    } else {
      item.strokeColor = item.data.negativo ? "#e03131" : tons.contorno;
      item.strokeWidth = item.data.negativo ? 0.5 : 0.4;
      if (item.data.cor && !item.data.negativo) {
        item.fillColor = item.data.cor;
        item.fillColor.alpha = 0.85;
      }
    }
  }
}

export function atualizarGuias() {
  const paper = cena.paper;
  if (!paper) return;
  pintarSelecao();
  const tons = paleta();
  cena.camadaGuias.removeChildren();
  const caixa = limitesDaSelecao();
  if (!caixa) {
    paper.view.requestUpdate?.();
    return;
  }
  const anterior = paper.project.activeLayer;
  cena.camadaGuias.activate();

  const moldura = new paper.Path.Rectangle(caixa);
  moldura.strokeColor = tons.guia;
  moldura.strokeWidth = 1;
  moldura.strokeScaling = false;
  moldura.dashArray = [4, 3];

  const lado = (8 * escalaDasAlcas()) / paper.view.zoom;
  for (const canto of CANTOS) {
    const centro = new paper.Point(
      caixa.x + caixa.width * canto.x,
      caixa.y + caixa.height * canto.y,
    );
    const alca = new paper.Path.Rectangle({
      point: centro.subtract(lado / 2),
      size: [lado, lado],
    });
    alca.fillColor = tons.guia;
    alca.strokeColor = tons.fundoMesa;
    alca.strokeWidth = 1;
    alca.strokeScaling = false;
    alca.data = { papel: "escala", canto: canto.id };
  }

  // Cantoneira de proporção: fica fora da caixa, afastada das alças comuns,
  // e redimensiona mantendo a forma.
  const afastamento = (14 * escalaDasAlcas()) / paper.view.zoom;
  const cantoProporcional = new paper.Point(caixa.right + afastamento, caixa.bottom + afastamento);
  const bracoTamanho = lado * 1.3;
  const cantoneira = new paper.Path({
    segments: [
      [cantoProporcional.x - bracoTamanho, cantoProporcional.y],
      [cantoProporcional.x, cantoProporcional.y],
      [cantoProporcional.x, cantoProporcional.y - bracoTamanho],
    ],
  });
  cantoneira.strokeColor = tons.guia;
  cantoneira.strokeWidth = 2.5;
  cantoneira.strokeScaling = false;
  cantoneira.strokeCap = "square";
  cantoneira.data = { papel: "proporcional" };
  const alvoDaCantoneira = new paper.Path.Rectangle({
    point: [cantoProporcional.x - bracoTamanho, cantoProporcional.y - bracoTamanho],
    size: [bracoTamanho * 1.4, bracoTamanho * 1.4],
  });
  alvoDaCantoneira.fillColor = tons.guia;
  alvoDaCantoneira.opacity = 0.001;
  alvoDaCantoneira.data = { papel: "proporcional" };

  const alturaHaste = (26 * escalaDasAlcas()) / paper.view.zoom;
  const topo = new paper.Point(caixa.center.x, caixa.y);
  const haste = new paper.Path.Line(topo, topo.subtract([0, alturaHaste]));
  haste.strokeColor = tons.guia;
  haste.strokeWidth = 1;
  haste.strokeScaling = false;
  const giro = new paper.Path.Circle(topo.subtract([0, alturaHaste]), lado * 0.7);
  giro.fillColor = tons.fundoMesa;
  giro.strokeColor = tons.guia;
  giro.strokeWidth = 1.4;
  giro.strokeScaling = false;
  giro.data = { papel: "rotacao" };

  anterior.activate();
  paper.view.requestUpdate?.();
}

function alcaEm(ponto) {
  const alvo = cena.camadaGuias.hitTest(ponto, {
    fill: true,
    stroke: true,
    tolerance: (6 * escalaDasAlcas()) / cena.paper.view.zoom,
  });
  return alvo && alvo.item.data && alvo.item.data.papel ? alvo.item : null;
}

function pecaEm(ponto) {
  const alvo = cena.camadaPecas.hitTest(ponto, {
    fill: true,
    stroke: true,
    segments: false,
    tolerance: 4 / cena.paper.view.zoom,
  });
  if (!alvo) return null;
  let item = alvo.item;
  while (item.parent && item.parent !== cena.camadaPecas) item = item.parent;
  return item;
}

export function aoPressionar(evento) {
  const alca = alcaEm(evento.point);
  inicioArrasto = evento.point;
  caixaInicial = limitesDaSelecao();
  posicoesIniciais = cena.selecao.map((item) => item.position.clone());
  giroAcumulado = 0;

  if (alca && caixaInicial) {
    if (alca.data.papel === "proporcional") {
      modo = "escalar";
      cantoAtivo = { x: 1, y: 1 };
      ancora = new cena.paper.Point(caixaInicial.x, caixaInicial.y);
      proporcional = true;
      return;
    }
    proporcional = false;
    if (alca.data.papel === "rotacao") {
      modo = "girar";
      anguloInicial = evento.point.subtract(caixaInicial.center).angle;
    } else {
      modo = "escalar";
      const canto = CANTOS[alca.data.canto];
      cantoAtivo = canto;
      ancora = new cena.paper.Point(
        caixaInicial.x + caixaInicial.width * (1 - canto.x),
        caixaInicial.y + caixaInicial.height * (1 - canto.y),
      );
    }
    return;
  }

  const peca = pecaEm(evento.point);
  const somando = evento.modifiers.control || evento.modifiers.command || evento.modifiers.shift;

  if (peca) {
    if (somando) {
      const lista = cena.selecao.includes(peca)
        ? cena.selecao.filter((item) => item !== peca)
        : [...cena.selecao, peca];
      definirSelecao(lista);
    } else if (!cena.selecao.includes(peca)) {
      definirSelecao([peca]);
    }
    posicoesIniciais = cena.selecao.map((item) => item.position.clone());
    modo = "mover";
    return;
  }

  if (!somando) limparSelecao();
  modo = "regiao";
  const anterior = cena.paper.project.activeLayer;
  cena.camadaGuias.activate();
  regiao = new cena.paper.Path.Rectangle(evento.point, evento.point);
  regiao.strokeColor = paleta().guia;
  regiao.strokeWidth = 1;
  regiao.strokeScaling = false;
  regiao.dashArray = [3, 3];
  anterior.activate();
}

export function aoArrastar(evento) {
  if (!modo) return;
  const paper = cena.paper;

  if (modo === "mover") {
    let deslocamento = evento.point.subtract(inicioArrasto);
    if (evento.modifiers.shift) {
      if (Math.abs(deslocamento.x) > Math.abs(deslocamento.y)) deslocamento.y = 0;
      else deslocamento.x = 0;
    }
    cena.selecao.forEach((item, indice) => {
      const destino = posicoesIniciais[indice].add(deslocamento);
      item.position = new paper.Point(encaixar(destino.x), encaixar(destino.y));
    });
    atualizarGuias();
    return;
  }

  if (modo === "girar" && caixaInicial) {
    const centro = caixaInicial.center;
    let angulo = evento.point.subtract(centro).angle - anguloInicial;
    if (evento.modifiers.shift) angulo = Math.round(angulo / 45) * 45;
    const delta = angulo - giroAcumulado;
    giroAcumulado = angulo;
    for (const item of cena.selecao) {
      item.rotate(delta, centro);
      item.data.rotacao = ((item.data.rotacao || 0) + delta) % 360;
    }
    atualizarGuias();
    return;
  }

  if (modo === "escalar" && caixaInicial && ancora) {
    const inicial = inicioArrasto.subtract(ancora);
    const atual = evento.point.subtract(ancora);
    const minimo = 0.001;
    let fatorX = cantoAtivo.x === 0.5 || Math.abs(inicial.x) < minimo ? 1 : atual.x / inicial.x;
    let fatorY = cantoAtivo.y === 0.5 || Math.abs(inicial.y) < minimo ? 1 : atual.y / inicial.y;
    if ((proporcional || evento.modifiers.shift) && cantoAtivo.x !== 0.5 && cantoAtivo.y !== 0.5) {
      const uniforme = Math.max(Math.abs(fatorX), Math.abs(fatorY));
      fatorX = uniforme;
      fatorY = uniforme;
    }
    const limitar = (fator) => Math.max(0.02, Math.min(50, Math.abs(fator)));
    const caixaAtual = limitesDaSelecao();
    if (!caixaAtual) return;
    const alvoLargura = limitar(fatorX) * caixaInicial.width;
    const alvoAltura = limitar(fatorY) * caixaInicial.height;
    const escalaX = caixaAtual.width > minimo ? alvoLargura / caixaAtual.width : 1;
    const escalaY = caixaAtual.height > minimo ? alvoAltura / caixaAtual.height : 1;
    for (const item of cena.selecao) item.scale(escalaX, escalaY, ancora);
    atualizarGuias();
    return;
  }

  if (modo === "regiao" && regiao) {
    regiao.remove();
    const anterior = paper.project.activeLayer;
    cena.camadaGuias.activate();
    regiao = new paper.Path.Rectangle(inicioArrasto, evento.point);
    regiao.strokeColor = paleta().guia;
    regiao.strokeWidth = 1;
    regiao.strokeScaling = false;
    regiao.dashArray = [3, 3];
    anterior.activate();
  }
}

export function aoSoltar() {
  if (modo === "regiao" && regiao) {
    const area = regiao.bounds;
    regiao.remove();
    regiao = null;
    const dentro = cena.camadaPecas.children.filter((item) => area.intersects(item.bounds));
    definirSelecao([...new Set([...cena.selecao, ...dentro])]);
  }
  if (modo && modo !== "regiao") registrar();
  modo = null;
  ancora = null;
  proporcional = false;
  atualizarGuias();
}

export function selecionarTudo() {
  definirSelecao(cena.camadaPecas.children.slice());
  atualizarGuias();
}

export function apagarSelecao() {
  if (!cena.selecao.length) return false;
  for (const item of cena.selecao) item.remove();
  limparSelecao();
  atualizarGuias();
  registrar();
  return true;
}

export function empurrar(dx, dy) {
  if (!cena.selecao.length) return;
  const passo = Math.max(1, encaixar(1) || 1);
  for (const item of cena.selecao) item.position = item.position.add([dx * passo, dy * passo]);
  atualizarGuias();
  registrar();
}

export function encaixarSelecaoNoGrid() {
  for (const item of cena.selecao) item.position = encaixarPonto(item.position);
  atualizarGuias();
  registrar();
}
