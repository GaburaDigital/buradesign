// Onde uma chapa encosta na outra, nasce um encaixe.
//
// A regra é simples de enxergar na peça de verdade: a chapa que chega com a
// borda ganha as abas; a chapa que recebe, o entalhe. Os dedos são sempre em
// número ímpar, então cada junta começa e termina com aba — é o que segura o
// canto quando a cola ainda está mole.
//
// Duas formas de junta:
//   canto  — as duas bordas se encontram na quina da montagem;
//   T      — uma chapa entra no meio da outra, que ganha um rasgo passante.

import { quadro, alinhada, extensao, paraLocal, BORDAS } from "./chapas.js";
import { abaPassante, anguloEntre, bordaDaChapa, paraOMundo, paraAChapa } from "./angulo.js";

const TOLERANCIA = 0.02; // mm
const EIXOS = ["x", "y", "z"];

// A chapa pode estar girada em 90 graus sobre si mesma, e aí o "u" dela aponta
// para outro eixo do mundo — ou para o sentido contrário. Estas duas funções
// traduzem: dado um lado no mundo, qual borda da chapa é aquela.
function ladosDaChapa(chapa, eixo) {
  const q = quadro(chapa);
  if (!q) return null;
  const letra = q.porEixo[eixo];
  if (letra !== "u" && letra !== "v") return null;
  const { sinal } = q.porLocal[letra];
  return {
    mais: sinal > 0 ? `${letra}1` : `${letra}0`,
    menos: sinal > 0 ? `${letra}0` : `${letra}1`,
  };
}

// Qual borda da chapa encosta no plano do outro lado, olhando um eixo só.
function bordaQueEncosta(chapa, caixa, eixo, alvo) {
  const lados = ladosDaChapa(chapa, eixo);
  if (!lados) return null;
  if (Math.abs(caixa.max[eixo] - alvo.min[eixo]) < TOLERANCIA) return lados.mais;
  if (Math.abs(caixa.min[eixo] - alvo.max[eixo]) < TOLERANCIA) return lados.menos;
  return null;
}

// A chapa que recebe termina na mesma quina, ou a outra entra pelo meio dela?
// Aqui as pontas coincidem: é o canto da montagem, e as duas vão ter recorte
// na borda. Quando não coincidem, a que chega atravessa — junta em T.
function bordaNaQuina(chapa, caixa, eixo, alvo) {
  const lados = ladosDaChapa(chapa, eixo);
  if (!lados) return null;
  if (Math.abs(caixa.max[eixo] - alvo.max[eixo]) < TOLERANCIA) return lados.mais;
  if (Math.abs(caixa.min[eixo] - alvo.min[eixo]) < TOLERANCIA) return lados.menos;
  return null;
}

// Reparte o trecho de contato em dedos. Número ímpar, para sobrar aba nas
// duas pontas; a largura sai do pedido do aluno, ajustada para fechar a conta.
export function repartirEmDedos(comeco, fim, larguraPedida) {
  const total = fim - comeco;
  if (total <= 0) return [];
  let quantos = Math.round(total / Math.max(1, larguraPedida));
  if (quantos < 3) quantos = 3;
  if (quantos % 2 === 0) quantos += 1;
  if (total / quantos < 1.2) {
    // Trecho curto demais para tanto dedo: volta para três.
    quantos = 3;
  }
  const largura = total / quantos;
  const dedos = [];
  for (let i = 0; i < quantos; i += 1) {
    dedos.push({ de: comeco + i * largura, ate: comeco + (i + 1) * largura, aba: i % 2 === 0 });
  }
  return dedos;
}

function vazio() {
  return { u0: [], u1: [], v0: [], v1: [] };
}

