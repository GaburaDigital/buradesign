// O ímã de encaixe.
//
// Arrastar chapa no olho não encaixa: numa caixa de MDF de 3 mm as paredes
// param em 43,5 mm, e nenhum grid redondo chega lá. Aqui a chapa que está
// andando procura as chapas paradas e, quando a borda dela passa perto de uma
// borda das outras, cola. Não é parede: continua dando para atravessar, só
// que empurrando com um pouco mais de vontade — a "travadinha" que faz a peça
// grudar sozinha no lugar certo.
//
// São três encontros que interessam, e nessa ordem de preferência:
//   contato  — a face de uma encosta na face da outra (é o que monta a caixa);
//   borda    — as duas terminam no mesmo lugar (canto alinhado);
//   centro   — as duas ficam centradas uma na outra.

import { extensao } from "./chapas.js";

const EIXOS = ["x", "y", "z"];

// Contato vale mais que borda, que vale mais que centro. A diferença é de
// décimo de milímetro: só desempata quando duas opções estão quase juntas.
const PESO = { contato: 0, borda: 0.15, centro: 0.3, base: 0.05 };

export function caixaDoConjunto(lista, espessura) {
  if (!lista.length) return null;
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const chapa of lista) {
    const caixa = extensao(chapa, espessura);
    for (const eixo of EIXOS) {
      min[eixo] = Math.min(min[eixo], caixa.min[eixo]);
      max[eixo] = Math.max(max[eixo], caixa.max[eixo]);
    }
  }
  return { min, max };
}

// O grid anda de passo em passo a partir de onde a peça estava, e não para
// múltiplos redondos do mundo. É o que deixa uma parede de 43,5 mm andar para
// 48,5 sem perder o meio milímetro que faz ela encostar na vizinha.
export function passoDoGrid(deslocamento, passo) {
  if (!passo || passo <= 0) return { ...deslocamento };
  const pisar = (valor) => Math.round(valor / passo) * passo;
  return { x: pisar(deslocamento.x), y: pisar(deslocamento.y), z: pisar(deslocamento.z) };
}

// Procura, eixo por eixo, o encontro mais perto. Devolve o quanto puxar e o
// que foi encontrado, para a bancada poder mostrar na tela.
export function encaixar(movidas, paradas, opcoes = {}) {
  const { espessura = 3, forca = 2, comBase = true } = opcoes;
  const correcao = { x: 0, y: 0, z: 0 };
  const marcas = [];
  if (forca <= 0) return { correcao, marcas };

  const minha = caixaDoConjunto(movidas, espessura);
  if (!minha) return { correcao, marcas };

  const caixasParadas = paradas.map((chapa) => ({
    chapa,
    caixa: extensao(chapa, espessura),
  }));

  for (const eixo of EIXOS) {
    const meuMin = minha.min[eixo];
    const meuMax = minha.max[eixo];
    const meuMeio = (meuMin + meuMax) / 2;

    let melhor = null;
    const oferecer = (alvo, meu, tipo, deQuem) => {
      const distancia = alvo - meu;
      const peso = Math.abs(distancia) + PESO[tipo];
      if (Math.abs(distancia) > forca) return;
      if (melhor && peso >= melhor.peso) return;
      melhor = { distancia, peso, tipo, eixo, valor: alvo, deQuem };
    };

    for (const { chapa, caixa } of caixasParadas) {
      const outroMin = caixa.min[eixo];
      const outroMax = caixa.max[eixo];
      const outroMeio = (outroMin + outroMax) / 2;
      // Encostar por fora: minha face na face dela.
      oferecer(outroMax, meuMin, "contato", chapa.id);
      oferecer(outroMin, meuMax, "contato", chapa.id);
      // Terminar junto: as duas acabam no mesmo lugar.
      oferecer(outroMin, meuMin, "borda", chapa.id);
      oferecer(outroMax, meuMax, "borda", chapa.id);
      // Centradas uma na outra.
      oferecer(outroMeio, meuMeio, "centro", chapa.id);
    }

    // A mesa também puxa: encostar no chão é o encaixe mais comum de todos.
    if (comBase && eixo === "y") oferecer(0, meuMin, "base", null);

    if (melhor) {
      correcao[eixo] = melhor.distancia;
      marcas.push(melhor);
    }
  }

  return { correcao, marcas };
}

// Uma assinatura curta do que está grudado agora. Serve para a bancada saber
// quando o ímã acabou de pegar, e só aí dar o clique — senão vira barulho.
export function assinatura(marcas) {
  return marcas
    .map((marca) => `${marca.eixo}:${marca.tipo}:${marca.valor.toFixed(2)}`)
    .sort()
    .join("|");
}
