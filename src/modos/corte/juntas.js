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

import { PLANOS, extensao, paraLocal } from "./chapas.js";

const TOLERANCIA = 0.02; // mm
const EIXOS = ["x", "y", "z"];

// Qual borda da chapa encosta no plano do outro lado, olhando um eixo só.
function bordaQueEncosta(chapa, caixa, eixo, alvo) {
  const plano = PLANOS[chapa.plano];
  const letra = eixo === plano.u ? "u" : eixo === plano.v ? "v" : null;
  if (!letra) return null;
  if (Math.abs(caixa.max[eixo] - alvo.min[eixo]) < TOLERANCIA) return `${letra}1`;
  if (Math.abs(caixa.min[eixo] - alvo.max[eixo]) < TOLERANCIA) return `${letra}0`;
  return null;
}

// A chapa que recebe termina na mesma quina, ou a outra entra pelo meio dela?
// Aqui as pontas coincidem: é o canto da montagem, e as duas vão ter recorte
// na borda. Quando não coincidem, a que chega atravessa — junta em T.
function bordaNaQuina(chapa, caixa, eixo, alvo) {
  const plano = PLANOS[chapa.plano];
  const letra = eixo === plano.u ? "u" : eixo === plano.v ? "v" : null;
  if (!letra) return null;
  if (Math.abs(caixa.max[eixo] - alvo.max[eixo]) < TOLERANCIA) return `${letra}1`;
  if (Math.abs(caixa.min[eixo] - alvo.min[eixo]) < TOLERANCIA) return `${letra}0`;
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

  for (let i = 0; i < chapas.length; i += 1) {
    for (let j = i + 1; j < chapas.length; j += 1) {
      const um = chapas[i];
      const outro = chapas[j];
      const nUm = PLANOS[um.plano].n;
      const nOutro = PLANOS[outro.plano].n;
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
      const nChega = PLANOS[chega.plano].n;

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
        const plano = PLANOS[chapa.plano];
        const eixoDaCorrida = borda.startsWith("u") ? plano.v : plano.u;
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
        const plano = PLANOS[recebe.plano];
        const eixoDaEspessura = nChega;
        const letraEspessura = eixoDaEspessura === plano.u ? "u" : "v";
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