// A chapa em ângulo encosta alguma borda dela na outra? Se encostar, sai a
// aba passante: a única junta que fecha em qualquer ângulo.
function encostaNaOutra(chapa, outra, espessura, { dedo, folga }) {
  const angulo = anguloEntre(chapa, outra);
  // Quase paralelas ou quase no mesmo plano: não há o que encaixar, e a aba
  // sairia do tamanho de um braço.
  if (angulo < 12) return null;

  let melhor = null;
  for (const borda of BORDAS) {
    const ficha = bordaDaChapa(chapa, borda);
    // Antes eu exigia que a borda inteira estivesse em cima da outra chapa, e
    // por isso o encaixe só saía "às vezes": borda mais comprida que a chapa
    // de baixo, ou sobrando numa ponta, não contava. Agora o que vale é o
    // trecho que de fato encosta, e as abas nascem dentro dele.
    const encosta = (t) => {
      const ponto = paraOMundo(
        chapa,
        ficha.de[0] + (ficha.ate[0] - ficha.de[0]) * t,
        ficha.de[1] + (ficha.ate[1] - ficha.de[1]) * t,
      );
      const local = paraAChapa(outra, ponto);
      return (
        Math.abs(local.n) < espessura / 2 + TOLERANCIA * 40 &&
        local.u > -TOLERANCIA &&
        local.u < outra.largura + TOLERANCIA &&
        local.v > -TOLERANCIA &&
        local.v < outra.altura + TOLERANCIA
      );
    };

    // Varre a borda e guarda o maior pedaço encostado.
    const passos = 64;
    let inicio = null;
    let faixa = null;
    for (let i = 0; i <= passos; i += 1) {
      const t = i / passos;
      if (encosta(t)) {
        if (inicio === null) inicio = t;
        if (i === passos && (!faixa || t - inicio > faixa.ate - faixa.de)) {
          faixa = { de: inicio, ate: t };
        }
      } else if (inicio !== null) {
        const anterior = (i - 1) / passos;
        if (!faixa || anterior - inicio > faixa.ate - faixa.de) {
          faixa = { de: inicio, ate: anterior };
        }
        inicio = null;
      }
    }
    if (!faixa) continue;

    const comeco = faixa.de * ficha.comprimento;
    const fim = faixa.ate * ficha.comprimento;
    const encostado = fim - comeco;
    // Encosto curto demais não segura nada e ainda enfraquece a peça.
    if (encostado < Math.max(6, espessura * 3)) continue;
    if (melhor && encostado <= melhor.encostado) continue;
    melhor = { borda, ficha, comeco, encostado };
  }
  if (!melhor) return null;

  const abas = repartirEmAbas(melhor.encostado, dedo, espessura).map((aba) => ({
    de: aba.de + melhor.comeco,
    ate: aba.ate + melhor.comeco,
  }));
  if (!abas.length) return null;
  const encaixe = abaPassante(chapa, outra, melhor.borda, espessura, abas, { folga });
  if (!encaixe) return null;
  return {
    borda: melhor.borda,
    angulo: encaixe.angulo,
    encostado: melhor.encostado,
    abas: abas.map((aba) => ({
      ...aba,
      tipo: "aba",
      profundidade: encaixe.profundidade,
    })),
    rasgos: encaixe.rasgos,
  };
}

// Abas espaçadas ao longo da borda, com folga nas pontas para não rasgar a
// quina. Não precisa ser ímpar como o dedo: aqui não é dente que alterna, é
// aba que atravessa.
function repartirEmAbas(comprimento, dedo = 12, espessura = 3) {
  const margem = Math.max(espessura * 1.5, 3);
  const util = comprimento - 2 * margem;
  if (util <= dedo * 0.6) {
    if (comprimento < espessura * 3) return [];
    const largura = Math.max(2, Math.min(dedo, comprimento * 0.4));
    return [{ de: comprimento / 2 - largura / 2, ate: comprimento / 2 + largura / 2 }];
  }
  const quantas = Math.max(2, Math.min(6, Math.round(util / (dedo * 2))));
  const largura = Math.min(dedo, util / (quantas * 1.6));
  const passo = util / quantas;
  const abas = [];
  for (let i = 0; i < quantas; i += 1) {
    const meio = margem + passo * (i + 0.5);
    abas.push({ de: meio - largura / 2, ate: meio + largura / 2 });
  }
  return abas;
}

