// Atalhos para escrever gabarito de desafio sem afogar o arquivo em JSON.
//
// Um gabarito é um programa em blocos que resolve a missão. Ele nunca é
// comparado com o programa do aluno — serve para o teste automático provar
// que as medidas pedidas são alcançáveis, e para o botão "ver a peça pronta"
// mostrar onde se quer chegar.

export const n = (valor) => ({ shadow: { type: "bura_numero", fields: { NUM: valor } } });

// Encadeia blocos um embaixo do outro.
export function fila(...lista) {
  const copia = lista.filter(Boolean).map((bloco) => ({ ...bloco }));
  for (let i = copia.length - 2; i >= 0; i -= 1) copia[i].next = { block: copia[i + 1] };
  return copia[0];
}

export const programa = (topo, extras = [], variaveis = []) => ({
  ...(variaveis.length ? { variables: variaveis } : {}),
  blocks: {
    languageVersion: 0,
    blocks: [{ type: "bura_inicio", x: 40, y: 40, next: { block: topo } }, ...extras],
  },
});

// --- formas ---
export const cubo = (lado) => ({ type: "bura_cubo", inputs: { LADO: n(lado) } });
export const caixa = (l, a, p) => ({ type: "bura_cuboide", inputs: { L: n(l), A: n(a), P: n(p) } });
export const cilindro = (d, a) => ({ type: "bura_cilindro", inputs: { D: n(d), A: n(a) } });
export const esfera = (d) => ({ type: "bura_esfera", inputs: { D: n(d) } });
export const meiaEsfera = (r) => ({ type: "bura_meia_esfera", inputs: { R: n(r) } });
export const cone = (d, a) => ({ type: "bura_cone", inputs: { D: n(d), A: n(a) } });
export const prisma = (lados, l, a) => ({
  type: "bura_prisma",
  inputs: { N: n(lados), L: n(l), A: n(a) },
});
export const piramide = (lados, l, a) => ({
  type: "bura_piramide",
  inputs: { N: n(lados), L: n(l), A: n(a) },
});
export const estrela = (pontas, l, a) => ({
  type: "bura_estrela",
  inputs: { N: n(pontas), L: n(l), A: n(a) },
});
export const anel = (d, a, furo) => ({
  type: "bura_anel",
  inputs: { D: n(d), A: n(a), F: n(furo) },
});
export const engrenagem = (dentes, d, a) => ({
  type: "bura_engrenagem",
  inputs: { N: n(dentes), D: n(d), A: n(a) },
});
export const torus = (d, g) => ({ type: "bura_torus", inputs: { D: n(d), G: n(g) } });

// --- ponteiro ---
export const mover = (x, y, z) => ({ type: "bura_mover", inputs: { X: n(x), Y: n(y), Z: n(z) } });
export const irPara = (x, y, z) => ({ type: "bura_ir_para", inputs: { X: n(x), Y: n(y), Z: n(z) } });
export const girar = (eixo, graus) => ({
  type: "bura_girar",
  fields: { EIXO: eixo },
  inputs: { ANGULO: n(graus) },
});
export const apontar = (eixo, graus) => ({
  type: "bura_apontar",
  fields: { EIXO: eixo },
  inputs: { ANGULO: n(graus) },
});
export const centro = () => ({ type: "bura_centro" });
export const pivoGirar = (eixo, graus) => ({
  type: "bura_pivo_girar",
  fields: { EIXO: eixo },
  inputs: { ANGULO: n(graus) },
});
export const pivoApontar = (eixo, graus) => ({
  type: "bura_pivo_apontar",
  fields: { EIXO: eixo },
  inputs: { ANGULO: n(graus) },
});
export const avancar = (passos) => ({ type: "bura_avancar", inputs: { PASSOS: n(passos) } });
export const virarComoPivo = () => ({ type: "bura_virar_como_pivo" });

// --- controle e contas ---
export const repetir = (vezes, dentro) => ({
  type: "bura_repetir",
  inputs: { N: n(vezes), DENTRO: { block: dentro } },
});
export const contador = () => ({ block: { type: "bura_contador" } });
export const conta = (a, op, b) => ({
  block: { type: "bura_conta", fields: { OP: op }, inputs: { A: a, B: b } },
});
export const pegar = (id) => ({ block: { type: "variables_get", fields: { VAR: { id } } } });
export const definirVar = (id, valor) => ({
  type: "variables_set",
  fields: { VAR: { id } },
  inputs: { VALUE: valor },
});
export const somarVar = (id, quanto) => ({
  type: "math_change",
  fields: { VAR: { id } },
  inputs: { DELTA: quanto },
});
export const paraCada = (id, de, ate, passo, dentro) => ({
  type: "controls_for",
  fields: { VAR: { id } },
  inputs: { FROM: de, TO: ate, BY: passo, DO: { block: dentro } },
});
export const se = (condicao, entao, senao) => ({
  type: "controls_if",
  ...(senao ? { extraState: { hasElse: true } } : {}),
  inputs: {
    IF0: condicao,
    DO0: { block: entao },
    ...(senao ? { ELSE: { block: senao } } : {}),
  },
});
export const comparar = (a, op, b) => ({
  block: { type: "bura_comparar", fields: { OP: op }, inputs: { A: a, B: b } },
});

// --- combinar e pintar ---
export const negativa = () => ({ type: "bura_negativa" });
export const combinar = () => ({ type: "bura_combinar" });
export const pousar = () => ({ type: "bura_pousar" });
export const travar = () => ({ type: "bura_travar" });
export const pintar = (cor) => ({ type: "bura_pintar", fields: { COR: cor } });

// --- procedimentos ---
export const definirBloco = (nome, corpo, { x = 460, y = 40, params = [] } = {}) => ({
  type: "procedures_defnoreturn",
  x,
  y,
  fields: { NAME: nome },
  extraState: { params },
  inputs: { STACK: { block: corpo } },
});
export const chamarBloco = (nome, args = []) => ({
  type: "procedures_callnoreturn",
  extraState: { name: nome, params: args.map((arg) => arg.nome) },
  ...(args.length
    ? { inputs: Object.fromEntries(args.map((arg, i) => [`ARG${i}`, arg.valor])) }
    : {}),
});
