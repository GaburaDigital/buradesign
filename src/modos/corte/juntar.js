// Juntar chapas que estão no mesmo plano, e descontar as negativas.
//
// Duas chapas encostadas e no mesmo plano são, para a cortadora, uma peça só:
// cortar as duas e colar de volta é trabalho à toa e uma emenda a menos de
// resistência. Juntar faz delas uma peça com um contorno só.
//
// A conta de união e subtração de contornos é das que mais dão errado quando
// escritas na mão — borda encostada exatamente em borda é justamente o caso
// que quebra quase todo algoritmo. Em vez disso, aqui as chapas viram volume,
// a biblioteca de CSG faz a conta em 3D (que é onde ela é sólida) e o
// resultado volta a ser contorno pelo mesmo fatiador que o setor já usa. É
// mais rodeio, mas é o caminho que já está provado por teste.

import * as THREE from "three";
import { Brush, Evaluator, ADDITION, SUBTRACTION } from "three-bvh-csg";

import { eixosDaChapa, novaChapa } from "./chapas.js";
import { fatiarModelo } from "./fatias.js";
import { paraAChapa } from "./angulo.js";

const avaliador = new Evaluator();
const TOLERANCIA = 0.05;

// Duas chapas moram no mesmo plano?
export function mesmoPlano(a, b, espessura) {
  const na = eixosDaChapa(a).n;
  const nb = eixosDaChapa(b).n;
  const alinhadas = Math.abs(na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2]);
  if (alinhadas < 0.9999) return false;
  // Mesmo plano mesmo, e não dois planos paralelos.
  const centroB = paraAChapa(a, [b.centro.x, b.centro.y, b.centro.z]);
  return Math.abs(centroB.n) < Math.max(TOLERANCIA, espessura * 0.1);
}

// Separa as escolhidas em panelinhas de mesmo plano.
export function agruparPorPlano(chapas, espessura) {
  const turmas = [];
  for (const chapa of chapas) {
    const turma = turmas.find((lista) => mesmoPlano(lista[0], chapa, espessura));
    if (turma) turma.push(chapa);
    else turmas.push([chapa]);
  }
  return turmas;
}

// O contorno da chapa em coordenadas dela, com a forma própria ou o retângulo.
function contornoLocal(chapa) {
  if (chapa.forma && chapa.forma.length >= 3) return chapa.forma;
  return [
    [0, 0],
    [chapa.largura, 0],
    [chapa.largura, chapa.altura],
    [0, chapa.altura],
  ];
}

// A chapa vira um volume fino, posto no quadro da chapa de referência.
function volumeDa(chapa, referencia, espessura) {
  const forma = new THREE.Shape(
    contornoLocal(chapa).map(([u, v]) => {
      const mundo = paraOMundoDaChapa(chapa, u, v);
      const local = paraAChapa(referencia, mundo);
      return new THREE.Vector2(local.u, local.v);
    }),
  );
  for (const furo of chapa.furosFixos || []) {
    forma.holes.push(
      new THREE.Path(
        furo.map(([u, v]) => {
          const mundo = paraOMundoDaChapa(chapa, u, v);
          const local = paraAChapa(referencia, mundo);
          return new THREE.Vector2(local.u, local.v);
        }),
      ),
    );
  }
  const geometria = new THREE.ExtrudeGeometry(forma, { depth: espessura, bevelEnabled: false });
  // O fatiador corta na horizontal, então o volume entra deitado: o u da
  // chapa vira x, o v vira z e a espessura vira altura.
  geometria.rotateX(-Math.PI / 2);
  return geometria;
}

function paraOMundoDaChapa(chapa, u, v) {
  const eixos = eixosDaChapa(chapa);
  return [
    chapa.centro.x + eixos.u[0] * (u - chapa.largura / 2) + eixos.v[0] * (v - chapa.altura / 2),
    chapa.centro.y + eixos.u[1] * (u - chapa.largura / 2) + eixos.v[1] * (v - chapa.altura / 2),
    chapa.centro.z + eixos.u[2] * (u - chapa.largura / 2) + eixos.v[2] * (v - chapa.altura / 2),
  ];
}

