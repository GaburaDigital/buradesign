// A tela da bancada 2D.
//
// Desenho em canvas, no visual do resto da oficina: fundo escuro, traço fino,
// verde só no que importa. Nada de imagem: tudo é linha, para funcionar em
// qualquer tamanho de tela e em modo claro sem mudar de arquivo.
//
// Duas regras que evitam bug de desenho:
//
//   1. A espessura do traço é em PIXEL, não em milímetro. Se fosse em
//      milímetro, dar zoom engordaria a linha até a peça virar um borrão.
//      Então nada de ctx.scale para o zoom — as coordenadas são convertidas na
//      mão e a linha fica sempre com 1,6 px.
//   2. As cores saem do CSS, lidas na hora. Assim o "modo claro" dos ajustes
//      vale para o canvas também, sem uma segunda lista de cores aqui.

import { contornoDaForma, medidasDaEngrenagem, furosDaBarra, esbocoDaColisao } from "./formas2d.js";
import { paraOMundo, pontosDeMira, limitesDaCena, pecaPorId, TIPOS_DE_JUNTA } from "./cena2d.js";

const TAU = Math.PI * 2;

export function novaCamera() {
  // Zoom em pixel por milímetro. 0,5 mostra uns 2 metros numa tela de
  // computador, que é a escala de uma montagem de kit.
  return { x: 0, y: 0, zoom: 0.5 };
}

export const ZOOM_MIN = 0.06;
export const ZOOM_MAX = 8;

export function paraTela(camera, ponto, tela) {
  return [
    (ponto[0] - camera.x) * camera.zoom + tela.largura / 2,
    tela.altura / 2 - (ponto[1] - camera.y) * camera.zoom,
  ];
}

export function paraOMundoDaTela(camera, pixel, tela) {
  return [
    (pixel[0] - tela.largura / 2) / camera.zoom + camera.x,
    (tela.altura / 2 - pixel[1]) / camera.zoom + camera.y,
  ];
}

export function aproximar(camera, fator, emTorno = null, tela = null) {
  const antes = camera.zoom;
  camera.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camera.zoom * fator));
  if (emTorno && tela && antes !== camera.zoom) {
    // Dar zoom tem que deixar parado o ponto embaixo do cursor, senão a peça
    // fugindo da tela a cada rolada de roda deixa qualquer um tonto.
    const alvo = paraOMundoDaTela({ ...camera, zoom: antes }, emTorno, tela);
    const agora = paraOMundoDaTela(camera, emTorno, tela);
    camera.x += alvo[0] - agora[0];
    camera.y += alvo[1] - agora[1];
  }
  return camera;
}

export function enquadrar(camera, cena, tela, folga = 1.25) {
  const limites = limitesDaCena(cena);
  const largura = Math.max(60, (limites.maxX - limites.minX) * folga);
  const altura = Math.max(60, (limites.maxY - limites.minY) * folga);
  camera.x = (limites.minX + limites.maxX) / 2;
  camera.y = (limites.minY + limites.maxY) / 2;
  camera.zoom = Math.max(
    ZOOM_MIN,
    Math.min(ZOOM_MAX, Math.min(tela.largura / largura, tela.altura / altura)),
  );
  return camera;
}

// --- as cores ------------------------------------------------------------

function paleta(raiz) {
  const estilo = getComputedStyle(raiz || document.documentElement);
  const ler = (nome, reserva) => estilo.getPropertyValue(nome).trim() || reserva;
  return {
    fundo: ler("--fundo", "#000"),
    linha: ler("--linha", "#3a4046"),
    linhaForte: ler("--linha-forte", "#7c858c"),
    texto: ler("--texto", "#fff"),
    texto2: ler("--texto-2", "#b9c0c6"),
    texto3: ler("--texto-3", "#7c858c"),
    verde: ler("--verde", "#3fbf5f"),
    verdeFraco: ler("--verde-fraco", "#1d3d27"),
    ambar: ler("--ambar", "#e0a200"),
    perigo: ler("--perigo", "#ff6b6b"),
    metalClaro: ler("--metal-claro", "#dde2e6"),
    metalMedio: ler("--metal-medio", "#aab2b8"),
    metalEscuro: ler("--metal-escuro", "#7c858c"),
  };
}

