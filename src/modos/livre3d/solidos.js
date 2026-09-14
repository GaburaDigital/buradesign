// Sólidos rígidos. Cada um nasce dos seus parâmetros em milímetros e pode ser
// refeito quando o usuário muda um número, mantendo posição, giro e cor.
// A régua é a mesma do 2D: uma unidade do Three.js é um milímetro.

import * as THREE from "three";

export const DEFINICOES = {
  cubo: {
    nome: "Cubo",
    params: { lado: { rotulo: "Lado", padrao: 20, min: 1, max: 1000 } },
  },
  cuboide: {
    nome: "Cuboide",
    params: {
      largura: { rotulo: "Largura", padrao: 40, min: 1, max: 1000 },
      altura: { rotulo: "Altura", padrao: 20, min: 1, max: 1000 },
      profundidade: { rotulo: "Profundidade", padrao: 25, min: 1, max: 1000 },
    },
  },
  esfera: {
    nome: "Esfera",
    params: { diametro: { rotulo: "Diâmetro", padrao: 24, min: 1, max: 1000 } },
  },
  cilindro: {
    nome: "Cilindro",
    params: {
      diametro: { rotulo: "Diâmetro", padrao: 20, min: 1, max: 1000 },
      altura: { rotulo: "Altura", padrao: 30, min: 1, max: 1000 },
    },
  },
  cone: {
    nome: "Cone",
    params: {
      diametro: { rotulo: "Diâmetro da base", padrao: 24, min: 1, max: 1000 },
      altura: { rotulo: "Altura", padrao: 30, min: 1, max: 1000 },
    },
  },
  torus: {
    nome: "Torus",
    params: {
      diametro: { rotulo: "Diâmetro", padrao: 30, min: 2, max: 1000 },
      grossura: { rotulo: "Grossura", padrao: 8, min: 1, max: 500 },
    },
  },
  piramide: {
    nome: "Pirâmide",
    params: {
      lados: { rotulo: "Lados", padrao: 4, min: 3, max: 40, inteiro: true, semUnidade: true },
      largura: { rotulo: "Largura", padrao: 26, min: 1, max: 1000 },
      altura: { rotulo: "Altura", padrao: 30, min: 1, max: 1000 },
    },
  },
  prisma: {
    nome: "Prisma",
    params: {
      lados: { rotulo: "Lados", padrao: 6, min: 3, max: 40, inteiro: true, semUnidade: true },
      largura: { rotulo: "Largura", padrao: 26, min: 1, max: 1000 },
      altura: { rotulo: "Altura", padrao: 30, min: 1, max: 1000 },
    },
  },
  anel: {
    nome: "Anel",
    params: {
      largura: { rotulo: "Diâmetro externo", padrao: 30, min: 2, max: 1000 },
      altura: { rotulo: "Altura", padrao: 10, min: 1, max: 500 },
      furo: { rotulo: "Furo interno", padrao: 16, min: 1, max: 990 },
    },
  },
  prismaEstrela: {
    nome: "Prisma estrela",
    params: {
      pontas: { rotulo: "Pontas", padrao: 5, min: 3, max: 30, inteiro: true, semUnidade: true },
      largura: { rotulo: "Largura", padrao: 30, min: 2, max: 1000 },
      altura: { rotulo: "Altura", padrao: 12, min: 1, max: 500 },
      raioInterno: { rotulo: "Raio interno (%)", padrao: 45, min: 10, max: 90, semUnidade: true },
    },
  },
  dado: {
    nome: "Dado",
    params: {
      lados: { rotulo: "Lados", padrao: 6, min: 4, max: 20, inteiro: true, semUnidade: true },
      tamanho: { rotulo: "Tamanho", padrao: 20, min: 2, max: 500 },
    },
  },
  palitoPicole: {
    nome: "Palito de picolé",
    params: {
      comprimento: { rotulo: "Comprimento", padrao: 114, min: 10, max: 1000 },
      largura: { rotulo: "Largura", padrao: 10, min: 2, max: 200 },
    },
  },
  palitoChurrasco: {
    nome: "Palito de churrasco",
    params: {
      comprimento: { rotulo: "Comprimento", padrao: 200, min: 10, max: 1000 },
      grossura: { rotulo: "Grossura", padrao: 3, min: 1, max: 50 },
      ponta: { rotulo: "Tamanho da ponta", padrao: 12, min: 0, max: 100 },
    },
  },
  engrenagem3d: {
    nome: "Engrenagem",
    params: {
      dentes: { rotulo: "Dentes", padrao: 12, min: 4, max: 60, inteiro: true, semUnidade: true },
      diametro: { rotulo: "Diâmetro", padrao: 40, min: 5, max: 1000 },
      altura: { rotulo: "Altura", padrao: 8, min: 1, max: 500 },
      furo: { rotulo: "Furo central", padrao: 6, min: 0, max: 500 },
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

function formaDaEstrela(pontas, raioExterno, raioInterno) {
  const forma = new THREE.Shape();
  const total = pontas * 2;
  for (let i = 0; i < total; i += 1) {
    const raio = i % 2 === 0 ? raioExterno : raioInterno;
    const angulo = (i / total) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angulo) * raio;
    const y = Math.sin(angulo) * raio;
    if (i === 0) forma.moveTo(x, y);
    else forma.lineTo(x, y);
  }
  forma.closePath();
  return forma;
}

function formaDaEngrenagem(dentes, raioExterno, furo) {
  const alturaDente = raioExterno * 0.18;
  const raioInterno = raioExterno - alturaDente;
  const passo = (Math.PI * 2) / dentes;
  const forma = new THREE.Shape();
  for (let i = 0; i < dentes; i += 1) {
    const base = i * passo;
    const pontos = [
      [raioInterno, base - passo * 0.25],
      [raioExterno, base - passo * 0.15],
      [raioExterno, base + passo * 0.15],
      [raioInterno, base + passo * 0.25],
    ];
    for (const [raio, angulo] of pontos) {
      const x = Math.cos(angulo) * raio;
      const y = Math.sin(angulo) * raio;
      if (i === 0 && raio === raioInterno && angulo < base) forma.moveTo(x, y);
      else forma.lineTo(x, y);
    }
  }
  forma.closePath();
  if (furo > 0 && furo < raioInterno * 1.8) {
    const buraco = new THREE.Path();
    buraco.absarc(0, 0, furo / 2, 0, Math.PI * 2, true);
    forma.holes.push(buraco);
  }
  return forma;
}

function extrudar(forma, altura) {
  const geometria = new THREE.ExtrudeGeometry(forma, {
    depth: altura,
    bevelEnabled: false,
    curveSegments: 24,
  });
  // Extrusão nasce deitada no plano XY: giramos para o Z virar altura em Y.
  geometria.rotateX(-Math.PI / 2);
  geometria.translate(0, altura / 2, 0);
  geometria.center();
  return geometria;
}

// Projeção de caixa para as coordenadas de textura.
// Geometrias vindas de extrusão, de junção manual ou de booleana chegam sem
// UV, e sem UV a textura simplesmente não aparece. Aqui cada triângulo recebe
// a projeção do eixo em que ele mais "olha", com escala em milímetros.
export function aplicarUVsDeCaixa(geometria, milimetrosPorLadrilho = 20) {
  if (!geometria || !geometria.attributes || !geometria.attributes.position) return geometria;
  const plana = geometria.index ? geometria.toNonIndexed() : geometria;
  if (plana !== geometria) {
    geometria.copy(plana);
    plana.dispose?.();
  }
  const posicoes = geometria.attributes.position;
  if (!geometria.attributes.normal) geometria.computeVertexNormals();
  const normais = geometria.attributes.normal;
  const uvs = new Float32Array(posicoes.count * 2);
  const escala = 1 / Math.max(1, milimetrosPorLadrilho);

  for (let i = 0; i < posicoes.count; i += 3) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let k = 0; k < 3; k += 1) {
      nx += Math.abs(normais.getX(i + k));
      ny += Math.abs(normais.getY(i + k));
      nz += Math.abs(normais.getZ(i + k));
    }
    const eixo = nx > ny && nx > nz ? "x" : ny > nz ? "y" : "z";
    for (let k = 0; k < 3; k += 1) {
      const x = posicoes.getX(i + k);
      const y = posicoes.getY(i + k);
      const z = posicoes.getZ(i + k);
      const par = eixo === "x" ? [z, y] : eixo === "y" ? [x, z] : [x, y];
      uvs[(i + k) * 2] = par[0] * escala;
      uvs[(i + k) * 2 + 1] = par[1] * escala;
    }
  }
  geometria.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometria.attributes.uv.needsUpdate = true;
  return geometria;
}

