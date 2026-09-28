// Encaixe entre chapas que não se encontram em 90 graus.
//
// O dedo de encaixe só funciona em quina reta. Numa parede de pirâmide, ou
// num hexágono, as duas chapas se encontram em ângulo, e um dente reto entra
// torto: ou não entra, ou entra folgado. É por isso que a pirâmide não
// prendia na base.
//
// A saída é a **aba passante**: a chapa que chega estica uma aba pela borda,
// e a que recebe abre um rasgo por onde a aba atravessa. A aba aparece do
// outro lado e o aluno prende com um palito, uma cunha ou uma gota de cola.
// Isso funciona em qualquer ângulo — só muda quanto a aba precisa esticar e
// quanto o rasgo precisa abrir:
//
//   aba  = espessura / sen(ângulo)
//   rasgo = espessura / sen(ângulo)
//
// Em 90 graus o seno vale 1 e a conta vira a de sempre, o que é justamente a
// prova de que a conta está certa: o caso reto é um caso particular dela.

import { eixosDaChapa } from "./chapas.js";

const menos = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const escala = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const tamanho = (a) => Math.hypot(a[0], a[1], a[2]);
const normalizar = (a) => {
  const t = tamanho(a) || 1;
  return [a[0] / t, a[1] / t, a[2] / t];
};

const centroDe = (chapa) => [chapa.centro.x, chapa.centro.y, chapa.centro.z];

// Um ponto da chapa, das coordenadas dela para o mundo.
export function paraOMundo(chapa, u, v) {
  const eixos = eixosDaChapa(chapa);
  const base = centroDe(chapa);
  return soma(
    base,
    soma(escala(eixos.u, u - chapa.largura / 2), escala(eixos.v, v - chapa.altura / 2)),
  );
}

// E de volta: do mundo para as coordenadas da chapa.
export function paraAChapa(chapa, p) {
  const eixos = eixosDaChapa(chapa);
  const d = menos(p, centroDe(chapa));
  return {
    u: ponto(d, eixos.u) + chapa.largura / 2,
    v: ponto(d, eixos.v) + chapa.altura / 2,
    n: ponto(d, eixos.n),
  };
}

// A borda da chapa, em coordenadas dela: por onde ela anda e para que lado
// fica o lado de fora.
export function bordaDaChapa(chapa, borda) {
  const { largura, altura } = chapa;
  if (borda === "v0") return { de: [0, 0], ate: [largura, 0], fora: [0, -1], comprimento: largura };
  if (borda === "v1")
    return { de: [0, altura], ate: [largura, altura], fora: [0, 1], comprimento: largura };
  if (borda === "u0") return { de: [0, 0], ate: [0, altura], fora: [-1, 0], comprimento: altura };
  return { de: [largura, 0], ate: [largura, altura], fora: [1, 0], comprimento: altura };
}

// A linha onde os planos do meio das duas chapas se cruzam.
function cruzamentoDosPlanos(a, b) {
  const na = eixosDaChapa(a).n;
  const nb = eixosDaChapa(b).n;
  const direcao = cruz(na, nb);
  const seno = tamanho(direcao);
  // Paralelas: não existe cruzamento, e também não existe encaixe.
  if (seno < 1e-6) return null;
  const ha = ponto(na, centroDe(a));
  const hb = ponto(nb, centroDe(b));
  const d2 = seno * seno;
  // Ponto da linha de cruzamento de dois planos. A ordem dos produtos
  // vetoriais aqui importa: trocada, o ponto sai espelhado, e o rasgo ia
  // parar do outro lado da chapa.
  const p = escala(
    soma(escala(cruz(nb, direcao), ha), escala(cruz(direcao, na), hb)),
    1 / d2,
  );
  return { ponto: p, direcao: normalizar(direcao), seno, na, nb };
}

// O ângulo entre as duas chapas, em graus, sempre entre 0 e 90. É ele que
// manda no tamanho da aba e do rasgo.
export function anguloEntre(a, b) {
  const cruzamento = cruzamentoDosPlanos(a, b);
  if (!cruzamento) return 0;
  return (Math.asin(Math.min(1, cruzamento.seno)) * 180) / Math.PI;
}

// A aba passante: quanto a aba da chapa que chega precisa esticar, e onde
// abrir o rasgo na chapa que recebe.
//
// `abas` são os pedaços da borda que viram aba, nas coordenadas da chapa que
// chega, como o resto do programa já usa: { de, ate }.
export function abaPassante(chega, recebe, borda, espessura, abas, opcoes = {}) {
  const { folga = 0.1 } = opcoes;
  const cruzamento = cruzamentoDosPlanos(chega, recebe);
  if (!cruzamento) return null;

  const eixosChega = eixosDaChapa(chega);
  const ficha = bordaDaChapa(chega, borda);
  const paraFora = normalizar(
    soma(escala(eixosChega.u, ficha.fora[0]), escala(eixosChega.v, ficha.fora[1])),
  );

  // Quanto a aba tem que andar para atravessar a chapa que recebe. Em 90
  // graus o "quanto anda por milímetro" vale 1 e isto vira a espessura.
  const avanco = Math.abs(ponto(paraFora, cruzamento.nb));
  if (avanco < 1e-6) return null;
  const meioDaBorda = paraOMundo(
    chega,
    (ficha.de[0] + ficha.ate[0]) / 2,
    (ficha.de[1] + ficha.ate[1]) / 2,
  );
  const distanciaAteOMeio = Math.abs(ponto(menos(meioDaBorda, centroDe(recebe)), cruzamento.nb));
  const profundidade = (distanciaAteOMeio + espessura / 2) / avanco;

  // O rasgo é a sombra da chapa que chega no plano da que recebe: uma faixa
  // em volta da linha de cruzamento, tão mais larga quanto mais deitado for
  // o encontro.
  const meiaLargura = espessura / 2 / cruzamento.seno + folga / 2;
  const naChapa = (p) => paraAChapa(recebe, p);
  const doCruzamento = naChapa(cruzamento.ponto);
  const dirLocal = (() => {
    const eixos = eixosDaChapa(recebe);
    return { u: ponto(cruzamento.direcao, eixos.u), v: ponto(cruzamento.direcao, eixos.v) };
  })();
  const perpLocal = { u: -dirLocal.v, v: dirLocal.u };

  // Onde cada aba começa e termina, medido ao longo da linha de cruzamento.
  const aoLongo = (uLocalDaChega) => {
    const p = paraOMundo(
      chega,
      borda === "u0" || borda === "u1" ? ficha.de[0] : uLocalDaChega,
      borda === "u0" || borda === "u1" ? uLocalDaChega : ficha.de[1],
    );
    return ponto(menos(p, cruzamento.ponto), cruzamento.direcao);
  };

  const rasgos = [];
  for (const aba of abas) {
    const t0 = aoLongo(aba.de);
    const t1 = aoLongo(aba.ate);
    const de = Math.min(t0, t1) - folga / 2;
    const ate = Math.max(t0, t1) + folga / 2;
    const canto = (t, lado) => [
      doCruzamento.u + dirLocal.u * t + perpLocal.u * lado * meiaLargura,
      doCruzamento.v + dirLocal.v * t + perpLocal.v * lado * meiaLargura,
    ];
    rasgos.push([canto(de, -1), canto(ate, -1), canto(ate, 1), canto(de, 1)]);
  }

  return {
    profundidade,
    rasgos,
    angulo: (Math.asin(Math.min(1, cruzamento.seno)) * 180) / Math.PI,
  };
}
