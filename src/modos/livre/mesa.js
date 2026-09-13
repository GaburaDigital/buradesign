// A mesa é a base de corte: fundo, grid suave, réguas em milímetros e a
// navegação da câmera. Nada aqui pertence ao desenho do usuário.

import { cena, paleta, deMm, unidade } from "./estado.js";

let ajustandoCamera = false;

export function iniciarPaper(tela) {
  const paper = window.paper;
  paper.setup(tela);
  cena.paper = paper;
  cena.tela = tela;
  cena.camadaMesa = new paper.Layer({ name: "mesa" });
  cena.camadaPecas = new paper.Layer({ name: "pecas" });
  cena.camadaGuias = new paper.Layer({ name: "guias" });
  cena.camadaPecas.activate();
  desenharMesa();
  enquadrar();
  return paper;
}

export function desenharMesa() {
  const paper = cena.paper;
  const tons = paleta();
  const { largura, altura, grid } = cena.mesa;
  const anterior = cena.camadaPecas;
  cena.camadaMesa.removeChildren();
  cena.camadaMesa.activate();

  const base = new paper.Path.Rectangle({
    point: [0, 0],
    size: [largura, altura],
    fillColor: tons.fundoMesa,
  });
  base.strokeColor = tons.borda;
  base.strokeWidth = 0.6;
  base.strokeScaling = false;

  const fino = new paper.Group();
  const grosso = new paper.Group();
  for (let x = 0; x <= largura + 0.001; x += grid) {
    const linha = new paper.Path.Line([x, 0], [x, altura]);
    (Math.round(x) % (grid * 5) === 0 ? grosso : fino).addChild(linha);
  }
  for (let y = 0; y <= altura + 0.001; y += grid) {
    const linha = new paper.Path.Line([0, y], [largura, y]);
    (Math.round(y) % (grid * 5) === 0 ? grosso : fino).addChild(linha);
  }
  fino.strokeColor = tons.gradeFina;
  fino.strokeWidth = 0.35;
  fino.strokeScaling = false;
  grosso.strokeColor = tons.gradeGrossa;
  grosso.strokeWidth = 0.6;
  grosso.strokeScaling = false;

  desenharReguas(tons);
  cena.camadaMesa.sendToBack();
  anterior.activate();
}

function desenharReguas(tons) {
  const paper = cena.paper;
  const { largura, altura, grid } = cena.mesa;
  const passo = grid * 5;
  const tamanho = Math.max(3, Math.min(largura, altura) / 45);

  for (let x = 0; x <= largura + 0.001; x += passo) {
    const marca = new paper.PointText({
      point: [x, -tamanho * 0.6],
      content: String(Math.round(deMm(x))),
      fillColor: tons.texto,
      fontSize: tamanho,
      justification: "center",
      fontFamily: "monospace",
    });
    marca.data.regua = true;
  }
  for (let y = passo; y <= altura + 0.001; y += passo) {
    const marca = new paper.PointText({
      point: [-tamanho * 0.6, y + tamanho * 0.35],
      content: String(Math.round(deMm(y))),
      fillColor: tons.texto,
      fontSize: tamanho,
      justification: "right",
      fontFamily: "monospace",
    });
    marca.data.regua = true;
  }
  const legenda = new paper.PointText({
    point: [largura, altura + tamanho * 1.8],
    content: `mesa ${Math.round(deMm(largura))} x ${Math.round(deMm(altura))} ${unidade()}`,
    fillColor: tons.texto,
    fontSize: tamanho,
    justification: "right",
    fontFamily: "monospace",
  });
  legenda.data.regua = true;
}

export function redefinirMesa({ largura, altura, grid }) {
  cena.mesa = {
    largura: Math.max(20, Math.min(2000, largura)),
    altura: Math.max(20, Math.min(2000, altura)),
    grid: Math.max(1, Math.min(50, grid)),
  };
  desenharMesa();
  enquadrar();
}

export function enquadrar() {
  const paper = cena.paper;
  if (!paper || !paper.view) return;
  const { largura, altura } = cena.mesa;
  const folga = Math.max(largura, altura) * 0.12;
  const area = new paper.Rectangle(-folga, -folga, largura + folga * 2, altura + folga * 2);
  const vista = paper.view.viewSize;
  if (!vista.width || !vista.height) return;
  ajustandoCamera = true;
  paper.view.zoom = Math.min(vista.width / area.width, vista.height / area.height);
  paper.view.center = area.center;
  ajustandoCamera = false;
}

export function aproximar(fator = 1.25, foco) {
  const paper = cena.paper;
  const limite = Math.max(0.05, Math.min(60, paper.view.zoom * fator));
  if (foco) {
    const antes = paper.view.viewToProject(foco);
    paper.view.zoom = limite;
    const depois = paper.view.viewToProject(foco);
    paper.view.center = paper.view.center.add(antes.subtract(depois));
  } else {
    paper.view.zoom = limite;
  }
}

export function arrastarCamera(deslocamentoEmTela) {
  const paper = cena.paper;
  paper.view.center = paper.view.center.subtract(deslocamentoEmTela.divide(paper.view.zoom));
}

// Roda do mouse: sozinha aproxima; com Ctrl sobe e desce; com Shift vai
// para os lados. É o esquema pedido no projeto.
export function ligarRoda(tela) {
  tela.addEventListener(
    "wheel",
    (evento) => {
      evento.preventDefault();
      const paper = cena.paper;
      if (!paper) return;
      const passo = 40 / paper.view.zoom;
      if (evento.ctrlKey || evento.metaKey) {
        paper.view.center = paper.view.center.add([0, Math.sign(evento.deltaY) * passo]);
      } else if (evento.shiftKey) {
        paper.view.center = paper.view.center.add([Math.sign(evento.deltaY) * passo, 0]);
      } else {
        const retangulo = tela.getBoundingClientRect();
        const foco = new paper.Point(
          evento.clientX - retangulo.left,
          evento.clientY - retangulo.top,
        );
        aproximar(evento.deltaY < 0 ? 1.12 : 1 / 1.12, foco);
      }
    },
    { passive: false },
  );
}

export function estaAjustandoCamera() {
  return ajustandoCamera;
}
