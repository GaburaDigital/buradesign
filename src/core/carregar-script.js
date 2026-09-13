// Carrega as bibliotecas de vendor/ só quando o setor precisa delas.
// Assim a tela inicial continua leve e nada depende de internet.

const carregados = new Map();

export function carregarScript(caminho, nomeGlobal) {
  if (nomeGlobal && window[nomeGlobal]) return Promise.resolve(window[nomeGlobal]);
  if (carregados.has(caminho)) return carregados.get(caminho);

  const promessa = new Promise((resolver, rejeitar) => {
    const marca = document.createElement("script");
    marca.src = caminho;
    marca.async = true;
    marca.addEventListener("load", () => resolver(nomeGlobal ? window[nomeGlobal] : true));
    marca.addEventListener("error", () =>
      rejeitar(new Error(`Não consegui carregar ${caminho}`)),
    );
    document.head.append(marca);
  });

  carregados.set(caminho, promessa);
  return promessa;
}

export function carregarEstilo(caminho) {
  if (document.querySelector(`link[href="${caminho}"]`)) return;
  const marca = document.createElement("link");
  marca.rel = "stylesheet";
  marca.href = caminho;
  document.head.append(marca);
}
