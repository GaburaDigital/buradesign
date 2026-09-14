// Campo numérico da oficina. Além de digitar, dá para segurar e arrastar para
// cima ou para baixo, que é muito mais rápido para tatear um valor.
// Usado pelos painéis do 2D e do 3D.

export function campoArrastavel({
  rotulo,
  valorInicial,
  passo = 1,
  min = -Infinity,
  max = Infinity,
  inteiro = false,
  sufixo = "",
  aoAplicar,
}) {
  const caixa = document.createElement("label");
  caixa.className = "propriedade propriedade--arrastavel";

  const nome = document.createElement("span");
  nome.className = "propriedade__nome";
  nome.textContent = sufixo ? `${rotulo} (${sufixo})` : rotulo;
  nome.title = "Segure e arraste para cima ou para baixo para mudar o valor";

  const campo = document.createElement("input");
  campo.type = "number";
  campo.step = String(passo);
  campo.value = String(arredondar(valorInicial, inteiro));
  campo.dataset.campo = rotulo;

  const limitar = (numero) => Math.min(max, Math.max(min, numero));

  const aplicar = () => {
    const numero = Number(campo.value);
    if (!Number.isFinite(numero)) return;
    aoAplicar(limitar(inteiro ? Math.round(numero) : numero));
  };

  campo.addEventListener("change", aplicar);
  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      aplicar();
    }
  });

  // Arraste vertical: 6 pixels valem um passo.
  let arrastando = false;
  let inicioY = 0;
  let valorInicialDoArraste = 0;
  let mexeu = false;

  const comecar = (evento) => {
    if (evento.button !== undefined && evento.button !== 0) return;
    arrastando = true;
    mexeu = false;
    inicioY = evento.clientY;
    valorInicialDoArraste = Number(campo.value) || 0;
    nome.setPointerCapture?.(evento.pointerId);
    nome.classList.add("propriedade__nome--arrastando");
  };

  const mover = (evento) => {
    if (!arrastando) return;
    const distancia = inicioY - evento.clientY;
    if (Math.abs(distancia) < 3) return;
    mexeu = true;
    evento.preventDefault();
    const fino = evento.shiftKey ? 0.25 : 1;
    const bruto = valorInicialDoArraste + (distancia / 6) * passo * fino;
    const novo = limitar(inteiro ? Math.round(bruto) : Math.round(bruto * 100) / 100);
    campo.value = String(novo);
    aoAplicar(novo);
  };

  const parar = (evento) => {
    if (!arrastando) return;
    arrastando = false;
    nome.releasePointerCapture?.(evento.pointerId);
    nome.classList.remove("propriedade__nome--arrastando");
    if (!mexeu) campo.focus();
  };

  nome.addEventListener("pointerdown", comecar);
  nome.addEventListener("pointermove", mover);
  nome.addEventListener("pointerup", parar);
  nome.addEventListener("pointercancel", parar);

  caixa.append(nome, campo);
  return caixa;
}

function arredondar(numero, inteiro) {
  return inteiro ? Math.round(numero) : Math.round(numero * 100) / 100;
}