export function detectarJuntas(chapas, espessura, opcoes = {}) {
  const { dedo = 12, kerf = 0.2, folga = 0.1 } = opcoes;
  // A aba cresce nas laterais para sobreviver ao que a máquina come. O
  // entalhe fica no tamanho cheio: assim o ajuste fino é um número só.
  const sobra = Math.max(0, kerf - folga / 2);

  const encaixes = {};
  const furos = {};
  const juntas = [];
  const avisos = [];
  for (const chapa of chapas) {
    encaixes[chapa.id] = vazio();
    furos[chapa.id] = [];
  }

  const caixas = new Map(chapas.map((chapa) => [chapa.id, extensao(chapa, espessura)]));

  // Chapa em ângulo não ganha dente: dente reto não entra em quina torta.
  // Ela ganha aba passante, calculada pelo ângulo de verdade entre as duas.
  // Quem já veio com o encaixe pronto da forma fica de fora disso.
  const emAngulo = chapas.filter((chapa) => !alinhada(chapa) && !chapa.semJuntaAutomatica);
  for (const chapa of emAngulo) {
    for (const outra of chapas) {
      if (outra === chapa || outra.semJuntaAutomatica) continue;
      const achado = encostaNaOutra(chapa, outra, espessura, { dedo, folga });
      if (!achado) continue;
      encaixes[chapa.id][achado.borda].push(...achado.abas);
      furos[outra.id].push(...achado.rasgos);
      juntas.push({
        a: chapa.id,
        b: outra.id,
        tipo: "angulo",
        dedos: achado.abas.length,
        angulo: achado.angulo,
      });
    }
  }

  for (let i = 0; i < chapas.length; i += 1) {
    for (let j = i + 1; j < chapas.length; j += 1) {
      const um = chapas[i];
      const outro = chapas[j];
      if (um.semJuntaAutomatica || outro.semJuntaAutomatica) continue;
      const quadroUm = quadro(um);
      const quadroOutro = quadro(outro);
      if (!quadroUm || !quadroOutro) continue;
      const nUm = quadroUm.porLocal.n.eixo;
      const nOutro = quadroOutro.porLocal.n.eixo;
      if (nUm === nOutro) continue;

      const corrida = EIXOS.find((eixo) => eixo !== nUm && eixo !== nOutro);
      const caixaUm = caixas.get(um.id);
      const caixaOutro = caixas.get(outro.id);

      const comeco = Math.max(caixaUm.min[corrida], caixaOutro.min[corrida]);
      const fim = Math.min(caixaUm.max[corrida], caixaOutro.max[corrida]);
      if (fim - comeco < Math.max(3, espessura)) continue;

      // Quem chega com a borda? Pode ser um, o outro, ou nenhum.
      const bordaUm = bordaQueEncosta(um, caixaUm, nOutro, caixaOutro);
      const bordaOutro = bordaQueEncosta(outro, caixaOutro, nUm, caixaUm);

      let chega = null;
      let recebe = null;
      let bordaChega = null;
      if (bordaUm) {
        chega = um;
        recebe = outro;
        bordaChega = bordaUm;
      } else if (bordaOutro) {
        chega = outro;
        recebe = um;
        bordaChega = bordaOutro;
      } else {
        continue;
      }

      const caixaChega = caixas.get(chega.id);
      const caixaRecebe = caixas.get(recebe.id);
      const nChega = quadro(chega).porLocal.n.eixo;

      // A chapa que recebe cobre a espessura da que chega? Sem isso não há
      // material para entalhar.
      if (
        caixaRecebe.min[nChega] > caixaChega.min[nChega] + TOLERANCIA ||
        caixaRecebe.max[nChega] < caixaChega.max[nChega] - TOLERANCIA
      ) {
        avisos.push(`${chega.nome} e ${recebe.nome} se cruzam sem sobrepor a espessura.`);
        continue;
      }

      const bordaRecebe = bordaNaQuina(recebe, caixaRecebe, nChega, caixaChega);
      const dedos = repartirEmDedos(comeco, fim, dedo);
      if (!dedos.length) continue;

      // Da corrida no mundo para a régua de cada chapa.
      const paraBorda = (chapa, borda, valor) => {
        const q = quadro(chapa);
        // Borda "u" é uma borda vertical da régua: quem corre nela é o v.
        const eixoDaCorrida = borda.startsWith("u") ? q.porLocal.v.eixo : q.porLocal.u.eixo;
        return paraLocal(chapa, eixoDaCorrida, valor);
      };

      // A que chega ganha a aba, crescida para sobreviver ao corte.
      for (const pedaco of dedos) {
        if (!pedaco.aba) continue;
        const [de, ate] = [
          paraBorda(chega, bordaChega, pedaco.de),
          paraBorda(chega, bordaChega, pedaco.ate),
        ].sort((x, y) => x - y);
        encaixes[chega.id][bordaChega].push({ de: de - sobra, ate: ate + sobra, tipo: "aba" });
      }

      if (bordaRecebe) {
        // A que recebe abre o entalhe no mesmo lugar, no tamanho cheio.
        for (const pedaco of dedos) {
          if (!pedaco.aba) continue;
          const [de, ate] = [
            paraBorda(recebe, bordaRecebe, pedaco.de),
            paraBorda(recebe, bordaRecebe, pedaco.ate),
          ].sort((x, y) => x - y);
          encaixes[recebe.id][bordaRecebe].push({ de, ate, tipo: "entalhe" });
        }
        juntas.push({ a: chega.id, b: recebe.id, tipo: "canto", dedos: dedos.length });
      } else {
        // Junta em T: a chapa que recebe ganha rasgos passantes no meio.
        const eixoDaEspessura = nChega;
        const letraEspessura = quadro(recebe).porEixo[eixoDaEspessura];
        const a1 = paraLocal(recebe, eixoDaEspessura, caixaChega.min[eixoDaEspessura]);
        const a2 = paraLocal(recebe, eixoDaEspessura, caixaChega.max[eixoDaEspessura]);
        for (const pedaco of dedos) {
          if (!pedaco.aba) continue;
          const b1 = paraLocal(recebe, corrida, pedaco.de);
          const b2 = paraLocal(recebe, corrida, pedaco.ate);
          furos[recebe.id].push(
            letraEspessura === "u"
              ? { u0: Math.min(a1, a2), u1: Math.max(a1, a2), v0: Math.min(b1, b2), v1: Math.max(b1, b2) }
              : { u0: Math.min(b1, b2), u1: Math.max(b1, b2), v0: Math.min(a1, a2), v1: Math.max(a1, a2) },
          );
        }
        juntas.push({ a: chega.id, b: recebe.id, tipo: "te", dedos: dedos.length });
      }
    }
  }

  for (const lista of Object.values(encaixes)) {
    for (const borda of Object.keys(lista)) {
      lista[borda].sort((a, b) => a.de - b.de);
    }
  }
  return { encaixes, furos, juntas, avisos };
}
