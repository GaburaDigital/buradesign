// Encaixar as peças na folha sem desperdiçar chapa.
//
// É o arranjo por prateleiras: as peças mais altas primeiro, cada fileira
// tão alta quanto a maior peça dela. Não é o arranjo perfeito — esse problema
// não tem solução rápida — mas aproveita bem e, principalmente, é previsível:
// o aluno olha a folha e entende por que a peça foi parar ali.

import { medirContorno } from "./planificar.js";

function normalizar(peca) {
  const { minU, minV } = peca.limites;
  const mover = (pontos) => pontos.map(([u, v]) => [u - minU, v - minV]);
  return {
    ...peca,
    contorno: mover(peca.contorno),
    furos: peca.furos.map(mover),
    limites: medirContorno(mover(peca.contorno)),
  };
}

// Gira a peça um quarto de volta, para caber deitada quando não cabe em pé.
export function girarPeca(peca) {
  const altura = peca.limites.altura;
  const virar = (pontos) => pontos.map(([u, v]) => [altura - v, u]);
  const contorno = virar(peca.contorno);
  return {
    ...peca,
    girada: !peca.girada,
    contorno,
    furos: peca.furos.map(virar),
    limites: medirContorno(contorno),
  };
}

export function arranjar(pecas, { chapaLargura = 300, chapaAltura = 300, respiro = 2 } = {}) {
  const prontas = pecas.map(normalizar);
  const grandes = [];
  const cabem = [];
  for (const peca of prontas) {
    const cabeEmPe = peca.limites.largura <= chapaLargura && peca.limites.altura <= chapaAltura;
    const cabeDeitada = peca.limites.altura <= chapaLargura && peca.limites.largura <= chapaAltura;
    if (!cabeEmPe && !cabeDeitada) grandes.push(peca);
    else cabem.push(cabeEmPe ? peca : girarPeca(peca));
  }

  // Mais alta primeiro: é o que faz a prateleira render.
  cabem.sort((a, b) => b.limites.altura - a.limites.altura || b.limites.largura - a.limites.largura);

  const folhas = [];
  let folha = null;
  let linhaY = respiro;
  let linhaAltura = 0;
  let cursorX = respiro;

  const novaFolha = () => {
    folha = { pecas: [] };
    folhas.push(folha);
    linhaY = respiro;
    linhaAltura = 0;
    cursorX = respiro;
  };
  novaFolha();

  for (const peca of cabem) {
    let atual = peca;
    let largura = atual.limites.largura;
    let altura = atual.limites.altura;

    // Não cabe no resto da fileira? Tenta deitada antes de abrir outra.
    if (cursorX + largura + respiro > chapaLargura) {
      const virada = girarPeca(atual);
      if (
        cursorX + virada.limites.largura + respiro <= chapaLargura &&
        linhaY + Math.max(linhaAltura, virada.limites.altura) + respiro <= chapaAltura
      ) {
        atual = virada;
        largura = atual.limites.largura;
        altura = atual.limites.altura;
      } else {
        linhaY += linhaAltura + respiro;
        linhaAltura = 0;
        cursorX = respiro;
      }
    }
    if (linhaY + altura + respiro > chapaAltura) {
      novaFolha();
    }
    if (cursorX + largura + respiro > chapaLargura) {
      // Peça mais larga que a folha inteira só chega aqui girada; se ainda
      // assim não couber, ela já teria ido para a lista das grandes.
      linhaY += linhaAltura + respiro;
      linhaAltura = 0;
      cursorX = respiro;
    }

    folha.pecas.push({ peca: atual, x: cursorX, y: linhaY });
    cursorX += largura + respiro;
    linhaAltura = Math.max(linhaAltura, altura);
  }

  const areaDaFolha = chapaLargura * chapaAltura;
  const usada = folhas.map((f) => f.pecas.reduce((soma, item) => soma + Math.abs(item.peca.area), 0));
  return {
    folhas,
    grandes,
    chapaLargura,
    chapaAltura,
    aproveitamento: folhas.map((_, i) => (areaDaFolha ? (usada[i] / areaDaFolha) * 100 : 0)),
  };
}