// --- a grade -------------------------------------------------------------

function grade(ctx, camera, tela, cores) {
  // O passo da grade cresce com o afastamento: 10 mm de perto, 100 mm de
  // longe, 1 m lá no fim. Grade fixa viraria uma mancha cinza no zoom de fora.
  const candidatos = [10, 50, 100, 500, 1000];
  let passo = candidatos[candidatos.length - 1];
  for (const opcao of candidatos) {
    if (opcao * camera.zoom >= 14) {
      passo = opcao;
      break;
    }
  }
  const canto = paraOMundoDaTela(camera, [0, tela.altura], tela);
  const fim = paraOMundoDaTela(camera, [tela.largura, 0], tela);
  const forte = passo * 10;

  ctx.lineWidth = 1;
  for (let x = Math.ceil(canto[0] / passo) * passo; x <= fim[0]; x += passo) {
    const px = Math.round(paraTela(camera, [x, 0], tela)[0]) + 0.5;
    ctx.strokeStyle = Math.abs(x % forte) < passo / 2 ? cores.linha : cores.verdeFraco;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, tela.altura);
    ctx.stroke();
  }
  for (let y = Math.ceil(canto[1] / passo) * passo; y <= fim[1]; y += passo) {
    const py = Math.round(paraTela(camera, [0, y], tela)[1]) + 0.5;
    ctx.strokeStyle = Math.abs(y % forte) < passo / 2 ? cores.linha : cores.verdeFraco;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(tela.largura, py);
    ctx.stroke();
  }
  return passo;
}

// A seta da gravidade: sem ela, na vista de cima o aluno não sabe se a peça
// vai cair ou não. Com ela, a pergunta nem aparece.
function bussola(ctx, tela, cores, { paraBaixo, desligada }) {
  const x = 26;
  const y = tela.altura - 34;
  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = desligada ? cores.texto3 : cores.ambar;
  ctx.beginPath();
  if (paraBaixo && !desligada) {
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y + 12);
    ctx.moveTo(x - 5, y + 6);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x + 5, y + 6);
  } else {
    ctx.arc(x, y, 9, 0, TAU);
    ctx.moveTo(x - 6, y - 6);
    ctx.lineTo(x + 6, y + 6);
  }
  ctx.stroke();
  ctx.fillStyle = cores.texto3;
  ctx.font = "11px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(desligada ? "sem gravidade" : "gravidade", x + 14, y + 4);
  ctx.restore();
}

function regua(ctx, camera, tela, cores, passo) {
  const comprimento = passo * camera.zoom;
  const x = tela.largura - 24 - comprimento;
  const y = tela.altura - 26;
  ctx.save();
  ctx.strokeStyle = cores.texto3;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y + 5);
  ctx.moveTo(x, y);
  ctx.lineTo(x + comprimento, y);
  ctx.moveTo(x + comprimento, y - 5);
  ctx.lineTo(x + comprimento, y + 5);
  ctx.stroke();
  ctx.fillStyle = cores.texto3;
  ctx.font = "11px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(passo >= 1000 ? `${passo / 1000} m` : `${passo} mm`, x + comprimento / 2, y - 9);
  ctx.restore();
}

// --- a peça --------------------------------------------------------------

