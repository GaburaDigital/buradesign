// A chapa: material, espessura, folga de corte e tamanho da folha.
//
// Tudo o que decide o encaixe mora aqui. A espessura manda no tamanho do dedo
// e na profundidade do entalhe; o kerf é o quanto a máquina come de material
// ao passar. Errar isso é a diferença entre a peça entrar na mão e não entrar
// de jeito nenhum — por isso o aluno vê os dois números na tela.

const CHAVE = "buradesign:corte";

export const MATERIAIS = [
  { id: "mdf3", nome: "MDF 3 mm", espessura: 3, kerf: 0.2 },
  { id: "mdf6", nome: "MDF 6 mm", espessura: 6, kerf: 0.2 },
  { id: "mdf9", nome: "MDF 9 mm", espessura: 9, kerf: 0.25 },
  { id: "papelao2", nome: "Papelão 2 mm", espessura: 2, kerf: 0.3 },
  { id: "papelao4", nome: "Papelão 4 mm", espessura: 4, kerf: 0.35 },
  { id: "acrilico3", nome: "Acrílico 3 mm", espessura: 3, kerf: 0.15 },
  { id: "eva5", nome: "EVA 5 mm", espessura: 5, kerf: 0.5 },
  { id: "livre", nome: "Outra espessura", espessura: 4, kerf: 0.2 },
];

export const CHAPAS = [
  { id: "a4", nome: "A4 (210 × 297)", largura: 210, altura: 297 },
  { id: "a3", nome: "A3 (297 × 420)", largura: 297, altura: 420 },
  { id: "p300", nome: "Quadrada 300 × 300", largura: 300, altura: 300 },
  { id: "p600", nome: "Meia chapa 600 × 400", largura: 600, altura: 400 },
  { id: "livre", nome: "Outro tamanho", largura: 400, altura: 300 },
];

const PADRAO = {
  material: "mdf3",
  espessura: 3,
  kerf: 0.2,
  // Folga do encaixe: além do kerf, o quanto se afrouxa o dedo para a peça
  // entrar sem martelo. Zero funciona em acrílico; em MDF costuma precisar.
  folga: 0.1,
  chapa: "p300",
  chapaLargura: 300,
  chapaAltura: 300,
  // Espaço entre as peças no arranjo, para o corte de uma não invadir a outra.
  respiro: 2,
  // Tamanho pedido para o dedo. O gerador ajusta para caber um número ímpar.
  dedo: 12,
};

let atual = { ...PADRAO };

function ler() {
  try {
    const cru = localStorage.getItem(CHAVE);
    const lido = cru ? JSON.parse(cru) : null;
    return lido && typeof lido === "object" ? { ...PADRAO, ...lido } : { ...PADRAO };
  } catch {
    return { ...PADRAO };
  }
}

function gravar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    // aula em janela anônima: segue sem guardar
  }
}

export function carregar() {
  atual = ler();
  return atual;
}

export function valores() {
  return { ...atual };
}

export function definir(mudanca) {
  atual = { ...atual, ...mudanca };

  // Escolher um material traz a espessura e o kerf dele junto; "outra
  // espessura" deixa os dois campos livres.
  if (mudanca.material) {
    const material = MATERIAIS.find((item) => item.id === mudanca.material);
    if (material && material.id !== "livre") {
      atual.espessura = material.espessura;
      atual.kerf = material.kerf;
    }
  }
  if (mudanca.chapa) {
    const chapa = CHAPAS.find((item) => item.id === mudanca.chapa);
    if (chapa && chapa.id !== "livre") {
      atual.chapaLargura = chapa.largura;
      atual.chapaAltura = chapa.altura;
    }
  }
  if (mudanca.espessura !== undefined || mudanca.kerf !== undefined) {
    const material = MATERIAIS.find((item) => item.id === atual.material);
    if (material && material.id !== "livre") {
      const mexeu =
        Math.abs(atual.espessura - material.espessura) > 0.001 ||
        Math.abs(atual.kerf - material.kerf) > 0.001;
      if (mexeu) atual.material = "livre";
    }
  }
  if (mudanca.chapaLargura !== undefined || mudanca.chapaAltura !== undefined) {
    const chapa = CHAPAS.find((item) => item.id === atual.chapa);
    if (chapa && chapa.id !== "livre") {
      const mexeu = atual.chapaLargura !== chapa.largura || atual.chapaAltura !== chapa.altura;
      if (mexeu) atual.chapa = "livre";
    }
  }

  atual.espessura = Math.min(30, Math.max(0.5, Number(atual.espessura) || 3));
  atual.kerf = Math.min(3, Math.max(0, Number(atual.kerf) || 0));
  atual.folga = Math.min(2, Math.max(0, Number(atual.folga) || 0));
  atual.dedo = Math.min(80, Math.max(3, Number(atual.dedo) || 12));
  atual.respiro = Math.min(20, Math.max(0, Number(atual.respiro) || 0));
  atual.chapaLargura = Math.min(3000, Math.max(50, Number(atual.chapaLargura) || 300));
  atual.chapaAltura = Math.min(3000, Math.max(50, Number(atual.chapaAltura) || 300));
  gravar();
  return { ...atual };
}

export function nomeDoMaterial() {
  const material = MATERIAIS.find((item) => item.id === atual.material);
  if (!material || material.id === "livre") return `Chapa de ${atual.espessura} mm`;
  return material.nome;
}

export function restaurar() {
  atual = { ...PADRAO };
  gravar();
  return { ...atual };
}
