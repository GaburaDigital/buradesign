# BuraDESIGN

Aplicação web de CAD e modelagem 3D para uso em sala de aula. Desenho em 2D
para corte a laser, modelagem em 3D para impressão, programação em blocos e
simulação de mecânica. Roda no navegador, sem instalação obrigatória, sem conta
e sem internet depois da primeira visita.

**Acessar:** https://gaburadigital.github.io/buradesign/

---

## Parte 1 — Para professores

### O que é

Uma oficina espacial onde quatro alienígenas ajudam a construir peças. Cada um
cuida de um setor:

| Setor | Responsável | O que o aluno faz |
| --- | --- | --- |
| Criação Livre | ZORP | desenha em 2D e modela em 3D do jeito tradicional |
| Design com Programação | NIBLA | cria as mesmas peças programando em blocos |
| Montagem com Peças Cortadas | KRUX | monta em 3D e gera o plano de corte em chapa |
| Simulação de Mecânica | PIP | testa alavancas, engrenagens e motores |

O que o aluno cria em um setor pode ser guardado na **Bolsa** e reaproveitado
em qualquer outro.

### Como usar em aula

1. Abra o endereço acima em qualquer computador da sala. Não peça login,
   porque não existe login.
2. Na primeira visita, a aplicação baixa tudo. Da segunda em diante funciona
   mesmo com a internet da escola fora do ar.
3. No Chrome, o botão de instalar aparece na barra de endereço. No iPad, use
   Compartilhar e depois Adicionar à Tela de Início. Instalado, o ícone do cubo
   fica junto dos outros aplicativos.
4. Tudo que o aluno salva fica no computador dele. Para levar o trabalho para
   casa ou entregar para você, ele usa **Baixar bolsa**, que gera um arquivo.

### Ajustes que valem a pena conhecer

- **Tema claro ou escuro.** O escuro cansa menos em sala com projetor; o claro
  imprime melhor em captura de tela.
- **Efeitos sonoros.** Podem ser desligados em sala cheia.
- **Unidade de medida.** Centímetros por padrão, milímetros quando o trabalho
  for para a cortadora.
- **Encaixe no grid.** Passo de 5 mm por padrão. Diminua para trabalho fino,
  desligue para desenho livre.
- **Salvar preferências.** As escolhas só ficam guardadas depois desse botão.
- **Limpar cache.** Apaga preferências e os arquivos guardados para uso
  offline. Não apaga a Bolsa.

### Distribuir material para a turma

A Bolsa vira um arquivo `.json`. Monte um kit de peças no seu computador, use
**Baixar bolsa** e mande o arquivo para a turma. Cada aluno usa **Importar
bolsa** e recebe as peças sem perder as dele, porque a importação soma em vez
de substituir.

### Estado atual

A fase 1 está no ar: o setor **Criação Livre** já funciona em 2D. Dá para
desenhar formas, escrever texto com acento, curvar caminhos com a caneta,
combinar peças com peça negativa, ajustar tudo por número e exportar o SVG
para a cortadora. Os outros três setores ainda estão em obras.

### O que fazer no setor Criação Livre

Escolha uma forma na caixa de ferramentas e clique na mesa. Com a peça
selecionada, as alças giram e redimensionam; segurando Shift o movimento sai
reto, o giro pula de 45 em 45 graus e a escala mantém a proporção. A roda do
mouse aproxima, com Ctrl sobe e desce, com Shift vai para os lados.

Para furar uma peça, marque a outra como **negativa** e clique em combinar: o
que a negativa encostar some. A peça combinada guarda as originais, então o
botão desunir volta atrás quando o aluno se arrepende.

O botão de exportar gera o SVG em milímetros, só com o contorno, no tamanho
real da mesa. A cor de preenchimento é apenas para enxergar na tela e não sai
no corte. Se houver peças selecionadas, exporta só elas; se não houver,
exporta a mesa inteira.

### Atalhos de teclado

V seleciona, N remodela, P é a caneta. Ctrl+Z desfaz, Ctrl+Shift+Z refaz,
Ctrl+A seleciona tudo, Ctrl+D duplica, Delete apaga, as setas empurram a peça
de um passo do grid.

