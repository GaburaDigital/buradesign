// Depósito local em IndexedDB.
// A Bolsa e os projetos ficam aqui porque malhas 3D passam fácil do limite
// do localStorage, que guarda só as preferências.

const NOME_BANCO = "buradesign";
const VERSAO = 1;
export const ARMAZENS = ["bolsa", "projetos"];

let banco = null;

function abrir() {
  if (banco) return Promise.resolve(banco);
  return new Promise((resolver, rejeitar) => {
    const pedido = indexedDB.open(NOME_BANCO, VERSAO);
    pedido.onupgradeneeded = () => {
      const bd = pedido.result;
      for (const nome of ARMAZENS) {
        if (!bd.objectStoreNames.contains(nome)) {
          bd.createObjectStore(nome, { keyPath: "id" });
        }
      }
    };
    pedido.onsuccess = () => {
      banco = pedido.result;
      resolver(banco);
    };
    pedido.onerror = () => rejeitar(pedido.error);
  });
}

function transacao(armazem, modo) {
  return abrir().then((bd) => bd.transaction(armazem, modo).objectStore(armazem));
}

function comoPromessa(pedido) {
  return new Promise((resolver, rejeitar) => {
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error);
  });
}

export async function guardar(armazem, item) {
  const loja = await transacao(armazem, "readwrite");
  await comoPromessa(loja.put(item));
  return item;
}

export async function buscar(armazem, id) {
  const loja = await transacao(armazem, "readonly");
  return comoPromessa(loja.get(id));
}

export async function listar(armazem) {
  const loja = await transacao(armazem, "readonly");
  const itens = await comoPromessa(loja.getAll());
  return itens.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
}

export async function remover(armazem, id) {
  const loja = await transacao(armazem, "readwrite");
  return comoPromessa(loja.delete(id));
}

export async function limpar(armazem) {
  const loja = await transacao(armazem, "readwrite");
  return comoPromessa(loja.clear());
}

export async function limparTudo() {
  for (const nome of ARMAZENS) await limpar(nome);
}

export function novoId(prefixo = "item") {
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `${prefixo}_${Date.now().toString(36)}_${aleatorio}`;
}