// Junta uma turma de chapas do mesmo plano numa só. As marcadas como negativa
// são descontadas das outras em vez de somadas.
export function juntarPlano(turma, espessura) {
  const positivas = turma.filter((chapa) => !chapa.negativa);
  const negativas = turma.filter((chapa) => chapa.negativa);
  if (!positivas.length) return { chapas: [], aviso: "Só havia peças negativas na escolha." };
  if (turma.length < 2) return { chapas: turma, aviso: null };

  const referencia = positivas[0];
  const escova = (chapa) => new Brush(volumeDa(chapa, referencia, espessura));

  let resultado = escova(positivas[0]);
  for (let i = 1; i < positivas.length; i += 1) {
    resultado = avaliador.evaluate(resultado, escova(positivas[i]), ADDITION);
  }
  for (const negativa of negativas) {
    resultado = avaliador.evaluate(resultado, escova(negativa), SUBTRACTION);
  }
  resultado.updateMatrixWorld(true);

  // De volta para contorno: uma fatia no meio da espessura.
  const { camadas } = fatiarModelo([resultado], { espessura, limiteDeCamadas: 1 });
  if (!camadas.length) {
    return { chapas: turma, aviso: "Não consegui juntar: as peças não se tocam no mesmo plano." };
  }

  const camada = camadas[0];
  const minU = camada.limites.minU;
  const minV = camada.limites.minV;
  const forma = camada.contorno.map(([u, v]) => [u - minU, v - minV]);
  const largura = camada.limites.largura;
  const altura = camada.limites.altura;

  // O centro da peça nova é o meio do novo contorno, posto de volta no mundo.
  const meio = paraOMundoDaChapa(referencia, minU + largura / 2, minV + altura / 2);
  const nova = novaChapa({
    nome: `${referencia.nome} juntada`,
    plano: referencia.plano,
    largura,
    altura,
    forma,
    furosFixos: camada.furos.map((furo) => furo.map(([u, v]) => [u - minU, v - minV])),
    giro: { ...referencia.giro },
    centro: { x: meio[0], y: meio[1], z: meio[2] },
    grupo: referencia.grupo,
    marcas: referencia.marcas,
    semJuntaAutomatica: true,
  });
  return { chapas: [nova], aviso: null };
}

// --- Inverter e distribuir ----------------------------------------------

// Espelha a chapa no próprio plano. Uma peça espelhada é a peça do outro
// lado da montagem: é assim que sai a lateral esquerda a partir da direita.
export function inverter(chapa) {
  if (chapa.forma && chapa.forma.length >= 3) {
    chapa.forma = chapa.forma.map(([u, v]) => [chapa.largura - u, v]).reverse();
  }
  if (chapa.furosFixos) {
    chapa.furosFixos = chapa.furosFixos.map((furo) =>
      furo.map(([u, v]) => [chapa.largura - u, v]).reverse(),
    );
  }
  const trocar = (lista) => (lista || []).map((item) => ({ ...item }));
  if (chapa.encaixesFixos) {
    const antigos = chapa.encaixesFixos;
    chapa.encaixesFixos = {
      // As bordas de cima e de baixo viram ao contrário; as laterais trocam.
      v0: trocar(antigos.v0).map((item) => ({
        ...item,
        de: chapa.largura - item.ate,
        ate: chapa.largura - item.de,
      })),
      v1: trocar(antigos.v1).map((item) => ({
        ...item,
        de: chapa.largura - item.ate,
        ate: chapa.largura - item.de,
      })),
      u0: trocar(antigos.u1),
      u1: trocar(antigos.u0),
    };
  }
  for (const marca of chapa.marcas || []) {
    marca.x = chapa.largura - marca.x;
    marca.espelhado = !marca.espelhado;
  }
  return chapa;
}

// Espalha as chapas em distâncias iguais ao longo de um eixo do mundo, da
// primeira à última. Serve para alinhar prateleiras sem contar no dedo.
export function distribuir(chapas, eixo = "x") {
  if (chapas.length < 3) return chapas;
  const ordenadas = [...chapas].sort((a, b) => a.centro[eixo] - b.centro[eixo]);
  const comeco = ordenadas[0].centro[eixo];
  const fim = ordenadas[ordenadas.length - 1].centro[eixo];
  const passo = (fim - comeco) / (ordenadas.length - 1);
  ordenadas.forEach((chapa, i) => {
    chapa.centro[eixo] = Math.round((comeco + passo * i) * 10) / 10;
  });
  return chapas;
}
