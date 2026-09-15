// Travessia entre as bancadas.
// Do 2D para o 3D: cada caminho do SVG vira uma forma e ganha altura por
// extrusão. Do 3D para o 2D: a fatia que encosta na base é reduzida aos
// triângulos dela, que o lado 2D junta num contorno só.

import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { Brush, Evaluator, INTERSECTION } from "three-bvh-csg";
import { cena3d } from "./cena.js";
import { aplicarUVsDeCaixa, garantirOrientacao } from "./solidos.js";
import { pecaDeGeometria } from "./pecas.js";

const avaliador = new Evaluator();
avaliador.attributes = ["position", "normal"];

// --- 2D para 3D --------------------------------------------------------

export function formasDoSVG(svg) {
  const dados = new SVGLoader().parse(svg);
  const formas = [];
  for (const caminho of dados.paths) {
    for (const forma of SVGLoader.createShapes(caminho)) formas.push(forma);
  }
  return formas;
}

// O SVG do modo 2D está em milímetros, com o Y crescendo para baixo. Aqui a
// profundidade é o Z, então o desenho é deitado na base com uma rotação.
export function extrudarSVG(svg, { alturaMm = 10, nome = "Desenho 2D" } = {}) {
  const formas = formasDoSVG(svg);
  if (!formas.length) return null;

  const geometria = new THREE.ExtrudeGeometry(formas, {
    depth: Math.max(0.4, alturaMm),
    bevelEnabled: false,
    curveSegments: 16,
  });
  // Deita o desenho: o que era Y do papel vira Z da base, e a extrusão
  // vira altura. Rotação, e não espelho, para as faces continuarem certas.
  geometria.rotateX(Math.PI / 2);
  geometria.center();
  garantirOrientacao(geometria);
  aplicarUVsDeCaixa(geometria);
  return pecaDeGeometria(geometria, nome);
}

// --- 3D para 2D --------------------------------------------------------

// Fatia rente ao chão e devolve os triângulos dela achatados no plano da
// mesa. O contorno de verdade é montado do outro lado, com as booleanas do
// Paper.js, que sabem juntar tudo numa forma só.
// Quem está encostando na base neste momento.
export function pecasNaBase(espessura = 0.8) {
  return cena3d.grupoPecas.children.filter((peca) => {
    if (peca.userData.negativo) return false;
    peca.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(peca).min.y <= espessura;
  });
}

// Junta em grupos as peças que se encostam. Peças soltas viram grupos de uma
// só, e cada grupo chega ao 2D como um contorno independente.
function agruparPorContato(lista, folga = 0.5) {
  const caixas = lista.map((peca) => {
    const caixa = new THREE.Box3().setFromObject(peca);
    caixa.expandByScalar(folga);
    return caixa;
  });
  const grupoDe = lista.map((_, indice) => indice);
  const raiz = (indice) => {
    let atual = indice;
    while (grupoDe[atual] !== atual) atual = grupoDe[atual];
    return atual;
  };
  for (let i = 0; i < lista.length; i += 1) {
    for (let j = i + 1; j < lista.length; j += 1) {
      if (caixas[i].intersectsBox(caixas[j])) {
        const a = raiz(i);
        const b = raiz(j);
        if (a !== b) grupoDe[b] = a;
      }
    }
  }
  const mapa = new Map();
  lista.forEach((peca, indice) => {
    const chave = raiz(indice);
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push(peca);
  });
  return [...mapa.values()];
}

// Devolve um conjunto de triângulos por grupo de peças encostadas.
export function triangulosNaBase(espessura = 0.8, limiteDeTriangulos = 8000) {
  const grupos = [];
  for (const conjunto of agruparPorContato(pecasNaBase(espessura))) {
    const saida = fatiar(conjunto, espessura, limiteDeTriangulos);
    if (saida.length) grupos.push(saida);
  }
  return grupos;
}

function fatiar(conjunto, espessura, limiteDeTriangulos) {
  const saida = [];
  for (const peca of conjunto) {
    peca.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(peca);

    const largura = Math.max(2, caixa.max.x - caixa.min.x) + 4;
    const profundidade = Math.max(2, caixa.max.z - caixa.min.z) + 4;
    const fatia = new Brush(new THREE.BoxGeometry(largura, espessura * 2, profundidade));
    fatia.position.set(caixa.getCenter(new THREE.Vector3()).x, caixa.min.y + espessura * 0.5, caixa.getCenter(new THREE.Vector3()).z);
    fatia.updateMatrixWorld(true);

    const inteira = new Brush(peca.geometry.clone());
    inteira.applyMatrix4(peca.matrixWorld);
    inteira.updateMatrixWorld(true);

    let recorte = null;
    try {
      recorte = avaliador.evaluate(inteira, fatia, INTERSECTION);
    } catch {
      recorte = null;
    }
    if (!recorte) continue;

    const posicoes = recorte.geometry.attributes.position;
    for (let i = 0; i < posicoes.count && saida.length < limiteDeTriangulos; i += 3) {
      const triangulo = [];
      let plano = true;
      for (let k = 0; k < 3; k += 1) {
        triangulo.push(posicoes.getX(i + k), posicoes.getZ(i + k));
      }
      // Só interessam os triângulos deitados: as paredes laterais viram
      // linhas sem área quando achatadas.
      const area = Math.abs(
        (triangulo[2] - triangulo[0]) * (triangulo[5] - triangulo[1]) -
          (triangulo[4] - triangulo[0]) * (triangulo[3] - triangulo[1]),
      ) / 2;
      if (area < 0.01) plano = false;
      if (plano) saida.push(triangulo);
    }
  }
  return saida;
}
