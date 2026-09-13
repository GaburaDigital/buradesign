// O elenco fixo da oficina. Cada um cuida de um setor e tem jeito próprio de
// falar. Desenhados em formas chapadas, sem sombra e sem degradê, no espírito
// dos desenhos animados dos anos 90.

const OLHO = "#f2f4f6";
const PUPILA = "#10161c";

function moldura(conteudo, nome) {
  return `<svg viewBox="0 0 100 120" role="img" aria-label="${nome}" xmlns="http://www.w3.org/2000/svg">
    <g stroke="var(--texto)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${conteudo}</g>
  </svg>`;
}

const DESENHOS = {
  zorp: () => moldura(
    `<path d="M50 30 L50 14" fill="none"/>
     <circle cx="50" cy="10" r="6" fill="var(--verde)"/>
     <path d="M36 70 H64 L68 106 H32 Z" fill="var(--alien-zorp)"/>
     <path d="M36 78 L18 60" fill="none"/>
     <circle cx="15" cy="56" r="5" fill="var(--alien-zorp)"/>
     <path d="M64 78 L82 86" fill="none"/>
     <circle cx="85" cy="88" r="5" fill="var(--alien-zorp)"/>
     <ellipse cx="50" cy="46" rx="30" ry="26" fill="var(--alien-zorp)"/>
     <ellipse cx="39" cy="43" rx="9" ry="11" fill="${OLHO}"/>
     <ellipse cx="61" cy="43" rx="9" ry="11" fill="${OLHO}"/>
     <circle cx="41" cy="45" r="4" fill="${PUPILA}" stroke="none"/>
     <circle cx="63" cy="45" r="4" fill="${PUPILA}" stroke="none"/>
     <path d="M40 60 Q50 70 60 60" fill="none"/>
     <rect x="46" y="60" width="6" height="6" fill="${OLHO}"/>
     <path d="M34 106 h12 M54 106 h12" fill="none"/>`,
    "Zorp",
  ),

  nibla: () => moldura(
    `<path d="M30 32 L24 18 M70 32 L76 18" fill="none"/>
     <circle cx="24" cy="15" r="4" fill="var(--alien-nibla)"/>
     <circle cx="76" cy="15" r="4" fill="var(--alien-nibla)"/>
     <path d="M34 70 H66 L70 106 H30 Z" fill="var(--alien-nibla)"/>
     <path d="M34 80 L16 86 M66 80 L84 74" fill="none"/>
     <rect x="22" y="42" width="56" height="44" rx="6" fill="none" stroke="none"/>
     <rect x="24" y="24" width="52" height="46" rx="8" fill="var(--alien-nibla)"/>
     <circle cx="50" cy="45" r="15" fill="${OLHO}"/>
     <circle cx="50" cy="45" r="6" fill="${PUPILA}" stroke="none"/>
     <path d="M30 34 H70" fill="none"/>
     <path d="M42 62 H58" fill="none"/>
     <rect x="40" y="88" width="20" height="14" fill="${OLHO}"/>
     <path d="M44 92 h12 M44 96 h8" stroke-width="1.8" fill="none"/>
     <path d="M32 106 h12 M56 106 h12" fill="none"/>`,
    "Nibla",
  ),

  krux: () => moldura(
    `<path d="M24 74 H76 L80 106 H20 Z" fill="var(--alien-krux)"/>
     <path d="M24 82 L10 70 M76 82 L90 70" fill="none"/>
     <circle cx="8" cy="67" r="5" fill="var(--alien-krux)"/>
     <circle cx="92" cy="67" r="5" fill="var(--alien-krux)"/>
     <ellipse cx="50" cy="48" rx="33" ry="24" fill="var(--alien-krux)"/>
     <path d="M22 40 Q34 30 46 38 M54 38 Q66 30 78 40" fill="none"/>
     <ellipse cx="36" cy="50" rx="8" ry="7" fill="${OLHO}"/>
     <ellipse cx="64" cy="50" rx="8" ry="7" fill="${OLHO}"/>
     <circle cx="36" cy="51" r="3.4" fill="${PUPILA}" stroke="none"/>
     <circle cx="64" cy="51" r="3.4" fill="${PUPILA}" stroke="none"/>
     <path d="M38 64 Q50 58 62 64" fill="none"/>
     <path d="M30 86 H70" fill="none"/>
     <path d="M22 106 h14 M64 106 h14" fill="none"/>`,
    "Krux",
  ),

  pip: () => moldura(
    `<path d="M40 92 L34 110 M60 92 L66 110" fill="none"/>
     <path d="M28 110 h12 M60 110 h12" fill="none"/>
     <circle cx="50" cy="60" r="32" fill="var(--alien-pip)"/>
     <path d="M50 28 L44 12" fill="none"/>
     <path d="M40 12 h10 l-2 6 z" fill="var(--verde)"/>
     <circle cx="38" cy="52" r="7" fill="${OLHO}"/>
     <circle cx="62" cy="52" r="7" fill="${OLHO}"/>
     <circle cx="50" cy="38" r="5" fill="${OLHO}"/>
     <circle cx="39" cy="53" r="3" fill="${PUPILA}" stroke="none"/>
     <circle cx="63" cy="53" r="3" fill="${PUPILA}" stroke="none"/>
     <circle cx="50" cy="39" r="2.4" fill="${PUPILA}" stroke="none"/>
     <path d="M38 70 Q50 82 62 70 Z" fill="${OLHO}"/>
     <path d="M20 62 L8 58 M80 62 L92 58" fill="none"/>`,
    "Pip",
  ),
};

export const ELENCO = Object.freeze({
  zorp: {
    id: "zorp",
    nome: "ZORP",
    cargo: "Criação Livre",
    jeito: "empolgado, aperta todos os botões",
    som: "alienAnimado",
  },
  nibla: {
    id: "nibla",
    nome: "NIBLA",
    cargo: "Design com Programação",
    jeito: "metódica, adora repetição",
    som: "alienOi",
  },
  krux: {
    id: "krux",
    nome: "KRUX",
    cargo: "Montagem com Peças Cortadas",
    jeito: "veterano, fala em milímetros",
    som: "alienResmungo",
  },
  pip: {
    id: "pip",
    nome: "PIP",
    cargo: "Simulação de Mecânica",
    jeito: "hiperativo, testa até quebrar",
    som: "alienAnimado",
  },
});

export function alien(id) {
  const desenho = DESENHOS[id];
  return desenho ? desenho() : "";
}

export function fala(id, texto) {
  const ficha = ELENCO[id];
  if (!ficha) return "";
  return `<div class="fala-alien">${alien(id)}
    <p><strong>${ficha.nome}:</strong> ${texto}</p></div>`;
}