| Fase | Entrega |
| --- | --- |
| 0 | Casca: abertura, instalação, ajustes, som, Bolsa, tela inicial |
| 1 | Criação Livre em 2D, com caminhos, bezier e exportação em SVG |
| 2 | Criação Livre em 3D, com formas rígidas, corte e exportação em STL |
| 3 | Design com Programação, com 60 desafios em lotes de 20 |
| 4 | Montagem com Peças Cortadas, com encaixes e plano de corte |
| 5 | Simulação de Mecânica, com juntas e motores |

---

## Parte 2 — Escopo técnico

### Princípios do projeto

- **Sem etapa de compilação.** Módulos ES nativos servidos direto pelo GitHub
  Pages. Clonar, abrir por um servidor local e já está rodando.
- **Sem rede em tempo de execução.** Nenhuma CDN, nenhuma fonte externa,
  nenhum arquivo de áudio. As bibliotecas ficam versionadas em `vendor/`.
- **Tudo em módulos pequenos.** Um arquivo por assunto, para que somar um setor
  não exija mexer na casca.

### Estrutura

```
buradesign/
  index.html              casca mínima; todo o resto é montado por JS
  manifest.webmanifest    instalação como aplicativo
  sw.js                   cache offline (atualize VERSAO ao mexer em arquivos)
  catalogo.json           índice do conteúdo de ATIVIDADES
  assets/                 favicon e ícones do aplicativo
  i18n/pt-BR.js           todos os textos da interface
  src/core/               estado, preferências, depósito, som, arquivos, boot
  src/ui/                 casca, painéis, ícones, aliens, tela inicial
  src/modos/              um módulo por setor, carregado sob demanda
  styles/                 tokens, base, casca, telas
  vendor/                 bibliotecas versionadas (ver vendor/LEIA-ME.md)
  ATIVIDADES/             conteúdo dos exercícios (ver ATIVIDADES/LEIA-ME.md)
```

### Módulos principais

| Arquivo | Responsabilidade |
| --- | --- |
| `src/core/app.js` | ponto de entrada; liga preferências, abertura e casca |
| `src/core/ajustes.js` | preferências; aplica na hora, persiste só ao salvar |
| `src/core/deposito.js` | IndexedDB (`bolsa` e `projetos`) |
| `src/core/bolsa.js` | regras da Bolsa: listar, somar, exportar, importar |
| `src/core/som.js` | sons sintetizados na Web Audio API |
| `src/core/boot.js` | abertura em estilo terminal, pulável |
| `src/core/idioma.js` | `t()` e registro de idiomas |
| `src/core/catalogo.js` | leitura do `catalogo.json` |
| `src/ui/casca.js` | barras, navegação e carregamento de setores |
| `src/ui/painel.js` | janelas, confirmações e avisos |
| `src/modos/registro.js` | lista dos setores e seus carregadores |

### Como somar um setor

1. Crie `src/modos/<id>.js` exportando `montar(area, setor, aoVoltar)`.
2. Em `src/modos/registro.js`, aponte `carregar` para o novo módulo e troque
   `aberto` para `true`.
3. Some os arquivos novos à lista do `sw.js` e suba a `VERSAO`.

Nada mais precisa mudar. A casca, os ajustes e a Bolsa já estão disponíveis
para o setor novo.

### Armazenamento

| Onde | O que | Chave |
| --- | --- | --- |
| localStorage | preferências | `buradesign:ajustes` |
| IndexedDB | Bolsa e projetos | banco `buradesign` |

A separação é proposital: limpar preferências não pode custar o trabalho do
aluno, e malhas 3D passariam do limite do localStorage.

### Idiomas

`i18n/pt-BR.js` exporta um objeto com todos os textos. Para somar um idioma,
copie o arquivo, traduza os valores e registre o código em `src/core/idioma.js`.
O seletor de idioma aparece nos Ajustes assim que existir mais de uma opção.

### Bibliotecas previstas

Paper.js e opentype.js na fase 1, Three.js e three-bvh-csg na fase 2, Blockly
na fase 3, Rapier na fase 5. Todas entram em `vendor/`, com a versão anotada.

### Testes manuais

Chrome e Safari, em janela larga, tablet e celular. Vale conferir: abertura e
pulo da abertura, som ligado e desligado, troca de tema, salvar e recarregar,
instalação como aplicativo, funcionamento com a rede desligada, e o ciclo
completo de baixar e importar a Bolsa.

### Licença

MIT, adicionada pelo repositório.
