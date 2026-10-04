// Gravação: o que fica marcado na peça sem cortar ela.
//
// Uma marca é sempre uma lista de contornos em milímetros, nas coordenadas da
// própria chapa. De onde ela veio — de um texto digitado ou de um desenho da
// bolsa — fica guardado junto, para o aluno poder voltar e editar em vez de
// refazer do zero.
//
// No plano de corte a gravação sai numa cor só dela. Isso não é enfeite: a
// cortadora lê a cor para saber o que é corte e o que é risco. Gravação
// cortada por engano é peça perdida.

const GRAU = Math.PI / 180;

// --- Texto ---------------------------------------------------------------

// O caminho que o opentype devolve vem em curvas. A cortadora corta reta, e o
// arranjo e a prévia também só sabem lidar com reta, então cada curva vira
// uma sequência de pedacinhos. Doze por curva é mais que suficiente numa
// letra de 20 mm: o olho não vê o canto.
const PEDACOS_DA_CURVA = 12;

function bezierCubica(p0, p1, p2, p3, saida) {
  for (let i = 1; i <= PEDACOS_DA_CURVA; i += 1) {
    const t = i / PEDACOS_DA_CURVA;
    const u = 1 - t;
    saida.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
}

function bezierQuadratica(p0, p1, p2, saida) {
  for (let i = 1; i <= PEDACOS_DA_CURVA; i += 1) {
    const t = i / PEDACOS_DA_CURVA;
    const u = 1 - t;
    saida.push([
      u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
      u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ]);
  }
}

// Do caminho do opentype para contornos fechados de pontos.
export function contornosDoCaminho(comandos) {
  const contornos = [];
  let atual = null;
  let caneta = [0, 0];
  for (const passo of comandos) {
    if (passo.type === "M") {
      if (atual && atual.length > 2) contornos.push(atual);
      caneta = [passo.x, passo.y];
      atual = [caneta];
    } else if (passo.type === "L") {
      caneta = [passo.x, passo.y];
      atual?.push(caneta);
    } else if (passo.type === "C") {
      const fim = [passo.x, passo.y];
      if (atual) bezierCubica(caneta, [passo.x1, passo.y1], [passo.x2, passo.y2], fim, atual);
      caneta = fim;
    } else if (passo.type === "Q") {
      const fim = [passo.x, passo.y];
      if (atual) bezierQuadratica(caneta, [passo.x1, passo.y1], fim, atual);
      caneta = fim;
    } else if (passo.type === "Z") {
      if (atual && atual.length > 2) contornos.push(atual);
      atual = null;
    }
  }
  if (atual && atual.length > 2) contornos.push(atual);
  return contornos;
}

// A fonte desenha com o y para baixo, como toda tipografia. A chapa conta o y
// para cima. Sem virar, o texto sai de cabeça para baixo na peça.
export function virarParaCima(contornos) {
  return contornos.map((volta) => volta.map(([x, y]) => [x, -y]));
}

// --- Medidas e transformações -------------------------------------------

export function limitesDe(contornos) {
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
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, largura: 0, altura: 0 };
  return { minX, minY, maxX, maxY, largura: maxX - minX, altura: maxY - minY };
}

// Encosta o desenho no zero e centra ele na origem, para girar em volta do
// próprio meio e não de um canto qualquer.
export function centrarNaOrigem(contornos) {
  const m = limitesDe(contornos);
  const meioX = (m.minX + m.maxX) / 2;
  const meioY = (m.minY + m.maxY) / 2;
  return contornos.map((volta) => volta.map(([x, y]) => [x - meioX, y - meioY]));
}

// Põe o desenho no lugar pedido da chapa, no tamanho, no giro e no espelho.
export function posicionar(contornos, { x = 0, y = 0, escala = 1, giro = 0, espelhado = false }) {
  const c = Math.cos(giro * GRAU);
  const s = Math.sin(giro * GRAU);
  return contornos.map((volta) =>
    volta.map(([px, py]) => {
      const ex = (espelhado ? -px : px) * escala;
      const ey = py * escala;
      return [x + ex * c - ey * s, y + ex * s + ey * c];
    }),
  );
}

