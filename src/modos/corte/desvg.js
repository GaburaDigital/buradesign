// Ler um SVG e tirar dele contornos em milímetros.
//
// Serve para duas coisas: trazer um desenho da bolsa para gravar numa peça, e
// importar um arquivo SVG como peça de corte. Nos dois casos o que interessa
// é a mesma coisa — uma lista de voltas fechadas, em reta, do tamanho certo.
//
// O SVGLoader do Three já vem junto com a biblioteca e entende curva, arco e
// transformação, que é o trabalho chato. O que ele não faz é cuidar da
// unidade: um SVG pode estar em pixel, em ponto ou em milímetro, e no chão da
// oficina isso é a diferença entre uma peça e uma miniatura.

import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

// Quantos pontos por curva. O mesmo critério da gravação: reta o bastante
// para a cortadora e leve o bastante para o navegador da escola.
const PONTOS_DA_CURVA = 16;

// O SVG conta o y para baixo; a chapa conta para cima.
function virar(contornos, altura) {
  return contornos.map((volta) => volta.map(([x, y]) => [x, altura - y]));
}

function medir(contornos) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const volta of contornos) {
    for (const [x, y] of volta) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY, largura: maxX - minX, altura: maxY - minY };
}

// Quanto vale uma unidade do SVG em milímetro. Um arquivo que diz
// width="120mm" e viewBox="0 0 120 120" está em milímetro; um que diz
// width="600" está em pixel, e aí vale a conversão de 96 pontos por polegada.
export function escalaEmMilimetros(texto) {
  const largura = /\bwidth\s*=\s*"([^"]+)"/i.exec(texto);
  const caixa = /\bviewBox\s*=\s*"([^"]+)"/i.exec(texto);
  if (!largura || !caixa) return { escala: 25.4 / 96, motivo: "sem medida no arquivo: tratei como pixel" };
  const partes = caixa[1].trim().split(/[\s,]+/).map(Number);
  const larguraDaCaixa = partes[2];
  if (!larguraDaCaixa) return { escala: 25.4 / 96, motivo: "viewBox ilegível: tratei como pixel" };
  const valor = parseFloat(largura[1]);
  if (!Number.isFinite(valor)) return { escala: 25.4 / 96, motivo: "largura ilegível: tratei como pixel" };
  const unidade = (largura[1].match(/[a-z%]+$/i) || [""])[0].toLowerCase();
  const emMm = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96, "": 25.4 / 96 }[
    unidade
  ];
  if (!emMm) return { escala: 25.4 / 96, motivo: `unidade "${unidade}" desconhecida: tratei como pixel` };
  return { escala: (valor * emMm) / larguraDaCaixa, motivo: null };
}

// Todos os contornos do arquivo, já em milímetros e com o y para cima.
export function contornosDoSVG(texto) {
  const loader = new SVGLoader();
  const dados = loader.parse(texto);
  const { escala, motivo } = escalaEmMilimetros(texto);

  const contornos = [];
  for (const caminho of dados.paths) {
    for (const trecho of caminho.subPaths) {
      const pontos = trecho.getPoints(PONTOS_DA_CURVA);
      if (pontos.length < 3) continue;
      const volta = pontos.map((p) => [p.x * escala, p.y * escala]);
      // Ponto repetido no fim é comum e atrapalha a conta de área.
      const primeiro = volta[0];
      const ultimo = volta[volta.length - 1];
      if (Math.abs(primeiro[0] - ultimo[0]) < 1e-6 && Math.abs(primeiro[1] - ultimo[1]) < 1e-6) {
        volta.pop();
      }
      if (volta.length >= 3) contornos.push(volta);
    }
  }
  if (!contornos.length) return { contornos: [], medida: null, motivo: "não achei desenho nenhum" };

  const bruto = medir(contornos);
  const encostado = contornos.map((volta) => volta.map(([x, y]) => [x - bruto.minX, y - bruto.minY]));
  const virados = virar(encostado, bruto.altura);
  return { contornos: virados, medida: medir(virados), motivo };
}

export function areaDe(volta) {
  let soma = 0;
  for (let i = 0; i < volta.length; i += 1) {
    const [x1, y1] = volta[i];
    const [x2, y2] = volta[(i + 1) % volta.length];
    soma += x1 * y2 - x2 * y1;
  }
  return soma / 2;
}

function dentroDe(volta, ponto) {
  let dentro = false;
  for (let i = 0, j = volta.length - 1; i < volta.length; j = i, i += 1) {
    const [xi, yi] = volta[i];
    const [xj, yj] = volta[j];
    if (yi > ponto[1] !== yj > ponto[1]) {
      if (ponto[0] < ((xj - xi) * (ponto[1] - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
  }
  return dentro;
}

// Separa o que é contorno de fora e o que é buraco. Um desenho dentro de
// outro é buraco; dois lado a lado são duas peças.
export function separarEmPecas(contornos) {
  const ordenados = [...contornos].sort((a, b) => Math.abs(areaDe(b)) - Math.abs(areaDe(a)));
  const pecas = [];
  for (const volta of ordenados) {
    const meio = volta[0];
    const dono = pecas.find((peca) => dentroDe(peca.contorno, meio));
    if (dono) dono.furos.push(volta);
    else pecas.push({ contorno: volta, furos: [] });
  }
  return pecas;
}
