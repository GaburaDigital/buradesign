// Lê o catalogo.json, que é a lista do que existe dentro de /ATIVIDADES.
// O nome do arquivo continua sendo o nome mostrado na interface; o catálogo
// serve para o que o site não consegue adivinhar sozinho (nível, dica, tags).

let cache = null;

export const VAZIO = Object.freeze({
  formato: "buradesign.catalogo",
  versao: 1,
  colecoes: {},
});

export async function carregar() {
  if (cache) return cache;
  try {
    const resposta = await fetch("catalogo.json", { cache: "no-cache" });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    if (dados.formato !== VAZIO.formato) throw new Error("formato desconhecido");
    cache = dados;
  } catch (erro) {
    console.warn("Não consegui ler o catalogo.json", erro);
    cache = VAZIO;
  }
  return cache;
}

export function colecao(nome) {
  if (!cache) return [];
  const grupo = cache.colecoes[nome];
  return Array.isArray(grupo?.itens) ? grupo.itens : [];
}

export function contar() {
  if (!cache) return 0;
  return Object.values(cache.colecoes).reduce(
    (soma, grupo) => soma + (Array.isArray(grupo?.itens) ? grupo.itens.length : 0),
    0,
  );
}
