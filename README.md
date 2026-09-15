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
| Criação Livre | ZORP | escolhe entre Design 2D (corte) e Design 3D (impressão) |
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

As fases 1 e 2 estão no ar: **Criação Livre 2D** e **Criação Livre 3D**. Dá para
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

### Atalhos de teclado e mouse

V seleciona, H arrasta a vista, N remodela, P é a caneta. Ctrl+Z desfaz,
Ctrl+Shift+Z refaz, Ctrl+A seleciona tudo, Ctrl+D duplica, Delete apaga, as
setas empurram a peça de um passo do grid.

Segurar o **botão do meio do mouse** arrasta a vista em qualquer ferramenta.
**Dois cliques** com a seta em cima de uma peça caem direto no remodelador. No
celular e no tablet, a ferramenta **Arrastar**, com ícone de mãozinha, faz o
papel do botão do meio.

### Setor Criação Livre

Ao entrar, o aluno escolhe entre **Design 2D** e **Design 3D**, cada um com um
resumo do que dá para fazer ali. O botão de voltar de dentro de cada bancada
retorna para essa escolha.

### Design 3D

Clique num sólido da lista e ele aparece na base de impressão. Quatorze sólidos
rígidos, do cubo à engrenagem, passando por palito de picolé e palito de
churrasco. Botão direito gira a câmera, botão do meio arrasta, roda aproxima, e
os botões de vista no canto levam a câmera para topo, frente, lados e trás.

Os sólidos ficam agrupados em seis botões (caixas, arredondados, prismas,
palitos, engrenagens e outros); clicar abre as opções daquele grupo.

A garra tem quatro modos: mover na base (B), mover livre (G), girar (R) e
escalar (E). No modo base a peça desliza pelo chão com encaixe no grid, e a
área apoiada acende em verde para o aluno ver onde ela está pousando. Cores e quatro
texturas (lisa, xadrez, linhas e isopor) ajudam a enxergar volume.

Para furar, marque a peça como negativa e clique em combinar: a booleana gera
uma peça nova, e desunir volta atrás. Dá para importar STL, OBJ e GLB para
modificar modelos prontos, e exportar STL da base inteira ou só da seleção.

Peças negativas nunca entram na exportação.

### Ação do toque (celular e tablet)

Dentro da área 3D, no canto superior esquerdo, existe o botão **Ação do
toque**. Ele decide o que o dedo faz na tela: selecionar, somar à seleção,
arrastar a vista ou girar a câmera. O modo escolhido fica escrito ao lado do
botão. Dois dedos sempre aproximam e arrastam, em qualquer modo.

No canto superior direito ficam as vistas da câmera, e na lateral os botões
de zoom. O botão de tela cheia na barra superior ganha bastante espaço.

### Atalhos do 3D

Teclas 1 a 4 trocam o modo de movimento, 6 a 9 trocam a ação do clique e do
toque. O teclado numérico gira a câmera como no Blender (7 topo, 1 frente,
3 direita, 4 esquerda, 9 trás, 5 perspectiva, 2 base). W e S vão e voltam, A e D andam para a esquerda e para a direita, E sobe e Q desce, Q e E sobem e descem, e Shift acelera. A lista completa está no botão
**Atalhos**, dentro das propriedades da base.

### Estilete e texto 3D

O **Estilete** mostra uma folha verde atravessando a peça, no lugar exato em
que o corte vai passar. Direção (horizontal, vertical nos dois sentidos e
quatro diagonais), posição e ângulo fino são ajustados com a folha à vista, e
só corta quando você confirma. "Corte separado" gera duas peças independentes;
"corte completo" devolve uma peça só com a marca do corte.

**Texto 3D** usa as mesmas fontes do 2D, com acentos, e sai com malha fechada,
pronta para o fatiador.

Cada peça pode ser vista como **rígida** (só os cantos aparecem) ou como
**malha** (todas as arestas à mostra). Por enquanto a troca muda a aparência;
a edição por vértice, aresta e face entra na próxima etapa.

### Uma área de criação só

