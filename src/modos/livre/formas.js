// Formas básicas. Cada uma é gerada a partir dos seus parâmetros em
// milímetros, e pode ser regerada quando o usuário muda um número.
// A forma nunca guarda posição: quem posiciona é quem chama.

import { cena, proximaCor, paleta } from "./estado.js";

export const DEFINICOES = {
  quadrado: {
    nome: "Quadrado",
    params: { lado: { rotulo: "Lado", padrao: 40, min: 1, max: 2000 } },
  },
  retangulo: {
    nome: "Retângulo",
    params: {
      largura: { rotulo: "Largura", padrao: 60, min: 1, max: 2000 },
      altura: { rotulo: "Altura", padrao: 35, min: 1, max: 2000 },
    },
  },
  circulo: {
    nome: "Círculo",
    params: { diametro: { rotulo: "Diâmetro", padrao: 40, min: 1, max: 2000 } },
  },
  elipse: {
    nome: "Elipse",
    params: {
      largura: { rotulo: "Largura", padrao: 60, min: 1, max: 2000 },
      altura: { rotulo: "Altura", padrao: 35, min: 1, max: 2000 },
    },
  },
  poligono: {
    nome: "Polígono",
    params: {
      diametro: { rotulo: "Diâmetro", padrao: 45, min: 1, max: 2000 },
      lados: { rotulo: "Lados", padrao: 6, min: 3, max: 60, inteiro: true, semUnidade: true },
    },
  },
  estrela: {
    nome: "Estrela",
    params: {
      diametro: { rotulo: "Diâmetro", padrao: 50, min: 1, max: 2000 },
      pontas: { rotulo: "Pontas", padrao: 5, min: 3, max: 40, inteiro: true, semUnidade: true },
      raioInterno: { rotulo: "Raio interno (%)", padrao: 45, min: 5, max: 95, semUnidade: true },
    },
  },
  engrenagem: {
    nome: "Engrenagem",
    params: {
      diametro: { rotulo: "Diâmetro", padrao: 60, min: 5, max: 2000 },
      dentes: { rotulo: "Dentes", padrao: 12, min: 4, max: 80, inteiro: true, semUnidade: true },
      altura: { rotulo: "Altura do dente (%)", padrao: 18, min: 4, max: 40, semUnidade: true },
      furo: { rotulo: "Furo central", padrao: 8, min: 0, max: 500 },
      formato: {
        rotulo: "Formato do dente",
        padrao: "trapezio",
        opcoes: [
          { valor: "trapezio", rotulo: "Trapézio" },
          { valor: "quadrado", rotulo: "Quadrado" },
          { valor: "arredondado", rotulo: "Arredondado" },
        ],
      },
    },
  },
};

export function parametrosPadrao(tipo) {
  const definicao = DEFINICOES[tipo];
  if (!definicao) return {};
  const saida = {};
  for (const [chave, campo] of Object.entries(definicao.params)) saida[chave] = campo.padrao;
  return saida;
}

function engrenagemCaminho({ diametro, dentes, altura, furo, formato }) {
  const paper = cena.paper;
  const raioExterno = diametro / 2;
  const alturaDente = raioExterno * (altura / 100);
  const raioInterno = Math.max(raioExterno * 0.2, raioExterno - alturaDente);
  const passo = (Math.PI * 2) / dentes;
  const roda = new paper.Path({ closed: true });
  const pontasDoDente = [];

  const ponto = (raio, angulo) =>
    new paper.Point(Math.cos(angulo) * raio, Math.sin(angulo) * raio);

  const larguraTopo = formato === "quadrado" ? 0.5 : 0.3;
  const larguraBase = 0.5;

  for (let indice = 0; indice < dentes; indice += 1) {
    const base = indice * passo;
    roda.add(ponto(raioInterno, base - passo * larguraBase * 0.5));
    roda.add(ponto(raioExterno, base - passo * larguraTopo * 0.5));
    pontasDoDente.push(roda.segments.length - 1);
    roda.add(ponto(raioExterno, base + passo * larguraTopo * 0.5));
    pontasDoDente.push(roda.segments.length - 1);
    roda.add(ponto(raioInterno, base + passo * larguraBase * 0.5));
  }

  // O arredondamento só pode ser aplicado com o caminho inteiro montado.
  // Suavizar durante a construção deixava cada dente com um formato.
  if (formato === "arredondado") {
    for (const indice of pontasDoDente) {
      roda.segments[indice].smooth({ type: "catmull-rom", factor: 0.3 });
    }
  }

  if (furo > 0 && furo < raioInterno * 1.9) {
    const buraco = new paper.Path.Circle(new paper.Point(0, 0), furo / 2);
    // Subtrair abre um furo de verdade. Só empilhar os dois caminhos deixava
    // o miolo cheio, porque os dois giravam no mesmo sentido.
    const vazada = roda.subtract(buraco, { insert: false });
    roda.remove();
    buraco.remove();
    return vazada;
  }
  return roda;
}

