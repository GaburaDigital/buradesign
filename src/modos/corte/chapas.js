// A chapa: um retângulo de material com espessura, plantado no espaço.
//
// A chapa tem um quadro próprio: u é a largura dela, v é a altura, n é a
// espessura. Onde esse quadro aponta no mundo é o "giro", em graus, na mesma
// ordem que o Three usa (X, depois Y, depois Z). Plantar deitada, em pé de
// frente ou em pé de lado é só um giro pronto — por baixo é tudo a mesma coisa.
//
// Até a fase 4 a chapa só podia ficar alinhada aos eixos. Agora ela gira para
// qualquer lado, porque prisma, pirâmide e dodecaedro têm parede em ângulo. O
// que ainda depende de alinhamento é o detector de juntas, e ele avisa quando
// não dá conta em vez de inventar encaixe errado.

export const PLANOS = {
  XZ: { u: "x", v: "z", n: "y", nome: "Deitada", rotuloU: "Largura", rotuloV: "Profundidade" },
  XY: { u: "x", v: "y", n: "z", nome: "Em pé, de frente", rotuloU: "Largura", rotuloV: "Altura" },
  YZ: { u: "z", v: "y", n: "x", nome: "Em pé, de lado", rotuloU: "Profundidade", rotuloV: "Altura" },
};

// O giro que põe o quadro da chapa em cada um dos três planos prontos.
export const GIRO_DO_PLANO = {
  XY: { x: 0, y: 0, z: 0 },
  XZ: { x: 90, y: 0, z: 0 },
  YZ: { x: 0, y: -90, z: 0 },
};

export const BORDAS = ["u0", "u1", "v0", "v1"];

const GRAU = Math.PI / 180;
const ALINHADO = 1e-6;

let contador = 0;

export function novaChapa({
  plano = "XY",
  largura = 80,
  altura = 60,
  centro,
  giro,
  grupo = null,
  nome,
} = {}) {
  contador += 1;
  const escolhido = PLANOS[plano] ? plano : "XY";
  return {
    id: `chapa${contador}`,
    nome: nome || `Chapa ${contador}`,
    plano: escolhido,
    largura,
    altura,
    centro: { x: 0, y: altura / 2, z: 0, ...(centro || {}) },
    giro: { ...GIRO_DO_PLANO[escolhido], ...(giro || {}) },
    grupo,
  };
}

export function reiniciarContagem(quantas = 0) {
  contador = quantas;
}

// --- Quadro da chapa no mundo -------------------------------------------

// Matriz de rotação na ordem X, Y, Z, guardada por linha. É a mesma conta que
// o THREE.Euler de ordem "XYZ" faz, de propósito: a malha na tela e a conta
// aqui precisam concordar até o último milímetro.
export function matrizDoGiro(giro = { x: 0, y: 0, z: 0 }) {
  const a = Math.cos((giro.x || 0) * GRAU);
  const b = Math.sin((giro.x || 0) * GRAU);
  const c = Math.cos((giro.y || 0) * GRAU);
  const d = Math.sin((giro.y || 0) * GRAU);
  const e = Math.cos((giro.z || 0) * GRAU);
  const f = Math.sin((giro.z || 0) * GRAU);
  return [
    [c * e, -c * f, d],
    [a * f + b * d * e, a * e - b * d * f, -b * c],
    [b * f - a * d * e, b * e + a * d * f, a * c],
  ];
}

// De volta para graus. Serve para compor giros: gira a matriz, lê o giro.
export function giroDaMatriz(m) {
  const seno = Math.min(1, Math.max(-1, m[0][2]));
  const y = Math.asin(seno);
  let x;
  let z;
  if (Math.abs(m[0][2]) < 0.9999999) {
    x = Math.atan2(-m[1][2], m[2][2]);
    z = Math.atan2(-m[0][1], m[0][0]);
  } else {
    x = Math.atan2(m[2][1], m[1][1]);
    z = 0;
  }
  const limpo = (radianos) => {
    const graus = radianos / GRAU;
    // Meio grau de sujeira numérica vira um giro torto no painel.
    const perto = Math.round(graus * 1000) / 1000;
    return Object.is(perto, -0) ? 0 : perto;
  };
  return { x: limpo(x), y: limpo(y), z: limpo(z) };
}

export function multiplicar(m, n) {
  const saida = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      saida[i][j] = m[i][0] * n[0][j] + m[i][1] * n[1][j] + m[i][2] * n[2][j];
    }
  }
  return saida;
}

// Os três eixos da chapa, em coordenadas do mundo.
export function eixosDaChapa(chapa) {
  const m = matrizDoGiro(chapa.giro);
  return {
    u: [m[0][0], m[1][0], m[2][0]],
    v: [m[0][1], m[1][1], m[2][1]],
    n: [m[0][2], m[1][2], m[2][2]],
  };
}

const LETRAS = ["x", "y", "z"];

function eixoDoMundo(vetor) {
  for (let i = 0; i < 3; i += 1) {
    const valor = vetor[i];
    if (Math.abs(Math.abs(valor) - 1) > ALINHADO) continue;
    const resto = vetor.filter((_, j) => j !== i).every((outro) => Math.abs(outro) < ALINHADO);
    if (resto) return { eixo: LETRAS[i], sinal: valor > 0 ? 1 : -1 };
  }
  return null;
}

// Quando a chapa está alinhada aos eixos do mundo, diz qual eixo corresponde a
// cada direção dela e em que sentido. Fora disso devolve null, e quem chamou
// precisa tratar a chapa como "em ângulo".
export function quadro(chapa) {
  const eixos = eixosDaChapa(chapa);
  const u = eixoDoMundo(eixos.u);
  const v = eixoDoMundo(eixos.v);
  const n = eixoDoMundo(eixos.n);
  if (!u || !v || !n) return null;
  return {
    porLocal: { u, v, n },
    porEixo: { [u.eixo]: "u", [v.eixo]: "v", [n.eixo]: "n" },
  };
}