As duas bancadas são a mesma área de trabalho vista de dois jeitos. **Alternar
para 3D** leva o desenho junto: os caminhos da mesa viram volume com a altura
que você informar. **Alternar para 2D** faz o caminho de volta: a fatia que
encosta na base vira contorno na mesa de corte, com um contorno por conjunto
de peças encostadas, e as peças convertidas saem da base. Não passa mais pela tela de
escolha.

No 3D, a ferramenta **Caminho 2D** importa um SVG e já extruda.

### Editar malha

Com uma peça selecionada, **Editar malha** mostra os vértices. Dá para marcar
por vértice, aresta ou face, somando com Shift, e a seta move o que estiver
marcado. Vértices que ocupam o mesmo ponto andam juntos, então a peça não
rasga.

O **Estilete** fica na coluna de ferramentas, abaixo de Texto 3D. Com uma peça
selecionada, ele abre no painel de propriedades e tem dois jeitos, escolhidos
no campo "Como cortar": **plano**, com a folha atravessando a peça, e
**livre**, em que você clica em "Desenhar o corte" e contorna na tela a parte
que sai.

Peça rígida mostra só os cantos, com traço triplo. Peça em modo malha mostra
todas as arestas finas e uma cruz discreta no meio de cada face. Durante a
edição, os modos vértice, aresta e face ficam num grupo flutuante no canto
superior esquerdo da cena, com o modo ativo escrito ao lado.

### Salvamento

O projeto é salvo sozinho no navegador a cada mudança, para o aluno não perder
nada se o aparelho travar ou a aba fechar. O botão de salvar guarda uma cópia
com nome, e o de abrir lista tudo que está salvo. O botão vermelho **Limpar
base** esvazia a mesa e pede confirmação antes.

O salvamento automático pode ser desligado nos Ajustes.

### Temas

Cinco: Escuro, Claro, Sistema (cinzas com marcações vivas), Rosa (rosa e roxo
com marcações claras) e Flash (vermelho e branco, seleção em amarelo, botões
com textura). A mesa de corte acompanha o tema escolhido.

Nos Ajustes também dá para aumentar o **tamanho das alças** de seleção, giro e
dos pontos do remodelador, o que ajuda muito quem está começando e quem usa o
dedo na tela.

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
  nenhum arquivo de áudio. As bibliotecas ficam versionadas em `libs/`.
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
  libs/                 bibliotecas versionadas (ver libs/LEIA-ME.md)
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
na fase 3, Rapier na fase 5. Todas entram em `libs/`, com a versão anotada.

### Testes manuais

Chrome e Safari, em janela larga, tablet e celular. Vale conferir: abertura e
pulo da abertura, som ligado e desligado, troca de tema, salvar e recarregar,
instalação como aplicativo, funcionamento com a rede desligada, e o ciclo
completo de baixar e importar a Bolsa.

### Publicar no GitHub Pages

O site é estático: não tem etapa de compilação e o `index.html` fica na raiz.

1. Em **Settings > Pages**, escolha **Source: Deploy from a branch**, branch
   `main`, pasta `/ (root)`.
2. Confirme que o `index.html` está na **raiz** do repositório, e não dentro de
   uma pasta `buradesign/`. Se estiver dentro, o endereço não abre.
3. O arquivo `.nojekyll` precisa estar na raiz. Ele desliga o Jekyll, que é o
   processador que o GitHub aplica por padrão e que ignora algumas pastas.
   Cuidado: ao arrastar arquivos para o navegador, o sistema costuma esconder
   arquivos que começam com ponto. Se ele não subir, crie direto pelo site em
   **Add file > Create new file**, com o nome `.nojekyll`, e salve vazio.
4. Se preferir **Source: GitHub Actions**, mantenha o
   `.github/workflows/pages.yml`. Se usar a opção de branch, **apague** esse
   arquivo para não conflitar.

As bibliotecas ficam em `libs/`, e não em `vendor/`, de propósito: `vendor` é
um nome que o Jekyll costuma tratar como pasta de dependências e deixar de
fora da publicação.

### Licença

MIT, adicionada pelo repositório.
