// A ponte entre as duas bancadas. É o que faz "alternar para 3D" levar o
// desenho junto, em vez de trocar de tela e deixar o trabalho para trás.
//
// Do 2D para o 3D vai um SVG, que vira volume por extrusão.
// Do 3D para o 2D vão os triângulos da fatia que encosta na base, que o lado
// 2D junta num contorno só com as booleanas do Paper.js.

let carga = null;

export function guardarParaOTresD({ svg, alturaMm = 10, nome = "Desenho 2D" }) {
  carga = { destino: "3d", svg, alturaMm, nome };
}

export function guardarParaODoisD({ triangulos, nome = "Contorno 3D" }) {
  carga = { destino: "2d", triangulos, nome };
}

// Entrega a carga e esvazia a ponte: cada travessia acontece uma vez só.
export function retirar(destino) {
  if (!carga || carga.destino !== destino) return null;
  const entrega = carga;
  carga = null;
  return entrega;
}

export function temCarga(destino) {
  return Boolean(carga && carga.destino === destino);
}

export function limpar() {
  carga = null;
}