// Devolve o caminho cru da forma, centrado na origem.
export function desenhar(tipo, params) {
  const paper = cena.paper;
  const centro = new paper.Point(0, 0);
  switch (tipo) {
    case "quadrado":
      return new paper.Path.Rectangle({
        point: [-params.lado / 2, -params.lado / 2],
        size: [params.lado, params.lado],
      });
    case "retangulo":
      return new paper.Path.Rectangle({
        point: [-params.largura / 2, -params.altura / 2],
        size: [params.largura, params.altura],
      });
    case "circulo":
      return new paper.Path.Circle(centro, params.diametro / 2);
    case "elipse":
      return new paper.Path.Ellipse({
        point: [-params.largura / 2, -params.altura / 2],
        size: [params.largura, params.altura],
      });
    case "poligono":
      return new paper.Path.RegularPolygon(centro, params.lados, params.diametro / 2);
    case "estrela":
      return new paper.Path.Star(
        centro,
        params.pontas,
        params.diametro / 2,
        (params.diametro / 2) * (params.raioInterno / 100),
      );
    case "engrenagem":
      return engrenagemCaminho(params);
    default:
      return null;
  }
}

export function vestir(item, cor) {
  const tons = paleta();
  item.strokeColor = tons.contorno;
  item.strokeWidth = 0.4;
  item.strokeScaling = false;
  item.fillColor = cor || item.data.cor || proximaCor();
  item.fillColor.alpha = 0.85;
  item.data.cor = cor || item.data.cor;
  return item;
}

// Cria a peça já posicionada e registrada na camada de peças.
export function criar(tipo, posicao, params) {
  const dados = { ...parametrosPadrao(tipo), ...(params || {}) };
  const caminho = desenhar(tipo, dados);
  if (!caminho) return null;
  caminho.data = { tipo, params: dados, rotacao: 0, cor: proximaCor(), negativo: false };
  cena.camadaPecas.addChild(caminho);
  caminho.position = posicao;
  vestir(caminho, caminho.data.cor);
  return caminho;
}

// Refaz a peça quando um parâmetro muda, mantendo posição e giro.
export function regerar(item, novosParams) {
  if (!item.data || !DEFINICOES[item.data.tipo]) return item;
  const params = { ...item.data.params, ...novosParams };
  const posicao = item.position;
  const giro = item.data.rotacao || 0;
  const novo = desenhar(item.data.tipo, params);
  if (!novo) return item;
  novo.data = { ...item.data, params };
  cena.camadaPecas.insertChild(item.index, novo);
  novo.position = posicao;
  if (giro) novo.rotate(giro, posicao);
  vestir(novo, item.data.negativo ? null : item.data.cor);
  if (item.data.negativo) marcarNegativo(novo, true);
  item.remove();
  return novo;
}

export function marcarNegativo(item, ligado) {
  item.data.negativo = Boolean(ligado);
  if (ligado) {
    item.strokeColor = NEGATIVO_CONTORNO;
    item.fillColor = NEGATIVO_PREENCHIMENTO;
    item.fillColor.alpha = 0.75;
    item.dashArray = [2, 1.4];
  } else {
    item.dashArray = null;
    vestir(item, item.data.cor);
  }
  return item;
}

const NEGATIVO_CONTORNO = "#e03131";
const NEGATIVO_PREENCHIMENTO = "#ff9f43";

// Converte forma paramétrica (ou texto) em caminho editável.
export function converterEmCaminho(item) {
  if (!item.data || item.data.tipo === "caminho") return item;
  item.data = { ...item.data, tipo: "caminho", params: {} };
  return item;
}
