// As estrelas de cada desafio. Fica no localStorage porque é pouca coisa e
// precisa estar pronta antes da tela desenhar; os projetos, que são pesados,
// continuam no IndexedDB.
//
// Guarda a melhor nota de cada um: refazer um desafio nunca tira estrela.

const CHAVE = "buradesign:desafios";

function ler() {
  try {
    const cru = localStorage.getItem(CHAVE);
    const lido = cru ? JSON.parse(cru) : null;
    return lido && typeof lido === "object" ? lido : {};
  } catch {
    return {};
  }
}

function gravar(tudo) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(tudo));
  } catch {
    // aula em janela anônima: segue sem guardar
  }
}

export function resultadoDe(id) {
  const tudo = ler();
  return tudo[id] || null;
}

export function guardarResultado(id, { porcentagem, estrelas }) {
  const tudo = ler();
  const antes = tudo[id];
  if (!antes || porcentagem > antes.porcentagem) {
    tudo[id] = { porcentagem, estrelas, em: Date.now() };
    gravar(tudo);
    return true;
  }
  return false;
}

export function marcarPulado(id) {
  const tudo = ler();
  if (!tudo[id]) {
    tudo[id] = { porcentagem: 0, estrelas: 0, pulado: true, em: Date.now() };
    gravar(tudo);
  }
}

export function resumo(desafios) {
  const tudo = ler();
  let estrelas = 0;
  let feitos = 0;
  for (const desafio of desafios) {
    const linha = tudo[desafio.id];
    if (!linha) continue;
    estrelas += linha.estrelas || 0;
    if (linha.estrelas > 0) feitos += 1;
  }
  return { estrelas, feitos, total: desafios.length, maximo: desafios.length * 3 };
}

export function limpar() {
  gravar({});
}
