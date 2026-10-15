# Grupo em tempo real (Firestore)

Todo mundo do grupo vê e edita os mesmos dados, e a mudança de uma pessoa aparece nas outras em poucos segundos.
Funciona sem internet: as edições ficam salvas no aparelho e sobem quando a conexão volta.

## Como funciona
- Cada item (reunião, tarefa, ideia, GT, pessoa) é um documento em `grupos/{codigo}/itens/{colecao}:{id}` no Firestore
  (projeto Firebase `sos-lagoa`, dados públicos em `js/firebase-config.js`).
- Editar itens diferentes nunca gera conflito. No **mesmo item**, vale o último a salvar.
- Apagar **não apaga de verdade**: o documento fica marcado com `apagado: true` (as regras proíbem `delete`). Para recuperar,
  edite o documento no console do Firebase (Firestore → `grupos` → código → item) e troque `apagado` para `false`.
- `js/sync-core.js` decide o que enviar/receber comparando três versões de cada item (local, grupo e a última igual ao grupo);
  `js/sync.js` liga isso ao Firebase. O SDK vem empacotado em `vendor/firebase/` (ver `LEIA-ME.txt` lá).

## Entrada automática (sem digitar código)
O site publicado já leva o código do grupo embutido (`js/grupo-padrao.js`, escrito só na hora de publicar com `./publicar.sh`;
no GitHub o arquivo fica **vazio**). Quem abre o endereço do site entra direto no grupo, sem digitar nada. Quem sai de propósito
(Ajustes → Sair do grupo) não volta sozinho. O link de convite `…/?g=CODIGO` continua funcionando e prevalece sobre o padrão.
**Consequência:** qualquer pessoa que souber o endereço do site vê e edita tudo. Mande o endereço só para quem é do movimento.
Para voltar a exigir código, publique com o arquivo vazio.

## Segurança
- O **código do grupo** é o segredo: quem não o conhece não consegue ler nem escrever (as regras só liberam o caminho com o código
  e proíbem listar os grupos). **Nunca coloque o código no repositório ou no site.** Cada aparelho guarda o código só em `localStorage`,
  e entra por um link de convite `…/?g=CODIGO` (o código sai da barra de endereço na hora).
- Quem tem o código/convite lê e edita tudo. Mande o convite só a quem é do movimento. Se vazar, crie outro código (novo grupo)
  e peça para as pessoas entrarem nele.
- Regras do Firestore em uso (console → Firestore → Regras):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /grupos/{codigo}/itens/{item} {
      allow read: if codigo.size() >= 16;
      allow create, update: if codigo.size() >= 16
        && request.resource.data.keys().hasAll(['colecao', 'id', 'dados'])
        && request.resource.data.keys().hasOnly(['colecao', 'id', 'dados', 'apagado', 'em', 'por'])
        && request.resource.data.colecao in ['eventos', 'encaminhamentos', 'ideias', 'frentes', 'pessoas']
        && request.resource.data.dados is string
        && request.resource.data.dados.size() < 60000;
      allow delete: if false;
    }
  }
}
```

## Cuidados
- Dentro do grupo, “Restaurar backup”, “Carregar exemplos” e “Apagar tudo” ficam desligados (apagariam/duplicariam para todos).
- Um código novo, sem dados, pede confirmação antes de criar o grupo (evita criar um grupo vazio por erro de digitação).
- Limites do plano gratuito do Firebase (Spark): ~50 mil leituras e 20 mil escritas por dia. O uso de um grupo de movimento fica muito abaixo.
- Backup: *Ajustes → Baixar backup*. Backup automático do Firebase exige plano pago.
