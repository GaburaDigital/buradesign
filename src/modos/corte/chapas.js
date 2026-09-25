// A chapa: um retângulo de material com espessura, plantado no espaço.
//
// A montagem só trabalha com chapas alinhadas aos eixos. Não é limitação de
// preguiça: é o que a cortadora entende e o que o aluno consegue montar de
// verdade com cola e fita. Cada chapa sabe o seu próprio plano, e é daí que
// saem as juntas, a planificação e o plano de corte.

export const PLANOS = {
  XZ: { u: "x", v: "z", n: "y", nome: "Deitada", rotuloU: "Largura", rotuloV: "Profundidade" },
  XY: { u: "x", v: "y", n: "z", nome: "Em pé, de frente", rotuloU: "Largura", rotuloV: "Altura" },
  YZ: { u: "z", v: "y", n: "x", nome: "Em pé, de lado", rotuloU: "Profundidade", rotuloV: "Altura" },
};

export const BORDAS = ["u0", "u1", "v0", "v1"];

let contador = 0;

export function novaChapa({ plano = "XY", largura = 80, altura = 60, centro, nome } = {}) {
  contador += 1;
  return {
    id: `chapa${contador}`,
    nome: nome || `Chapa ${contador}`,
    plano: PLANOS[plano] ? plano : "XY",
    largura,
    altura,
    centro: { x: 0, y: altura / 2, z: 0, ...(centro || {}) },
  };
}

export function reiniciarContagem(quantas = 0) {
  contador = quantas;
}

// Onde a chapa começa e termina em cada eixo do mundo.
export function extensao(chapa, espessura) {
  const plano = PLANOS[chapa.plano];
  const tamanho = { x: 0, y: 0, z: 0 };
  tamanho[plano.u] = chapa.largura;
  tamanho[plano.v] = chapa.altura;
  tamanho[plano.n] = espessura;
  return {
    min: {
      x: chapa.centro.x - tamanho.x / 2,
      y: chapa.centro.y - tamanho.y / 2,
      z: chapa.centro.z - tamanho.z / 2,
    },
    max: {
      x: chapa.centro.x + tamanho.x / 2,
      y: chapa.centro.y + tamanho.y / 2,
      z: chapa.centro.z + tamanho.z / 2,
    },
    tamanho,
  };
}

// Do mundo para a folha: (0,0) é o canto de baixo à esquerda da chapa.
export function paraLocal(chapa, eixo, valorNoMundo) {
  const plano = PLANOS[chapa.plano];
  if (eixo === plano.u) return valorNoMundo - (chapa.centro[plano.u] - chapa.largura / 2);
  if (eixo === plano.v) return valorNoMundo - (chapa.centro[plano.v] - chapa.altura / 2);
  return valorNoMundo - chapa.centro[plano.n];
}

// A caixa pronta: seis chapas (ou cinco, sem tampa) já no lugar certo, com as
// faces de fora coincidindo com a medida pedida. É o caminho rápido da aula —
// depois o aluno mexe em cada chapa como quiser.
export function montarCaixa({
  largura = 120,
  altura = 80,
  profundidade = 90,
  espessura = 3,
  comTampa = false,
} = {}) {
  const e = espessura;
  const L = Math.max(4 * e, largura);
  const A = Math.max(3 * e, altura);
  const P = Math.max(4 * e, profundidade);
  const chapas = [];

  const por = (nome, plano, larg, alt, centro) =>
    chapas.push(novaChapa({ nome, plano, largura: larg, altura: alt, centro }));

  // Frente e trás pegam a largura inteira: são elas que fecham os cantos.
  por("Frente", "XY", L, A, { x: 0, y: A / 2, z: P / 2 - e / 2 });
  por("Trás", "XY", L, A, { x: 0, y: A / 2, z: -P / 2 + e / 2 });
  // As laterais entram entre a frente e a trás.
  por("Lateral direita", "YZ", P - 2 * e, A, { x: L / 2 - e / 2, y: A / 2, z: 0 });
  por("Lateral esquerda", "YZ", P - 2 * e, A, { x: -L / 2 + e / 2, y: A / 2, z: 0 });
  // O fundo entra entre as quatro paredes.
  por("Fundo", "XZ", L - 2 * e, P - 2 * e, { x: 0, y: e / 2, z: 0 });
  if (comTampa) {
    por("Tampa", "XZ", L - 2 * e, P - 2 * e, { x: 0, y: A - e / 2, z: 0 });
  }
  return chapas;
}

export function medidasDaCaixa(chapas, espessura) {
  if (!chapas.length) return { largura: 0, altura: 0, profundidade: 0 };
  let min = { x: Infinity, y: Infinity, z: Infinity };
  let max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const chapa of chapas) {
    const caixa = extensao(chapa, espessura);
    for (const eixo of ["x", "y", "z"]) {
      min[eixo] = Math.min(min[eixo], caixa.min[eixo]);
      max[eixo] = Math.max(max[eixo], caixa.max[eixo]);
    }
  }
  return {
    largura: max.x - min.x,
    altura: max.y - min.y,
    profundidade: max.z - min.z,
  };
}
