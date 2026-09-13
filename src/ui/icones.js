// Ícones desenhados à mão em SVG, grade de 24 por 24, traço grosso.
// Regra da casa: nada de emoji, corpo em cinza metálico e um detalhe verde.
// Para somar um ícone, escreva a função e registre no objeto ICONES.

const CORPO = "var(--metal-medio)";
const CLARO = "var(--metal-claro)";
const TRACO = "var(--texto)";

function moldura(conteudo, titulo) {
  const rotulo = titulo
    ? `role="img" aria-label="${titulo}"`
    : 'aria-hidden="true" focusable="false"';
  return `<svg class="icone" viewBox="0 0 24 24" ${rotulo} xmlns="http://www.w3.org/2000/svg">${conteudo}</svg>`;
}

const ICONES = {
  cubo: () => `
    <path d="M12 3 L20 7.5 L12 12 L4 7.5 Z" fill="${CLARO}" stroke="${TRACO}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M4 7.5 L12 12 L12 21 L4 16.5 Z" fill="${CORPO}" stroke="${TRACO}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M20 7.5 L20 16.5 L12 21 L12 12 Z" fill="none" stroke="var(--verde)" stroke-width="1.6" stroke-linejoin="round" stroke-dasharray="2.5 1.8"/>`,

  engrenagem: () => `
    <g fill="${CORPO}" stroke="${TRACO}" stroke-width="1.4">
      <rect x="10.6" y="1.8" width="2.8" height="4.2"/>
      <rect x="10.6" y="18" width="2.8" height="4.2"/>
      <rect x="1.8" y="10.6" width="4.2" height="2.8"/>
      <rect x="18" y="10.6" width="4.2" height="2.8"/>
      <rect x="4" y="4" width="2.8" height="4.2" transform="rotate(-45 5.4 6.1)"/>
      <rect x="17.2" y="4" width="2.8" height="4.2" transform="rotate(45 18.6 6.1)"/>
      <rect x="4" y="15.8" width="2.8" height="4.2" transform="rotate(45 5.4 17.9)"/>
      <rect x="17.2" y="15.8" width="2.8" height="4.2" transform="rotate(-45 18.6 17.9)"/>
      <circle cx="12" cy="12" r="6.4"/>
    </g>
    <circle cx="12" cy="12" r="2.6" fill="var(--fundo)" stroke="var(--verde)" stroke-width="1.6"/>`,

  bolsa: () => `
    <path d="M6 8 H18 L20 21 H4 Z" fill="${CORPO}" stroke="${TRACO}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M8.5 8 V6 A3.5 3.5 0 0 1 15.5 6 V8" fill="none" stroke="${TRACO}" stroke-width="1.6"/>
    <rect x="9" y="12" width="6" height="2.4" fill="var(--verde)"/>`,

  disquete: () => `
    <path d="M3.5 3.5 H17 L20.5 7 V20.5 H3.5 Z" fill="${CORPO}" stroke="${TRACO}" stroke-width="1.6" stroke-linejoin="round"/>
    <rect x="7" y="3.5" width="8" height="6" fill="${CLARO}" stroke="${TRACO}" stroke-width="1.4"/>
    <rect x="11.5" y="4.8" width="2.2" height="3.4" fill="var(--verde)"/>
    <rect x="6.5" y="13" width="11" height="7.5" fill="var(--fundo)" stroke="${TRACO}" stroke-width="1.4"/>`,

  baixar: () => `
    <path d="M12 3 V13" stroke="${TRACO}" stroke-width="1.8"/>
    <path d="M7 10 L12 15 L17 10" fill="none" stroke="var(--verde)" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M4 16 V20.5 H20 V16" fill="none" stroke="${TRACO}" stroke-width="1.8" stroke-linejoin="round"/>`,

  enviar: () => `
    <path d="M12 20 V10" stroke="${TRACO}" stroke-width="1.8"/>
    <path d="M7 13 L12 8 L17 13" fill="none" stroke="var(--verde)" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M4 5 V3.5 H20 V5" fill="none" stroke="${TRACO}" stroke-width="1.8" stroke-linejoin="round"/>`,

  lixeira: () => `
    <path d="M5 6 H19" stroke="${TRACO}" stroke-width="1.8"/>
    <path d="M9.5 6 V3.8 H14.5 V6" fill="none" stroke="${TRACO}" stroke-width="1.6"/>
    <path d="M6.5 6 L7.6 20.5 H16.4 L17.5 6 Z" fill="${CORPO}" stroke="${TRACO}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M10.3 10 V17 M13.7 10 V17" stroke="var(--fundo)" stroke-width="1.6"/>`,

  cadeado: () => `
    <path d="M8 10 V7.5 A4 4 0 0 1 16 7.5 V10" fill="none" stroke="${TRACO}" stroke-width="1.8"/>
    <rect x="4.5" y="10" width="15" height="10.5" fill="${CORPO}" stroke="${TRACO}" stroke-width="1.6"/>
    <rect x="10.8" y="13.4" width="2.4" height="4.2" fill="var(--verde)"/>`,

  aviso: () => `
    <path d="M12 3 L22 20.5 H2 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <rect x="11" y="9" width="2" height="6" fill="currentColor"/>
    <rect x="11" y="16.5" width="2" height="2" fill="currentColor"/>`,

  fechar: () => `
    <path d="M5 5 L19 19 M19 5 L5 19" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/>`,

  voltar: () => `
    <path d="M20 12 H5" stroke="${TRACO}" stroke-width="1.8"/>
    <path d="M10 7 L5 12 L10 17" fill="none" stroke="var(--verde)" stroke-width="1.8" stroke-linejoin="round"/>`,

  janela: () => `
    <rect x="2.5" y="4" width="19" height="16" fill="${CORPO}" stroke="${TRACO}" stroke-width="1.6"/>
    <rect x="2.5" y="4" width="19" height="4" fill="${CLARO}" stroke="${TRACO}" stroke-width="1.6"/>
    <rect x="5" y="5.4" width="2" height="1.4" fill="var(--verde)"/>
    <path d="M6 12 H18 M6 15.5 H14" stroke="var(--fundo)" stroke-width="1.6"/>`,
};

export function icone(nome, titulo) {
  const desenho = ICONES[nome];
  if (!desenho) return "";
  return moldura(desenho(), titulo);
}

export function nomesDeIcones() {
  return Object.keys(ICONES);
}