export function alinhada(chapa) {
  return quadro(chapa) !== null;
}

export function rotulosDaChapa(chapa) {
  const q = quadro(chapa);
  if (!q) return { rotuloU: "Largura", rotuloV: "Altura" };
  const nomes = { x: "Largura", y: "Altura", z: "Profundidade" };
  return { rotuloU: nomes[q.porLocal.u.eixo], rotuloV: nomes[q.porLocal.v.eixo] };
}

// O tamanho da chapa em cada direção dela.
function tamanhoLocal(chapa, espessura) {
  return { u: chapa.largura, v: chapa.altura, n: espessura };
}

// Os oito cantos da chapa no mundo. Vale para qualquer giro.
export function cantos(chapa, espessura) {
  const eixos = eixosDaChapa(chapa);
  const meio = tamanhoLocal(chapa, espessura);
  const lista = [];
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      for (const sn of [-1, 1]) {
        lista.push({
          x:
            chapa.centro.x +
            (eixos.u[0] * su * meio.u + eixos.v[0] * sv * meio.v + eixos.n[0] * sn * meio.n) / 2,
          y:
            chapa.centro.y +
            (eixos.u[1] * su * meio.u + eixos.v[1] * sv * meio.v + eixos.n[1] * sn * meio.n) / 2,
          z:
            chapa.centro.z +
            (eixos.u[2] * su * meio.u + eixos.v[2] * sv * meio.v + eixos.n[2] * sn * meio.n) / 2,
        });
      }
    }
  }
  return lista;
}

// Onde a chapa começa e termina em cada eixo do mundo. Para chapa alinhada dá
// exatamente a medida dela; para chapa em ângulo dá a caixa que a envolve.
export function extensao(chapa, espessura) {
  const pontas = cantos(chapa, espessura);
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const ponto of pontas) {
    for (const eixo of LETRAS) {
      min[eixo] = Math.min(min[eixo], ponto[eixo]);
      max[eixo] = Math.max(max[eixo], ponto[eixo]);
    }
  }
  return {
    min,
    max,
    tamanho: { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z },
  };
}

// Do mundo para a régua da chapa: (0,0) é o canto de baixo à esquerda dela.
// Só faz sentido em chapa alinhada, que é onde o detector de juntas trabalha.
export function paraLocal(chapa, eixoDoMundoPedido, valorNoMundo, espessura = 0) {
  const q = quadro(chapa);
  if (!q) return valorNoMundo;
  const letra = q.porEixo[eixoDoMundoPedido];
  if (!letra) return valorNoMundo;
  const { sinal } = q.porLocal[letra];
  const comprimento = tamanhoLocal(chapa, espessura)[letra];
  const meio = chapa.centro[eixoDoMundoPedido];
  const inicio = meio - comprimento / 2;
  const fim = meio + comprimento / 2;
  return sinal > 0 ? valorNoMundo - inicio : fim - valorNoMundo;
}

// --- Mexer nas chapas ---------------------------------------------------

export function moverChapas(lista, delta) {
  for (const chapa of lista) {
    chapa.centro.x += delta.x || 0;
    chapa.centro.y += delta.y || 0;
    chapa.centro.z += delta.z || 0;
  }
  return lista;
}

// Gira um conjunto de chapas em torno de um ponto do mundo. Cada chapa gira em
// volta de si mesma e viaja em volta do ponto, que é o que faz um grupo girar
// inteiro em vez de explodir.
export function girarChapas(lista, eixo, graus, pivo) {
  if (!graus) return lista;
  return aplicarGiroDoMundo(lista, matrizDoGiro({ x: 0, y: 0, z: 0, [eixo]: graus }), pivo);
}

// A mesma coisa, mas recebendo a rotação pronta. A garra do 3D entrega um
// giro em qualquer direção, que não cabe em "tantos graus num eixo".
export function aplicarGiroDoMundo(lista, giroDoMundo, pivo) {
  for (const chapa of lista) {
    const dx = chapa.centro.x - pivo.x;
    const dy = chapa.centro.y - pivo.y;
    const dz = chapa.centro.z - pivo.z;
    chapa.centro = {
      x: pivo.x + giroDoMundo[0][0] * dx + giroDoMundo[0][1] * dy + giroDoMundo[0][2] * dz,
      y: pivo.y + giroDoMundo[1][0] * dx + giroDoMundo[1][1] * dy + giroDoMundo[1][2] * dz,
      z: pivo.z + giroDoMundo[2][0] * dx + giroDoMundo[2][1] * dy + giroDoMundo[2][2] * dz,
    };
    chapa.giro = giroDaMatriz(multiplicar(giroDoMundo, matrizDoGiro(chapa.giro)));
  }
  return lista;
}

export function centroDasChapas(lista, espessura = 0) {
  if (!lista.length) return { x: 0, y: 0, z: 0 };
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const chapa of lista) {
    const caixa = extensao(chapa, espessura);
    for (const eixo of LETRAS) {
      min[eixo] = Math.min(min[eixo], caixa.min[eixo]);
      max[eixo] = Math.max(max[eixo], caixa.max[eixo]);
    }
  }
  return { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
}

// --- Caixa pronta --------------------------------------------------------

// Seis chapas (ou cinco, sem tampa) já no lugar certo, com as faces de fora
// coincidindo com a medida pedida. É o caminho rápido da aula — depois o aluno
// mexe em cada chapa como quiser.
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
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const chapa of chapas) {
    const caixa = extensao(chapa, espessura);
    for (const eixo of LETRAS) {
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
