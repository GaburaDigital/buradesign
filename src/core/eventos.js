// Barramento de eventos simples. Evita que um módulo precise importar o outro
// só para avisar que algo mudou.

const ouvintes = new Map();

export function ouvir(nome, funcao) {
  if (!ouvintes.has(nome)) ouvintes.set(nome, new Set());
  ouvintes.get(nome).add(funcao);
  return () => ouvintes.get(nome).delete(funcao);
}

export function avisar(nome, dados) {
  const grupo = ouvintes.get(nome);
  if (!grupo) return;
  for (const funcao of grupo) {
    try {
      funcao(dados);
    } catch (erro) {
      console.error(`Falha no ouvinte de "${nome}"`, erro);
    }
  }
}
