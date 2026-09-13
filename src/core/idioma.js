// Um idioma por arquivo em /i18n. Para somar o inglês, crie i18n/en.js com as
// mesmas chaves e registre abaixo. O seletor de idioma nos Ajustes só aparece
// quando existe mais de uma opção aqui.

import ptBR from "../../i18n/pt-BR.js";

const DISPONIVEIS = {
  "pt-BR": ptBR,
};

let atual = ptBR;

export function definirIdioma(codigo) {
  if (DISPONIVEIS[codigo]) atual = DISPONIVEIS[codigo];
  return atual;
}

export function idiomasDisponiveis() {
  return Object.entries(DISPONIVEIS).map(([codigo, pacote]) => ({
    codigo,
    nome: pacote.idioma.nome,
  }));
}

// t("bolsa.importadas", { n: 3 })
export function t(caminho, valores) {
  let no = atual;
  for (const parte of caminho.split(".")) {
    if (no == null) break;
    no = no[parte];
  }
  if (no == null) return caminho;
  if (typeof no !== "string" || !valores) return no;
  return no.replace(/\{(\w+)\}/g, (inteiro, chave) =>
    chave in valores ? String(valores[chave]) : inteiro,
  );
}
