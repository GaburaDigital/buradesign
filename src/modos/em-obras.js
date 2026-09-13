// Tela usada enquanto um setor não foi construído. Some assim que o módulo
// verdadeiro entrar no lugar em "registro.js".

import { t } from "../core/idioma.js";
import { fala, ELENCO } from "../ui/aliens.js";
import { icone } from "../ui/icones.js";

const RECADOS = {
  zorp: "Já dá para ver a bancada daqui. Estou escolhendo as ferramentas, e vou apertar todas antes de te entregar.",
  nibla: "Os blocos estão numerados, empilhados e conferidos. Duas vezes. Aguarde a fase três.",
  krux: "Chapa boa é chapa medida. Enquanto isso, vá pensando na espessura que sua escola usa.",
  pip: "Eu já testei a gravidade. Funciona. Testei de novo. Continua funcionando. Volte depois.",
};

export function montar(area, setor, aoVoltar) {
  const ficha = ELENCO[setor.alien];
  area.innerHTML = `
    <div class="inicio">
      <div class="inicio__cabecalho">
        <h1>${t(setor.chaveNome)}</h1>
        <p>${t("emObras.titulo")} · fase ${setor.fase} · responsável: ${ficha.nome}</p>
      </div>
      ${fala(setor.alien, RECADOS[setor.alien])}
      <p>${t("emObras.texto")}</p>
    </div>`;

  const voltar = document.createElement("button");
  voltar.type = "button";
  voltar.className = "botao";
  voltar.innerHTML = `${icone("voltar")}<span>${t("acoes.voltar")}</span>`;
  voltar.addEventListener("click", aoVoltar);
  area.querySelector(".inicio").append(voltar);
}
