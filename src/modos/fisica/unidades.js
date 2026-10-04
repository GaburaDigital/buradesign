// A ponte entre o milímetro da oficina e o metro da física.
//
// Todo o BuraDESIGN mede em milímetros, e isso não vai mudar aqui: uma barra
// de 100 mm na bancada é uma barra de 10 cm de verdade. Mas um motor de física
// não trabalha bem em milímetros. O Box2D (e o Planck, que é o Box2D em
// JavaScript) foi afinado para corpos entre 0,1 e 10 "unidades", e todas as
// tolerâncias internas dele — o quanto duas peças podem se sobrepor, o quanto
// um corpo pode andar num passo — são números fixos nessa régua. Jogar
// milímetros direto lá dentro dá dois desastres conhecidos: ou o mundo fica
// gigante e tudo tremelica, ou fica minúsculo e as peças atravessam umas às
// outras.
//
// A solução é uma régua só, escolhida de propósito e escrita aqui em um lugar:
//
//     1 unidade de física = 100 mm = 10 cm
//
// Nessa régua, uma barra de 100 mm tem tamanho 1, uma engrenagem de 40 mm tem
// 0,4 e um chão de 2 metros tem 20. Tudo dentro da faixa boa. E o detalhe que
// importa: por ser uma régua de verdade (não um "fator mágico"), a conversão
// de peso, força e torque sai por conta própria, e os números que aparecem
// para o aluno são números do mundo — gramas, newton-metro, rotações por
// minuto.
//
// As contas de conversão são todas a partir de POR_METRO. Mudar essa constante
// muda a régua inteira de forma consistente; nenhum outro arquivo precisa
// saber que ela existe.

// Unidades de física em um metro de verdade.
export const POR_METRO = 10;

// Unidades de física em um milímetro.
export const POR_MILIMETRO = POR_METRO / 1000;

// A gravidade da Terra na nossa régua.
export const GRAVIDADE = 9.80665 * POR_METRO;

// --- comprimento ---------------------------------------------------------

export const mm = (valorEmMilimetros) => valorEmMilimetros * POR_MILIMETRO;
export const paraMm = (valorEmUnidades) => valorEmUnidades / POR_MILIMETRO;

// --- massa, força e torque -----------------------------------------------
//
// A massa continua em quilogramas de verdade: é a única grandeza que não muda
// de régua, porque a régua é de comprimento. Força e torque, que têm metro
// dentro deles, mudam — força por POR_METRO, torque por POR_METRO ao
// quadrado (porque torque é força vezes distância).

export const newton = (forcaEmNewton) => forcaEmNewton * POR_METRO;
export const newtonMetro = (torqueEmNm) => torqueEmNm * POR_METRO * POR_METRO;
export const paraNewtonMetro = (torqueEmUnidades) => torqueEmUnidades / (POR_METRO * POR_METRO);

// 1 kgf·cm é o jeito que a caixa do servo anuncia o torque dele. Vale
// 0,0980665 N·m.
export const KGFCM_EM_NM = 0.0980665;
export const kgfcm = (valor) => newtonMetro(valor * KGFCM_EM_NM);
export const paraKgfcm = (torqueEmUnidades) => paraNewtonMetro(torqueEmUnidades) / KGFCM_EM_NM;

// --- rotação -------------------------------------------------------------
//
// Radiano por segundo é o que o motor de física entende. Rotação por minuto é
// o que vem escrito no motor amarelo. Grau por segundo é o que vem escrito no
// servo.

export const rpmParaRad = (rpm) => (rpm * 2 * Math.PI) / 60;
export const radParaRpm = (rad) => (rad * 60) / (2 * Math.PI);
export const grausParaRad = (graus) => (graus * Math.PI) / 180;
export const radParaGraus = (rad) => (rad * 180) / Math.PI;

// --- materiais -----------------------------------------------------------
//
// Cada material guarda a densidade de verdade (quilo por metro cúbico) e uma
// espessura típica da escola. Com os dois, o peso da peça sai da área dela —
// e é por isso que a bancada pode dizer "esta barra pesa 23 g" em vez de um
// número abstrato. Quem já cortou MDF sabe que essa é a diferença entre
// adivinhar e entender.

export const MATERIAIS = Object.freeze({
  madeira: {
    id: "madeira",
    nome: "Madeira (MDF)",
    densidade: 700,
    espessura: 6,
    atrito: 0.45,
    quique: 0.12,
  },
  plastico: {
    id: "plastico",
    nome: "Plástico (acrílico)",
    densidade: 1180,
    espessura: 5,
    atrito: 0.3,
    quique: 0.3,
  },
  metal: {
    id: "metal",
    nome: "Metal (alumínio)",
    densidade: 2700,
    espessura: 3,
    atrito: 0.35,
    quique: 0.18,
  },
  papelao: {
    id: "papelao",
    nome: "Papelão (leve)",
    densidade: 250,
    espessura: 4,
    atrito: 0.62,
    quique: 0.04,
  },
  customizado: {
    id: "customizado",
    nome: "Customizado",
    densidade: 700,
    espessura: 6,
    atrito: 0.45,
    quique: 0.15,
  },
});

export const ORDEM_DOS_MATERIAIS = ["madeira", "plastico", "metal", "papelao", "customizado"];

export function material(id) {
  return MATERIAIS[id] || MATERIAIS.madeira;
}

// A receita do material da peça: o que estiver escrito na peça manda, e o
// resto vem do material escolhido. Assim "customizado" é só um material cujos
// campos o aluno encostou a mão.
export function receitaDoMaterial(peca) {
  const base = material(peca?.material);
  return {
    id: base.id,
    nome: base.nome,
    densidade: Number.isFinite(peca?.densidade) ? peca.densidade : base.densidade,
    espessura: Number.isFinite(peca?.espessura) ? peca.espessura : base.espessura,
    atrito: Number.isFinite(peca?.atrito) ? peca.atrito : base.atrito,
    quique: Number.isFinite(peca?.quique) ? peca.quique : base.quique,
  };
}

// A densidade que o motor de física quer: massa por área, na nossa régua.
//
// Dedução, para quem for mexer nisto depois:
//   massa (kg) = densidade (kg/m³) × área (m²) × espessura (m)
//   área em unidades = área em m² × POR_METRO²
//   densidade do motor = massa ÷ área em unidades
//                      = densidade × espessura (m) ÷ POR_METRO²
export function densidadeDeArea(receita) {
  return (receita.densidade * (receita.espessura / 1000)) / (POR_METRO * POR_METRO);
}

// O peso da peça em gramas, que é o número que serve para a aula.
export function pesoEmGramas(areaEmMm2, receita) {
  const areaEmM2 = areaEmMm2 / 1e6;
  return receita.densidade * areaEmM2 * (receita.espessura / 1000) * 1000;
}

export function arredondarPeso(gramas) {
  if (gramas >= 1000) return `${(gramas / 1000).toFixed(2)} kg`;
  if (gramas >= 10) return `${Math.round(gramas)} g`;
  return `${gramas.toFixed(1)} g`;
}
