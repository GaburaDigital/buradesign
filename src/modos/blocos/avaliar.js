// Como o desafio decide se está certo.
//
// Nada de comparar o programa do aluno com o programa "certo": caminhos
// diferentes podem chegar na mesma peça, e é justamente isso que queremos que
// eles descubram. Quem é medido é o resultado — as medidas da peça montada.
// Assim a nota é explicável: dá para mostrar linha por linha o que era para
// dar e o que deu.

import * as THREE from "three";
import { cena3d } from "../livre3d/cena.js";
import { caixaDaPeca } from "../livre3d/pecas.js";
import { volumeComSinal } from "../livre3d/solidos.js";

export const ESTRELAS = [
  { minimo: 97, estrelas: 3 },
  { minimo: 92, estrelas: 2 },
  { minimo: 85, estrelas: 1 },
];

const ROTULOS = {
  largura: "Largura (X)",
  altura: "Altura (Y)",
  profundidade: "Profundidade (Z)",
  pecas: "Peças na base",
  volume: "Volume",
  centroX: "Centro em X",
  centroY: "Centro em Y",
  centroZ: "Centro em Z",
  base: "Altura do vão embaixo",
};

const UNIDADES = {
  pecas: "",
  volume: " cm³",
};

function unidade(tipo) {
  return tipo in UNIDADES ? UNIDADES[tipo] : " mm";
}

// Volume de verdade da malha, já contando a escala da peça. Peça negativa
// conta como buraco: desconta em vez de somar.
function volumeDaPeca(peca) {
  const bruto = Math.abs(volumeComSinal(peca.geometry));
  const escala = Math.abs(peca.scale.x * peca.scale.y * peca.scale.z) || 1;
  return bruto * escala;
}

export function medir() {
  const todas = (cena3d.grupoPecas?.children || []).filter((peca) => peca.visible !== false);
  const positivas = todas.filter((peca) => !peca.userData.negativo);
  const vazio = {
    pecas: 0,
    largura: 0,
    altura: 0,
    profundidade: 0,
    volume: 0,
    centroX: 0,
    centroY: 0,
    centroZ: 0,
    base: 0,
  };
  if (!positivas.length) return vazio;

  // Mede a forma, não os enfeites: contorno e pontos da malha são filhos da
  // peça e entrariam na conta se a medida viesse do objeto inteiro.
  const caixa = new THREE.Box3();
  const daPeca = new THREE.Box3();
  for (const peca of positivas) caixa.union(caixaDaPeca(peca, daPeca));
  const tamanho = caixa.getSize(new THREE.Vector3());
  const centro = caixa.getCenter(new THREE.Vector3());
  const meioDaBase = { x: cena3d.base.largura / 2, z: cena3d.base.profundidade / 2 };

  let volume = 0;
  for (const peca of todas) {
    volume += peca.userData.negativo ? -volumeDaPeca(peca) : volumeDaPeca(peca);
  }

  return {
    pecas: positivas.length,
    largura: tamanho.x,
    altura: tamanho.y,
    profundidade: tamanho.z,
    // Em centímetros cúbicos: milímetro cúbico dá número grande demais para
    // um aluno conferir de cabeça.
    volume: Math.max(0, volume) / 1000,
    centroX: centro.x - meioDaBase.x,
    centroY: centro.y,
    centroZ: centro.z - meioDaBase.z,
    base: Math.max(0, caixa.min.y),
  };
}

// Acerto em cheio dentro da folga, e cai até zero no limite. Entre os dois,
// desce em linha reta.
function nota(erro, folga, limite) {
  if (erro <= folga) return 1;
  if (erro >= limite) return 0;
  return 1 - (erro - folga) / (limite - folga);
}

export function conferir(metas, medidas = medir()) {
  const linhas = [];
  let soma = 0;
  let pesos = 0;

  for (const meta of metas) {
    const folga = meta.folga ?? (meta.tipo === "pecas" ? 0 : 0.6);
    const limite = meta.limite ?? (meta.tipo === "pecas" ? 1 : Math.max(4, Math.abs(meta.alvo) * 0.25));
    const peso = meta.peso ?? 1;
    const real = medidas[meta.tipo] ?? 0;
    const erro = Math.abs(real - meta.alvo);
    const valor = nota(erro, folga, limite);
    soma += valor * peso;
    pesos += peso;
    linhas.push({
      rotulo: meta.rotulo || ROTULOS[meta.tipo] || meta.tipo,
      alvo: meta.alvo,
      real,
      unidade: unidade(meta.tipo),
      acertou: valor >= 0.999,
      limite,
      porcentagem: Math.round(valor * 100),
      casas: meta.tipo === "pecas" ? 0 : 1,
    });
  }

  const porcentagem = pesos ? Math.round((soma / pesos) * 100) : 0;
  const faixa = ESTRELAS.find((nivel) => porcentagem >= nivel.minimo);
  return { porcentagem, estrelas: faixa ? faixa.estrelas : 0, linhas };
}

// Frase curta para o aluno saber o que olhar primeiro.
export function recado(resultado) {
  if (!resultado.linhas.length) return "Este desafio não tem medidas para conferir.";
  if (resultado.estrelas === 3) return "Medidas certas. Três estrelas.";
  const pior = resultado.linhas.reduce((a, b) => (a.porcentagem <= b.porcentagem ? a : b));
  if (pior.porcentagem >= 100) return "Quase lá: ajuste os detalhes para fechar as três estrelas.";
  const sinal = pior.real > pior.alvo ? "passou" : "faltou";
  return `Olhe ${pior.rotulo.toLowerCase()}: ${sinal} (${pior.real.toFixed(pior.casas)}${pior.unidade} para ${pior.alvo}${pior.unidade}).`;
}