// --- Preenchimento riscado ----------------------------------------------

// Risca o desenho com linhas paralelas, para a gravação sair cheia em vez de
// só contornada. É o mesmo truque de hachura de desenho técnico: linha que
// entra no desenho, linha que sai, e o que fica no meio é risco.
export function riscarPorDentro(contornos, passo = 0.8, angulo = 45) {
  if (!contornos.length || passo <= 0) return [];
  const c = Math.cos(-angulo * GRAU);
  const s = Math.sin(-angulo * GRAU);
  const girado = contornos.map((volta) => volta.map(([x, y]) => [x * c - y * s, x * s + y * c]));
  const m = limitesDe(girado);
  const riscos = [];
  const arestas = [];
  for (const volta of girado) {
    for (let i = 0; i < volta.length; i += 1) {
      arestas.push([volta[i], volta[(i + 1) % volta.length]]);
    }
  }
  // Uma linha por passo. Em cada uma, os cruzamentos com as arestas vêm aos
  // pares: entra no desenho, sai do desenho.
  const voltar = ([x, y]) => [x * c + y * s, -x * s + y * c];
  for (let y = m.minY + passo / 2; y < m.maxY; y += passo) {
    const cruzes = [];
    for (const [a, b] of arestas) {
      if (a[1] === b[1]) continue;
      const dentro = (a[1] > y) !== (b[1] > y);
      if (!dentro) continue;
      cruzes.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    cruzes.sort((p, q) => p - q);
    for (let i = 0; i + 1 < cruzes.length; i += 2) {
      if (cruzes[i + 1] - cruzes[i] < 0.05) continue;
      riscos.push([voltar([cruzes[i], y]), voltar([cruzes[i + 1], y])]);
    }
  }
  return riscos;
}

// --- A marca pronta ------------------------------------------------------

let contador = 0;

export function novaMarca(dados) {
  contador += 1;
  return {
    id: `marca${contador}`,
    tipo: "texto",
    x: 0,
    y: 0,
    escala: 1,
    giro: 0,
    espelhado: false,
    // Em que face da chapa a gravação mora. O plano de corte desenha a peça
    // vista pela frente, então o que for gravado atrás sai espelhado — como
    // acontece de verdade quando a peça é virada na mesa da máquina.
    lado: "frente",
    preenchido: false,
    passoDoRisco: 0.8,
    base: [],
    ...dados,
  };
}

// Os traços que a marca vira na chapa, prontos para o SVG e para a prévia.
//
// `comoFica`: "plano" devolve do jeito que vai para a cortadora (a peça
// deitada, vista pela frente, então o que é de trás sai espelhado) e "aqui"
// devolve do jeito que se vê naquela face, para a prévia e para o 3D.
export function tracosDaMarca(marca, comoFica = "plano", largura = 0) {
  const vira = comoFica === "plano" && marca.lado === "tras" && largura > 0;
  const posto = posicionar(marca.base, vira ? { ...marca, x: largura - marca.x, espelhado: !marca.espelhado } : marca);
  if (!marca.preenchido) return posto;
  return [...posto, ...riscarPorDentro(posto, marca.passoDoRisco || 0.8)];
}

export function tracosDasMarcas(marcas, comoFica = "plano", largura = 0) {
  const saida = [];
  for (const marca of marcas || []) saida.push(...tracosDaMarca(marca, comoFica, largura));
  return saida;
}

// A marca cabe dentro da peça? Um risco fora do contorno vira corte perdido,
// e um risco em cima de um dente estraga o encaixe.
export function marcaEscapa(marca, contorno) {
  const dentro = (ponto) => {
    let sim = false;
    for (let i = 0, j = contorno.length - 1; i < contorno.length; j = i, i += 1) {
      const [xi, yi] = contorno[i];
      const [xj, yj] = contorno[j];
      if (yi > ponto[1] !== yj > ponto[1]) {
        if (ponto[0] < ((xj - xi) * (ponto[1] - yi)) / (yj - yi) + xi) sim = !sim;
      }
    }
    return sim;
  };
  for (const volta of posicionar(marca.base, marca)) {
    for (const ponto of volta) if (!dentro(ponto)) return true;
  }
  return false;
}