// Devolve a geometria centrada na origem, com Y para cima.
export function geometriaDe(tipo, params) {
  const geometria = montarGeometria(tipo, params);
  return geometria ? aplicarUVsDeCaixa(geometria) : null;
}

function montarGeometria(tipo, params) {
  switch (tipo) {
    case "cubo":
      return new THREE.BoxGeometry(params.lado, params.lado, params.lado);
    case "cuboide":
      return new THREE.BoxGeometry(params.largura, params.altura, params.profundidade);
    case "esfera":
      return new THREE.SphereGeometry(params.diametro / 2, 40, 28);
    case "cilindro":
      return new THREE.CylinderGeometry(params.diametro / 2, params.diametro / 2, params.altura, 40);
    case "cone":
      return new THREE.ConeGeometry(params.diametro / 2, params.altura, 40);
    case "torus":
      return new THREE.TorusGeometry(
        Math.max(0.5, params.diametro / 2 - params.grossura / 2),
        params.grossura / 2,
        20,
        44,
      );
    case "piramide":
      return new THREE.ConeGeometry(params.largura / 2, params.altura, params.lados);
    case "prisma":
      return new THREE.CylinderGeometry(
        params.largura / 2,
        params.largura / 2,
        params.altura,
        params.lados,
      );
    case "anel": {
      const forma = new THREE.Shape();
      forma.absarc(0, 0, params.largura / 2, 0, Math.PI * 2, false);
      const buraco = new THREE.Path();
      buraco.absarc(0, 0, Math.min(params.furo, params.largura - 1) / 2, 0, Math.PI * 2, true);
      forma.holes.push(buraco);
      return extrudar(forma, params.altura);
    }
    case "prismaEstrela":
      return extrudar(
        formaDaEstrela(
          params.pontas,
          params.largura / 2,
          (params.largura / 2) * (params.raioInterno / 100),
        ),
        params.altura,
      );
    case "dado": {
      const raio = params.tamanho / 2;
      if (params.lados <= 4) return new THREE.TetrahedronGeometry(raio);
      if (params.lados <= 6) return new THREE.BoxGeometry(params.tamanho, params.tamanho, params.tamanho);
      if (params.lados <= 8) return new THREE.OctahedronGeometry(raio);
      if (params.lados <= 12) return new THREE.DodecahedronGeometry(raio);
      return new THREE.IcosahedronGeometry(raio);
    }
    case "palitoPicole": {
      // Retângulo com as duas pontas arredondadas, como o palito de verdade.
      const meia = params.largura / 2;
      const meioComprimento = Math.max(meia + 0.1, params.comprimento / 2);
      const esquerda = -meioComprimento + meia;
      const direita = meioComprimento - meia;
      const forma = new THREE.Shape();
      forma.moveTo(esquerda, -meia);
      forma.lineTo(direita, -meia);
      forma.absarc(direita, 0, meia, -Math.PI / 2, Math.PI / 2, false);
      forma.lineTo(esquerda, meia);
      forma.absarc(esquerda, 0, meia, Math.PI / 2, (Math.PI * 3) / 2, false);
      forma.closePath();
      return extrudar(forma, Math.max(1.6, params.largura * 0.18));
    }
    case "palitoChurrasco": {
      const corpo = new THREE.CylinderGeometry(
        params.grossura / 2,
        params.grossura / 2,
        params.comprimento,
        18,
      );
      if (!params.ponta) return corpo;
      const ponta = new THREE.ConeGeometry(params.grossura / 2, params.ponta, 18);
      ponta.translate(0, params.comprimento / 2 + params.ponta / 2, 0);
      return unir([corpo, ponta]);
    }
    case "engrenagem3d":
      return extrudar(
        formaDaEngrenagem(params.dentes, params.diametro / 2, params.furo),
        params.altura,
      );
    default:
      return null;
  }
}

// Junta geometrias simples num só objeto, sem booleana.
function unir(geometrias) {
  const juntas = geometrias.filter(Boolean);
  if (juntas.length === 1) return juntas[0];
  const posicoes = [];
  const normais = [];
  for (const geometria of juntas) {
    const g = geometria.index ? geometria.toNonIndexed() : geometria;
    posicoes.push(...g.attributes.position.array);
    normais.push(...g.attributes.normal.array);
  }
  const final = new THREE.BufferGeometry();
  final.setAttribute("position", new THREE.Float32BufferAttribute(posicoes, 3));
  final.setAttribute("normal", new THREE.Float32BufferAttribute(normais, 3));
  return final;
}

export function nomeDe(tipo) {
  return DEFINICOES[tipo] ? DEFINICOES[tipo].nome : "Peça";
}