function caminhoDoContorno(ctx, camera, tela, peca, contorno) {
  ctx.beginPath();
  for (let i = 0; i < contorno.length; i += 1) {
    const [px, py] = paraTela(camera, paraOMundo(peca, contorno[i]), tela);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// O tijolo do sólido. Não é textura de imagem: são linhas, para ficar nítido
// em qualquer zoom e não pesar nada.
function tijolos(ctx, camera, tela, peca, cores) {
  if (peca.forma.tipo !== "retangulo") return;
  const { largura, altura } = peca.forma;
  const alturaDoTijolo = Math.max(14, Math.min(40, altura / 2));
  const larguraDoTijolo = alturaDoTijolo * 2.2;
  if (alturaDoTijolo * camera.zoom < 4) return;
  ctx.save();
  ctx.strokeStyle = cores.metalEscuro;
  ctx.lineWidth = 1;
  ctx.beginPath();
  let fileira = 0;
  for (let y = -altura / 2; y < altura / 2 - 0.5; y += alturaDoTijolo) {
    const a = paraTela(camera, paraOMundo(peca, [-largura / 2, y]), tela);
    const b = paraTela(camera, paraOMundo(peca, [largura / 2, y]), tela);
    if (y > -altura / 2) {
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    const deslocado = fileira % 2 ? larguraDoTijolo / 2 : 0;
    for (let x = -largura / 2 + deslocado; x < largura / 2; x += larguraDoTijolo) {
      if (x <= -largura / 2 + 0.5) continue;
      const alto = Math.min(y + alturaDoTijolo, altura / 2);
      const p1 = paraTela(camera, paraOMundo(peca, [x, y]), tela);
      const p2 = paraTela(camera, paraOMundo(peca, [x, alto]), tela);
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
    }
    fileira += 1;
  }
  ctx.stroke();
  ctx.restore();
}

// Hachura diagonal: é o que marca "esta peça está ancorada" quando ela não é
// de tijolo. Mesma linguagem do desenho técnico.
function hachurar(ctx, camera, tela, peca, contorno, cores) {
  ctx.save();
  caminhoDoContorno(ctx, camera, tela, peca, contorno);
  ctx.clip();
  const pontos = contorno.map((ponto) => paraTela(camera, paraOMundo(peca, ponto), tela));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pontos) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  ctx.strokeStyle = cores.linha;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const passo = 9;
  for (let d = minX - (maxY - minY); d < maxX; d += passo) {
    ctx.moveTo(d, maxY);
    ctx.lineTo(d + (maxY - minY), minY);
  }
  ctx.stroke();
  ctx.restore();
}

function miolo(ctx, camera, tela, peca, cores) {
  const centro = paraTela(camera, [peca.x, peca.y], tela);
  const raio = Math.max(2.5, Math.min(7, 4 * camera.zoom * 1.2));
  ctx.strokeStyle = cores.metalMedio;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(centro[0], centro[1], raio, 0, TAU);
  ctx.stroke();
}

function desenharPeca(ctx, camera, tela, peca, cores, { selecionada, apagada }) {
  const contorno = contornoDaForma(peca.forma);
  if (!contorno.length) return;

  const traco = selecionada ? cores.verde : peca.fixado ? cores.metalMedio : cores.metalClaro;
  caminhoDoContorno(ctx, camera, tela, peca, contorno);
  ctx.fillStyle = cores.fundo;
  ctx.globalAlpha = apagada ? 0.35 : 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;

  if (peca.tijolos) tijolos(ctx, camera, tela, peca, cores);
  else if (peca.fixado) hachurar(ctx, camera, tela, peca, contorno, cores);

  caminhoDoContorno(ctx, camera, tela, peca, contorno);
  ctx.strokeStyle = traco;
  ctx.lineWidth = selecionada ? 2.4 : 1.6;
  ctx.globalAlpha = apagada ? 0.4 : 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Detalhes que dizem o que a peça é sem precisar de legenda.
  if (peca.forma.tipo === "engrenagem") {
    const g = medidasDaEngrenagem(peca.forma.dentes, peca.forma.modulo);
    const centro = paraTela(camera, [peca.x, peca.y], tela);
    ctx.strokeStyle = cores.verdeFraco;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(centro[0], centro[1], g.primitivo * camera.zoom, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // Raios, como engrenagem cortada de verdade.
    const quantos = g.primitivo > 25 ? 5 : 3;
    ctx.strokeStyle = cores.metalEscuro;
    ctx.beginPath();
    for (let i = 0; i < quantos; i += 1) {
      const a = (TAU * i) / quantos + (peca.giro * Math.PI) / 180;
      const de = paraTela(camera, [peca.x + Math.cos(a) * g.raiz * 0.25, peca.y + Math.sin(a) * g.raiz * 0.25], tela);
      const ate = paraTela(camera, [peca.x + Math.cos(a) * g.raiz * 0.82, peca.y + Math.sin(a) * g.raiz * 0.82], tela);
      ctx.moveTo(de[0], de[1]);
      ctx.lineTo(ate[0], ate[1]);
    }
    ctx.stroke();
    miolo(ctx, camera, tela, peca, cores);
  } else if (peca.forma.tipo === "circulo") {
    miolo(ctx, camera, tela, peca, cores);
    if (peca.borracha) {
      // A banda de rodagem da roda: marquinhas na borda, como pneu.
      ctx.strokeStyle = cores.metalEscuro;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const quantos = 16;
      for (let i = 0; i < quantos; i += 1) {
        const a = (TAU * i) / quantos + (peca.giro * Math.PI) / 180;
        const de = paraTela(camera, [peca.x + Math.cos(a) * peca.forma.raio * 0.82, peca.y + Math.sin(a) * peca.forma.raio * 0.82], tela);
        const ate = paraTela(camera, [peca.x + Math.cos(a) * peca.forma.raio * 0.98, peca.y + Math.sin(a) * peca.forma.raio * 0.98], tela);
        ctx.moveTo(de[0], de[1]);
        ctx.lineTo(ate[0], ate[1]);
      }
      ctx.stroke();
    }
  } else if (peca.forma.tipo === "retangulo" && !peca.tijolos) {
    const { largura, altura } = peca.forma;
    if (largura >= altura * 2.2 && largura * camera.zoom > 40) {
      ctx.strokeStyle = cores.metalEscuro;
      ctx.lineWidth = 1.1;
      const raio = Math.max(1.5, Math.min(5, (altura / 5) * camera.zoom));
      for (const furo of furosDaBarra(largura, altura)) {
        const p = paraTela(camera, paraOMundo(peca, furo), tela);
        ctx.beginPath();
        ctx.arc(p[0], p[1], raio, 0, TAU);
        ctx.stroke();
      }
    }
  }

  if (selecionada) {
    // Um risco do centro para a direita mostra para onde a peça está virada.
    // Sem ele, não dá para ver que um disco girou.
    const centro = paraTela(camera, [peca.x, peca.y], tela);
    const a = (peca.giro * Math.PI) / 180;
    const alcance = Math.max(14, Math.min(42, 20 * camera.zoom));
    ctx.strokeStyle = cores.verde;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(centro[0], centro[1]);
    ctx.lineTo(centro[0] + Math.cos(a) * alcance, centro[1] - Math.sin(a) * alcance);
    ctx.stroke();
  }
}

// --- as restrições -------------------------------------------------------

function cruzDoPino(ctx, ponto, cor, raio = 6) {
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(ponto[0], ponto[1], raio, 0, TAU);
  ctx.moveTo(ponto[0] - raio - 3, ponto[1]);
  ctx.lineTo(ponto[0] + raio + 3, ponto[1]);
  ctx.moveTo(ponto[0], ponto[1] - raio - 3);
  ctx.lineTo(ponto[0], ponto[1] + raio + 3);
  ctx.stroke();
}

function glifoDoMotor(ctx, ponto, cor, tipo) {
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.6;
  const l = 9;
  ctx.beginPath();
  ctx.rect(ponto[0] - l, ponto[1] - l, l * 2, l * 2);
  ctx.stroke();
  ctx.beginPath();
  if (tipo === "servo") {
    // Um arco com ponta: o servo vai até um ângulo e para lá.
    ctx.arc(ponto[0], ponto[1], l - 3.5, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ponto[0] + 1.5, ponto[1] + 6.5);
    ctx.lineTo(ponto[0] + 5.5, ponto[1] + 4.2);
    ctx.lineTo(ponto[0] + 2, ponto[1] + 1.5);
  } else {
    // Uma volta inteira com seta: o motor não para de girar.
    ctx.arc(ponto[0], ponto[1], l - 3.5, 0.5, TAU - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ponto[0] + 2.4, ponto[1] - 6);
    ctx.lineTo(ponto[0] + 6.4, ponto[1] - 3.6);
    ctx.lineTo(ponto[0] + 2.6, ponto[1] - 1);
  }
  ctx.stroke();
  ctx.restore();
}

function pontaDaJunta(cena, junta, qual) {
  const idDaPeca = qual === "a" ? junta.a : junta.b;
  const ponto = qual === "a" ? junta.pa : junta.pb;
  if (!idDaPeca) return ponto;
  const peca = pecaPorId(cena, idDaPeca);
  return peca ? paraOMundo(peca, ponto) : null;
}

function desenharJunta(ctx, camera, tela, cena, junta, cores, selecionada) {
  const mundoA = pontaDaJunta(cena, junta, "a");
  const mundoB = pontaDaJunta(cena, junta, "b");
  if (!mundoA) return;
  const a = paraTela(camera, mundoA, tela);
  const b = mundoB ? paraTela(camera, mundoB, tela) : null;
  const cor = selecionada ? cores.verde : cores.ambar;

  if (junta.tipo === "engrenar") {
    const pa = pecaPorId(cena, junta.a);
    const pb = pecaPorId(cena, junta.b);
    if (!pa || !pb) return;
    const ca = paraTela(camera, [pa.x, pa.y], tela);
    const cb = paraTela(camera, [pb.x, pb.y], tela);
    ctx.save();
    ctx.strokeStyle = cor;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(ca[0], ca[1]);
    ctx.lineTo(cb[0], cb[1]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = cor;
    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "center";
    const razao = pb.forma.dentes / pa.forma.dentes;
    // O rótulo sai da linha entre os centros, não em cima dela: no meio da
    // linha moram os dois eixos, e o texto ficava embaixo do glifo do pino.
    const dx = cb[0] - ca[0];
    const dy = cb[1] - ca[1];
    const comprimento = Math.hypot(dx, dy) || 1;
    const afastar = 18;
    ctx.fillText(
      `${pa.forma.dentes}:${pb.forma.dentes}  (${razao >= 1 ? `${razao.toFixed(2)}x` : `1/${(1 / razao).toFixed(2)}`})`,
      (ca[0] + cb[0]) / 2 - (dy / comprimento) * afastar,
      (ca[1] + cb[1]) / 2 + (dx / comprimento) * afastar,
    );
    ctx.restore();
    return;
  }

  ctx.save();
  if (b) {
    // A linha entre os dois pontos escolhidos. Enquanto a simulação está
    // parada ela pode estar comprida — é o aluno vendo que, ao iniciar, as
    // peças vão se puxar uma para a outra.
    const longe = Math.hypot(a[0] - b[0], a[1] - b[1]) > 3;
    ctx.strokeStyle = longe ? cores.perigo : cor;
    ctx.lineWidth = 1.4;
    ctx.setLineDash(longe ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (junta.tipo === "pino") {
    if (junta.acionamento) glifoDoMotor(ctx, a, cor, junta.acionamento.tipo);
    else cruzDoPino(ctx, a, cor);
    if (b) cruzDoPino(ctx, b, cor, 4);
    if (!junta.b) {
      // Pino na bancada: o triângulo de apoio do desenho técnico.
      ctx.strokeStyle = cor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(a[0] - 9, a[1] + 15);
      ctx.lineTo(a[0], a[1] + 4);
      ctx.lineTo(a[0] + 9, a[1] + 15);
      ctx.closePath();
      ctx.stroke();
    }
  } else if (junta.tipo === "solda") {
    ctx.strokeStyle = cor;
    ctx.lineWidth = 2;
    for (const ponto of [a, b].filter(Boolean)) {
      ctx.beginPath();
      ctx.moveTo(ponto[0] - 6, ponto[1] - 6);
      ctx.lineTo(ponto[0] + 6, ponto[1] + 6);
      ctx.moveTo(ponto[0] + 6, ponto[1] - 6);
      ctx.lineTo(ponto[0] - 6, ponto[1] + 6);
      ctx.stroke();
    }
  } else if (junta.tipo === "trilho") {
    const ang = ((junta.eixo || 0) * Math.PI) / 180;
    const dx = Math.cos(ang) * 26;
    const dy = -Math.sin(ang) * 26;
    ctx.strokeStyle = cor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(a[0] - dx, a[1] - dy);
    ctx.lineTo(a[0] + dx, a[1] + dy);
    ctx.stroke();
    const nx = -dy / 26;
    const ny = dx / 26;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const lado of [-4, 4]) {
      ctx.moveTo(a[0] - dx + nx * lado, a[1] - dy + ny * lado);
      ctx.lineTo(a[0] + dx + nx * lado, a[1] + dy + ny * lado);
    }
    ctx.stroke();
  } else if (junta.tipo === "vareta") {
    ctx.strokeStyle = cor;
    ctx.lineWidth = junta.elastica ? 1.2 : 2.2;
    if (junta.elastica && b) {
      // Mola desenhada como mola: ziguezague entre as duas pontas.
      const voltas = 7;
      const dx = (b[0] - a[0]) / voltas;
      const dy = (b[1] - a[1]) / voltas;
      const comprimento = Math.hypot(dx, dy) || 1;
      const nx = (-dy / comprimento) * 5;
      const ny = (dx / comprimento) * 5;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      for (let i = 1; i < voltas; i += 1) {
        const lado = i % 2 ? 1 : -1;
        ctx.lineTo(a[0] + dx * i + nx * lado, a[1] + dy * i + ny * lado);
      }
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.fillStyle = cor;
    for (const ponto of [a, b].filter(Boolean)) {
      ctx.beginPath();
      ctx.arc(ponto[0], ponto[1], 3.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// --- a colisão à mostra --------------------------------------------------

function desenharColisao(ctx, camera, tela, peca, cores, decomp) {
  const esboco = esbocoDaColisao(peca.forma, { exata: peca.colisao === "exata", decomp });
  ctx.save();
  ctx.strokeStyle = peca.colisao === "exata" ? cores.verde : cores.ambar;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([3, 3]);
  for (const parte of esboco) {
    ctx.beginPath();
    if (parte.tipo === "circulo") {
      const centro = paraTela(camera, [peca.x, peca.y], tela);
      ctx.arc(centro[0], centro[1], parte.raio * camera.zoom, 0, TAU);
    } else {
      parte.pontos.forEach((ponto, i) => {
        const [px, py] = paraTela(camera, paraOMundo(peca, ponto), tela);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// --- a mira da ferramenta ------------------------------------------------

function desenharMiras(ctx, camera, tela, peca, cores) {
  ctx.save();
  ctx.strokeStyle = cores.verde;
  ctx.lineWidth = 1.2;
  for (const mira of pontosDeMira(peca)) {
    const p = paraTela(camera, paraOMundo(peca, mira), tela);
    ctx.beginPath();
    ctx.arc(p[0], p[1], 4, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

// --- o desenho inteiro ---------------------------------------------------

export function tamanhoDaTela(canvas) {
  return { largura: canvas.clientWidth || 800, altura: canvas.clientHeight || 500 };
}

export function ajustarResolucao(canvas) {
  const densidade = Math.min(window.devicePixelRatio || 1, 2);
  const largura = canvas.clientWidth || 800;
  const altura = canvas.clientHeight || 500;
  const alvoL = Math.round(largura * densidade);
  const alvoA = Math.round(altura * densidade);
  if (canvas.width !== alvoL || canvas.height !== alvoA) {
    canvas.width = alvoL;
    canvas.height = alvoA;
  }
  return { densidade, largura, altura };
}

export function desenhar(canvas, dados) {
  const {
    cena,
    camera,
    selecao = new Set(),
    juntaSelecionada = null,
    verColisoes = false,
    decomp = null,
    emCurso = null,
    rodando = false,
    raizDeEstilo = null,
  } = dados;

  const ctx = canvas.getContext("2d");
  const { densidade, largura, altura } = ajustarResolucao(canvas);
  const tela = { largura, altura };
  const cores = paleta(raizDeEstilo);

  ctx.setTransform(densidade, 0, 0, densidade, 0, 0);
  ctx.clearRect(0, 0, largura, altura);
  ctx.fillStyle = cores.fundo;
  ctx.fillRect(0, 0, largura, altura);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const passo = grade(ctx, camera, tela, cores);

  // O chão de referência da vista de lado: a linha do zero. Ela não colide
  // com nada — quem colide é o sólido que o aluno põe.
  if (cena.vista === "lado") {
    const y = Math.round(paraTela(camera, [0, 0], tela)[1]) + 0.5;
    ctx.strokeStyle = cores.linhaForte;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(largura, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const peca of cena.pecas) {
    desenharPeca(ctx, camera, tela, peca, cores, {
      selecionada: selecao.has(peca.id),
      apagada: Boolean(emCurso && emCurso.ignorar && emCurso.ignorar !== peca.id),
    });
  }

  if (verColisoes) {
    for (const peca of cena.pecas) desenharColisao(ctx, camera, tela, peca, cores, decomp);
  }

  for (const junta of cena.juntas) {
    desenharJunta(ctx, camera, tela, cena, junta, cores, juntaSelecionada === junta.id);
  }

  // A ferramenta de restrição em dois toques: o primeiro ponto já marcado, e a
  // linha pontilhada seguindo o dedo até o segundo.
  if (emCurso?.primeiro) {
    const peca = pecaPorId(cena, emCurso.primeiro.peca);
    if (peca) {
      const de = paraTela(camera, paraOMundo(peca, emCurso.primeiro.ponto), tela);
      cruzDoPino(ctx, de, cores.verde);
      if (emCurso.cursor) {
        const ate = paraTela(camera, emCurso.cursor, tela);
        ctx.save();
        ctx.strokeStyle = cores.verde;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(de[0], de[1]);
        ctx.lineTo(ate[0], ate[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }
  if (emCurso?.mirando) {
    const peca = pecaPorId(cena, emCurso.mirando);
    if (peca) desenharMiras(ctx, camera, tela, peca, cores);
  }
  if (emCurso?.encaixe) {
    const p = paraTela(camera, emCurso.encaixe, tela);
    ctx.save();
    ctx.strokeStyle = cores.verde;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 6, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  regua(ctx, camera, tela, cores, passo);
  bussola(ctx, tela, cores, {
    paraBaixo: cena.vista === "lado",
    desligada: !(cena.vista === "lado" && cena.gravidade !== false),
  });

  if (rodando) {
    ctx.save();
    ctx.strokeStyle = cores.verde;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, largura - 2, altura - 2);
    ctx.restore();
  }
}

export function nomeDaJunta(junta) {
  return TIPOS_DE_JUNTA[junta.tipo]?.nome || junta.tipo;
}
