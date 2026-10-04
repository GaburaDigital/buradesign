# libs

As bibliotecas ficam aqui, versionadas dentro do repositório, para que a
aplicação funcione sem internet e sem etapa de compilação.

O que entra em cada fase, e o que já está aqui:

| Fase | Biblioteca | Versão | Pasta | Para quê |
| --- | --- | --- | --- | --- |
| 1 | Paper.js | 0.12.18 | `paper/` | caminhos, bezier, remodelar e booleanas em 2D |
| 1 | opentype.js | 1.3.4 | `opentype/` | texto com acentos virando caminho |
| 2 | Three.js | 0.169.0 | `three/` | cena 3D, importação e exportação de STL, OBJ e GLB |
| 2 | three-mesh-bvh | 0.7.8 | `csg/` | acelera as booleanas |
| 2 | three-bvh-csg | 0.0.17 | `csg/` | unir peças e subtrair peças negativas |
| 3 | Blockly | 11.2.0 | `blockly/` | blocos no estilo Scratch 3 (renderer `zelos`) |
| 5 | Planck.js | 1.0.0 | `planck/` | física 2D, juntas, motores com torque e engrenagens |
| 5 | poly-decomp | 0.3.0 | `decomp/` | reparte contorno côncavo em partes convexas |
| 5 | (física 3D) | — | — | a escolher quando o modo 3D começar |

O Blockly entra como pacote UMD (`blockly.min.js`, expõe `window.Blockly`) mais
o arquivo de mensagens em português (`msg-pt-br.js`), que precisa ser carregado
depois dele. Os dois só são baixados quando o setor de programação abre.

Regra ao somar uma biblioteca: guarde a versão exata, anote-a nesta tabela,
inclua os arquivos na lista do `sw.js` e suba a `VERSAO` do service worker.

## Por que Planck.js e não Rapier

A tabela antiga reservava Rapier para a fase 5. Na hora de escrever, Planck.js
levou, por três motivos práticos:

1. Planck.js é o Box2D portado para JavaScript — o mesmo motor que o projeto
   pediu de nome. A junta de rotação dele tem exatamente o par que a oficina
   precisa: velocidade alvo e **limite de torque**. É assim que um motor de
   verdade se comporta: ele tenta chegar na velocidade e, se o peso for grande
   demais, não chega. Sem esse limite não existe a lição de "o motor não
   aguenta".
2. A junta de engrenagem (`GearJoint`) garante a razão por cálculo, não por
   dente batendo em dente. Dente colidindo com dente escorrega e atravessa num
   simulador de navegador; a razão travada nunca erra.
3. É JavaScript puro, sem WebAssembly. Um arquivo só, 207 KB, entra no cache do
   service worker como qualquer outro e funciona offline sem truque.

O `decomp` existe por causa de uma regra do Box2D: forma de colisão tem que ser
convexa e com no máximo 8 pontos. Um contorno em "C" vindo da bolsa é côncavo,
então ele é repartido em pedaços convexos antes de virar corpo.

Os dois entram como UMD (`window.planck` e `window.decomp`) e só são baixados
quando o setor de simulação abre.
