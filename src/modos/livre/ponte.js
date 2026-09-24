// A ponte entre as duas bancadas. É o que faz "alternar para 3D" levar o
// desenho junto, em vez de trocar de tela e deixar o trabalho para trás.
//
// Do 2D para o 3D vai uma lista de SVGs (um por peça), que viram volume por
// extrusão. Do 3D para o 2D vão grupos de triângulos da fatia que encosta na
// base, que o lado 2D junta em contornos com as booleanas do Paper.js.
//
// Atenção ao mexer aqui: a ponte repassa a carga inteira, sem escolher campo
// por campo. Já foi assim uma vez, com um "svg" no singular, e o resultado era
// a travessia abrir a outra bancada vazia — o desenho sumia no meio do caminho
// sem erro nenhum aparecer na tela.

let carga = null;

export function guardarParaOTresD(dados = {}) {
  carga = { alturaMm: 10, nome: "Desenho 2D", ...dados, destino: "3d" };
}

export function guardarParaODoisD(dados = {}) {
  carga = { nome: "Contorno 3D", ...dados, destino: "2d" };
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
