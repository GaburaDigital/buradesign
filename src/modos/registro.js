// Registro dos setores. Cada fase do projeto troca "aberto" para true e aponta
// "carregar" para o módulo do setor. O resto da casca não muda.

export const SETORES = [
  {
    id: "livre",
    alien: "zorp",
    chaveNome: "setores.livre.nome",
    chaveDescricao: "setores.livre.descricao",
    aberto: true,
    fase: 1,
    carregar: () => import("./livre/menu.js"),
  },
  {
    id: "blocos",
    alien: "nibla",
    chaveNome: "setores.blocos.nome",
    chaveDescricao: "setores.blocos.descricao",
    aberto: true,
    fase: 3,
    carregar: () => import("./blocos/menu.js"),
  },
  {
    id: "corte",
    alien: "krux",
    chaveNome: "setores.corte.nome",
    chaveDescricao: "setores.corte.descricao",
    aberto: true,
    fase: 4,
    carregar: () => import("./corte/menu.js"),
  },
  {
    id: "fisica",
    alien: "pip",
    chaveNome: "setores.fisica.nome",
    chaveDescricao: "setores.fisica.descricao",
    aberto: false,
    fase: 5,
    carregar: () => import("./em-obras.js"),
  },
];

export function setorPorId(id) {
  return SETORES.find((setor) => setor.id === id) || null;
}
