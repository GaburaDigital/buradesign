// Ponto de entrada. Liga as preferências, toca a abertura e entrega a casca.

import { iniciar as iniciarAjustes, valor } from "./ajustes.js";
import { definirIdioma } from "./idioma.js";
import { liberarNoPrimeiroToque } from "./som.js";
import { carregar as carregarCatalogo } from "./catalogo.js";
import { listar as listarBolsa } from "./bolsa.js";
import { executar as executarBoot } from "./boot.js";
import { registrarServiceWorker } from "./registrar-sw.js";
import { montarCasca } from "../ui/casca.js";

export const VERSAO = "0.1.0";

async function iniciar() {
  iniciarAjustes();
  definirIdioma(valor("idioma"));
  liberarNoPrimeiroToque();
  registrarServiceWorker();

  let pecasNaBolsa = 0;
  try {
    const [itens] = await Promise.all([listarBolsa(), carregarCatalogo()]);
    pecasNaBolsa = itens.length;
  } catch (erro) {
    console.warn("Depósito local indisponível", erro);
  }

  await executarBoot({ pecasNaBolsa });
  montarCasca();
  console.info(`BuraDESIGN ${VERSAO} pronto.`);
}

iniciar();
