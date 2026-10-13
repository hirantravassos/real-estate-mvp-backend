# Auditoria LGPD, termos e consumidor, 13/10/2026

Escopo: `real-estate-mvp-frontend` e `real-estate-mvp-backend`, ramo
`claude/sweet-galileo-w819ui`. Comparação entre o que os Termos, a Política de
Privacidade e a Política de Cookies prometem e o que o código faz de verdade.
Contexto: a plataforma é oferecida por **pessoa física (CPF)**, não por empresa.

> Isto é uma auditoria técnica, não parecer jurídico. Antes de divulgar, valide
> os itens P0 com um advogado de proteção de dados e os itens fiscais com um
> contador.

## Resumo executivo

Os textos legais estão bem escritos, mas **prometem coisas que o sistema não
faz** e **não mencionam funcionalidades de maior risco** que o sistema faz. Os
maiores riscos não estão nos textos, estão em quatro funcionalidades:

1. Busca de imóveis nos portais e "Achar proprietário": raspagem automatizada
   com **contas da própria plataforma**, user agent falso e pausas "humanas",
   coleta de nome, telefone, e-mail e CRECI de anunciantes, cópia de até 25
   fotos de terceiros com a **marca do corretor carimbada** e descrição limpa
   para esconder o anunciante original. Aqui você não é operador, é
   **controlador** e é quem viola os termos dos portais e possivelmente direitos
   autorais.
2. Avatar por foto: a IA infere **tom de pele e gênero** a partir da foto de
   perfil do WhatsApp de clientes. Tom de pele é indicativo de origem racial,
   **dado sensível** (art. 5º, II e art. 11), sem consentimento, e a Política
   diz "não pedimos dados sensíveis".
3. Importação de contatos: conversas de **todos** os contatos não clientes
   (família, amigos) vão para a OpenAI antes de a IA classificar como pessoais.
4. Não existe exclusão de conta, exportação de dados, expurgo em 90 dias nem
   registro de acesso, embora a Política prometa tudo isso.

Como você atua como **pessoa física**, responde com **patrimônio pessoal**, sem
separação entre o negócio e você. Isso torna os itens P0 mais urgentes.

## 1. Atuar como CPF

| Ponto | Situação | Ação |
| --- | --- | --- |
| Identificação nos textos | Termos e Política dizem "oferecida por {razão social}, **inscrita no CNPJ** sob o nº, **com sede** em" (`terms.document.tsx:58-61`, `privacy.document.tsx:79-81`). Com CPF o texto fica juridicamente errado. Sem as variáveis, aparecem os marcadores "[CNPJ 00.000.000/0000-00]" (`legal.constants.ts:23-34`). | Reescrever para "oferecida por {nome completo}, pessoa física, inscrita no CPF sob o nº, com endereço em". Ajustar também "sócios, administradores" (Indenização) e "reorganização societária" (Disposições gerais e Compartilhamento). |
| Decreto 7.962/2013, art. 2º | Comércio eletrônico deve mostrar em local de destaque nome, **CPF ou CNPJ**, endereço físico e contato. O rodapé (`site-footer.tsx:106-115`) some com cada campo vazio, e as variáveis são opcionais; o build não falha. | Tornar `NEXT_PUBLIC_COMPANY_NAME`, `_DOCUMENT`, `_ADDRESS`, `_FORUM_CITY`, `_SUPPORT_EMAIL`, `_PRIVACY_EMAIL` e `_DATA_PROTECTION_OFFICER` obrigatórias em produção. |
| Exposição do seu CPF e endereço | A obrigação acima expõe seu endereço residencial publicamente. | Avaliar endereço comercial ou escritório virtual (aceito como endereço físico) e mostrar o CPF parcialmente mascarado só se o advogado concordar; o decreto pede o número. |
| Agente de pequeno porte (Res. CD/ANPD 2/2022) | Pessoa natural com fins econômicos se enquadra, **exceto** se o tratamento for de alto risco (critério geral, como larga escala, somado a critério específico, como tecnologia emergente/IA ou dado sensível). Raspagem em massa + IA + inferência de tom de pele empurram para alto risco. | Removendo os itens P0, o regime simplificado fica defensável. Mesmo dispensado de encarregado, é obrigatório manter canal com o titular (Res. CD/ANPD 18/2024, art. 3º, § 3º). Preencher `NEXT_PUBLIC_DATA_PROTECTION_OFFICER` com seu nome. |
| Marco Civil, art. 15 | A guarda de registros de acesso por 6 meses é obrigatória para provedor **constituído como pessoa jurídica**. Como CPF, em tese não se aplica, mas a Política **promete** guardar. | Ou implementar (recomendado, ajuda em fraude e prova), ou tirar a promessa do texto. |
| Fiscal | Termos dizem que "o documento fiscal ou recibo é emitido conforme exige a legislação" (`terms.document.tsx:432-434`). Pessoa física recebendo assinatura recorrente precisa de carnê leão e, conforme o município, NFS-e avulsa. Desenvolvimento e licenciamento de software não costumam caber no MEI. | Validar com contador antes de vender. Considerar abrir ME (Simples) logo que houver receita recorrente. |

## 2. Promessas dos textos que o código não cumpre (art. 6º, VI e art. 9º; CDC art. 37)

| Promessa | Onde | Realidade no código |
| --- | --- | --- |
| Dados de conta expirada guardados 90 dias e depois excluídos | Termos "Suspensão e encerramento", Política "Por quanto tempo guardamos" | Nenhum job de expurgo, nenhum `@Cron`, nenhum TTL. |
| Após encerramento, excluídos ou anonimizados em até 90 dias | Política | Não há exclusão de conta. Todo "apagar" é `active=false` (`customer.service.ts:251-256`, `conversation.service.ts:431-436`, `property.service.ts:413-418`, `deal.service.ts:375-378`). Mídia do WhatsApp em `inbox/{userId}/...` nunca é apagada. |
| Registros de acesso por 6 meses | Política, tabela de finalidades e de retenção | Login e refresh não guardam IP nem horário (`auth.service.ts:67-87`); não há middleware de log. |
| Pagamentos por 5 anos, evidências de assinatura por até 10 anos | Política | `subscription_payments`, `credit_purchases` e `deal_signers` caem em cascata com o usuário. `resetSignature` e a recusa do gov.br **apagam** CPF, IP, UA e hash (`deal-signature.service.ts:30-40, 201-204, 247-250`). |
| "Não pedimos dados sensíveis" | Política, "Dados que tratamos" | Inferência de tom de pele e gênero por foto (`photo-avatar.service.ts:70-85`). |
| Transferência internacional com cláusulas contratuais compatíveis | Política, art. 33 | Não há evidência de cláusulas-padrão da ANPD (Res. CD/ANPD 19/2024, prazo encerrado em 23/08/2025) com OpenAI, Railway, Browserless ou Evolution. |
| Direitos de acesso, portabilidade e eliminação | Política e landing ("Você pode pedir uma cópia ou a exclusão dos seus dados quando quiser", `landing-view.tsx:219-220`) | Sem endpoint, sem script de exportação, sem exclusão definitiva. Hoje um pedido por e-mail não pode ser atendido sem SQL manual. |
| "Seguimos a LGPD" e "tratamento conforme a LGPD" | `landing-view.tsx:219, 405` | Afirmação absoluta que os itens desta auditoria contradizem. |
| Aceite com prova | Termos | Cada novo aceite **sobrescreve** o anterior (`user.service.ts:46-66`); a prova das versões antigas se perde (art. 8º, § 2º). O backend não exige o aceite, só o frontend, e o `TermsGate` libera a tela se a requisição falhar (`terms-gate.tsx:32-36`). |

## 3. Tratamentos que os textos não mencionam

A Política lista só Google (login), nuvem, IA "como a OpenAI", WhatsApp/Meta e
e-mail. Faltam:

* **Infosimples**: recebe CPF/CNPJ de proprietários para emitir CND federal e CNDT (`document-lookup.service.ts:194-295`).
* **Browserless** (Chrome remoto) e a **raspagem dos portais** ZAP, Viva Real, QuintoAndar, OLX, Chaves na Mão, Imovelweb, Mercado Livre e outros.
* **Busca na web da OpenAI** para achar proprietários (`owner-finder.service.ts:188-290`).
* **Google Contacts** (`contacts.readonly`, `source-step.tsx:14-15`). É escopo **sensível**: o app precisa de verificação do Google e a Política precisa explicar o uso dos dados do Google (Google API Services User Data Policy, Limited Use).
* **Photon/komoot**: endereços digitados vão do navegador para `photon.komoot.io` (`address-autocomplete.hook.tsx:57`).
* **SDK do Mercado Pago** no navegador (cookies e fingerprint antifraude), ausente da Política de Cookies.
* **Railway** (hospedagem e bucket) e o host da **Evolution API**, que usa Baileys, conexão não oficial com o WhatsApp.
* **Avatar a partir da foto** de perfil dos contatos.
* Chave `admin.key` em `sessionStorage`, ausente da tabela de cookies (só admin, risco baixo).

## 4. Funcionalidades de alto risco

### 4.1 Busca de imóveis nos portais (`property-hunts`), P0

* Contas dos portais são **da plataforma**, compartilhadas por todos os corretores (`portal-account.service.ts:48, 68`, `userId IS NULL`), com espera de código SMS/e-mail, user agent falso (`portal-browser.service.ts:17-18`) e `humanPause` "para não bater como relógio" (`page-reader.helper.ts:30-31`). Isso é contornar controle de acesso e quase certamente viola os termos dos portais (Grupo OLX, QuintoAndar). Risco de ação por concorrência desleal e de bloqueio.
* Coleta nome, telefones, e-mails, CRECI e empresa do anunciante, envia à OpenAI e guarda sem prazo em `property_matches.listing`.
* Importação copia até 25 fotos e 3 vídeos de terceiros com `Referer` falso (`listing-import.service.ts:258-319`), **carimba nome, CRECI e telefone do corretor** nas fotos (`watermark.helper.ts`, aplicado em `listing-import.service.ts:345`) e limpa da descrição qualquer rastro do anunciante. Fotos são obra protegida (Lei 9.610/1998, art. 7º, VII); reproduzir e atribuir a outra pessoa pode configurar violação civil e o crime do art. 184 do Código Penal. Para o anunciante corretor, o CRECI dele some e o de outro aparece: risco ético COFECI para os seus clientes.
* **Ação:** desativar a importação de fotos e o carimbo; não guardar dados do anunciante; trocar as contas da plataforma por links que o corretor abre no próprio navegador, ou suspender a funcionalidade até ter parecer jurídico.

### 4.2 Achar proprietário (`owner-finder`), P0

* Vendido como "Contato do proprietário, sem corretor ou imobiliária no meio" (`properties/[id]/page.tsx:260, 325`). Raspa até 8 anúncios logado com as contas da plataforma e clica em "ver telefone".
* Usa o dado para finalidade diferente da que o anunciante publicou (art. 7º, §§ 3º e 4º: finalidade e boa-fé) e manda à OpenAI nome e CRECI do corretor intermediário.
* O aviso LGPD ao corretor só aparece depois da busca, em letra pequena (`owner-contact-finder.tsx:356-359`).
* **Ação:** manter só os links gratuitos (busca `site:` e cartórios) que o corretor abre por conta própria; remover a raspagem logada; aviso claro antes de salvar o contato e registro da origem.

### 4.3 Avatar por foto, P0

* Foto de perfil do WhatsApp de clientes vai à OpenAI com o nome, e a IA devolve `gender` e `skinTone` (`photo-avatar.service.ts:70-85`). Opção ligada por padrão ao salvar contato (`save-contact-dialog.tsx:43`).
* **Ação:** remover `skinTone` e `gender` da inferência (sortear ou deixar o corretor escolher) ou desligar o recurso. Se mantiver, desligado por padrão e citado na Política.

### 4.4 Importação de contatos e análise por IA, P1

* O wizard envia à OpenAI as últimas 40 mensagens de **todos** os chats não clientes com histórico (`contact-import-wizard.tsx:104-110`, `contact-ai-analysis.service.ts:155-167, 195-230`), inclusive família e amigos, só para descobrir que são pessoais. Fere necessidade (art. 6º, III).
* **Ação:** o corretor escolhe os chats antes; pré filtro local (por exemplo, contatos sem menção a imóvel) antes da IA; texto de aviso.

### 4.5 Certidões via Infosimples, P1

* Consulta CND federal e CNDT por CPF/CNPJ de proprietários e cônjuges, guarda o CPF em texto puro (`property_legal_profiles.owners`, `property_document_lookups.ownerDocumentNumber`) e o nome no arquivo e no extrato de créditos.
* Base legal defensável (procedimentos preliminares do contrato ou legítimo interesse do corretor), mas sem aviso nem registro. **Ação:** checkbox "o proprietário autorizou ou a consulta é parte da diligência da venda", citar Infosimples na Política, cifrar CPF.

### 4.6 WhatsApp, P1

* Toda conversa individual (não grupo) do número conectado vira registro, mesmo de quem não é cliente, e a mídia vai ao S3 sem prazo (`message.service.ts:319-381, 740-790`). Desconectar não apaga nada.
* Conexão via Baileys, não oficial: os Termos já avisam; mantenha.
* **Ação:** guardar só conversas de clientes ou permitir ignorar contatos; apagar mensagens e mídia ao desconectar ou após prazo definido.

### 4.7 IA em geral, P2

* `store: false` na OpenAI está correto. O conteúdo enviado (transcrições, notas, orçamento) é proporcional ao recurso, mas a Política precisa listar os recursos e o país (EUA).
* A ANPD colocou IA entre os eixos prioritários de fiscalização 2026/2027 (Res. CD/ANPD 30/2025).

## 5. Segurança (art. 46) ainda aberta do pentest

| # | Achado | Local |
| --- | --- | --- |
| 4 | Portal devolve o `signingToken` de todos os compradores; um comprador assina pelo outro | `deal.mapper.ts:431-432` |
| 7 | Apresentação pública devolve endereço completo e unidade, sem login, e `/p/[id]` é indexável e põe o endereço no OG | `property.service.ts:420-452`, `p/[id]/layout.tsx:58-64`, `robots.ts` |
| 13 | JWT aceito por `?token=` | `jwt.strategy.ts:23` |
| 14 | Assinatura não vinculada ao hash que o signatário viu | `deal-signature.service.ts:121-134` |
| 15 | Sem logout que revogue no servidor | `auth.controller.ts` |
| 16 | Throttler global desligado, uploads públicos sem limite | `app.module.ts:106-111` |
| 12b | Cifra das senhas dos portais cai para `JWT_SECRET` | `portals.config.ts:4-6` |
| novo | CPF em texto puro em 4 tabelas; links de portal e assinatura nunca expiram | entidades de deals, document-lookups, assistant |
| novo | Telefone em log (`message.service.ts:401-403`) e corpo de erro de provedores em log | infosimples, evolution, mercado-pago |

Incidente com dado pessoal: comunicar ANPD e titulares em **3 dias úteis**
(Res. CD/ANPD 15/2024) e manter registro por 5 anos. Hoje não há plano.

## 6. Consumidor (CDC e Decreto 7.962/2013)

* **Checkout sem link para os Termos nem menção ao direito de arrependimento** (`subscriptions/**`). O decreto pede informar de forma clara os meios de arrependimento antes da contratação. Pix sem texto de cancelamento.
* **Teste grátis induz a erro:** o cadastro lista "WhatsApp com respostas sugeridas pela IA" e "Assistente" como parte dos 7 dias grátis (`signup/page.tsx:10-16`), mas o teste não tem créditos. Só o FAQ avisa.
* **JSON-LD** publica `price: "0"` quando a API de planos falha (`app/page.tsx:66`) e diz "Android, iOS" para um app web.
* Cancelamento online existe e funciona (`subscription-billing.tsx:267-312`). Bom.
* Mock "Marina Souza" sem rótulo de ilustrativo (risco baixo).

## 7. Páginas vistas por terceiros

* `/p/[id]` e `/corretor/[slug]` não têm o aviso de privacidade nem links legais.
* `/assinar/[token]` avisa o que guarda antes do botão (bom), mas o caminho gov.br não avisa nada.
* O aviso ao titular aponta para a Política do BrokerIn, que não tem seção específica para cliente final, proprietário, anunciante e signatário. Criar essa seção.

## 8. Plano de ação

### P0, antes de divulgar

1. Textos para pessoa física e variáveis legais obrigatórias no build (item 1).
2. Desligar raspagem logada, cópia de fotos e carimbo (4.1) e a raspagem do Achar proprietário (4.2).
3. Remover inferência de tom de pele e gênero (4.3).
4. Corrigir pentest #4 e #7 e tirar `/p/[id]` dos buscadores ou mostrar só bairro.
5. Política verdadeira: listar todos os suboperadores, tirar ou cumprir as promessas de 90 dias, logs e cláusulas, e retirar "Seguimos a LGPD" da landing até fechar o P1.
6. Script ou endpoint de **exclusão definitiva e exportação** de uma conta, preservando o que a lei manda guardar (pagamentos, evidências de assinatura).
7. Checkout com link dos Termos e frase do arrependimento; corrigir a lista do teste grátis e o JSON-LD.

### P1, primeiros 30 dias

8. Job de expurgo (90 dias após fim do acesso) e de mídia órfã; exclusão definitiva de cliente apagado.
9. Histórico de aceites em tabela própria; backend recusa uso sem aceite.
10. Evidência de assinatura imutável (nova linha a cada tentativa, nunca `null`).
11. Cifrar CPF; expiração dos links privados; throttler; logout com revogação.
12. Importação de contatos só com chats escolhidos; aviso e registro nas certidões.
13. Verificação do Google para `contacts.readonly` (necessária ao passar de 100 usuários).
14. Registro das operações de tratamento (art. 37, simplificado para pequeno porte) e plano de resposta a incidente.

### P2

15. Log de acesso de 6 meses, avisos nas páginas públicas, seção da Política para terceiros, rótulo "ilustrativo" na prévia, limpeza da chave `brokerin.last-level` ao revogar consentimento.

## Fontes

* LGPD, Lei 13.709/2018; Marco Civil, Lei 12.965/2014, art. 15; Decreto 7.962/2013; Lei 9.610/1998.
* Res. CD/ANPD 2/2022 (pequeno porte), 15/2024 (incidentes), 18/2024 (encarregado), 19/2024 (transferência internacional), 30/2025 (prioridades 2026/2027).
* [Res. CD/ANPD 18/2024, DOU](https://www.tjba.jus.br/extrajudicial/wp-content/uploads/2024/08/RESOLUCAO-ANPD-No-18-Encarregado-de-Dados.pdf)
* [Felsberg, Res. 2/2022](https://www.felsberg.com.br/no-dia-internacional-da-protecao-de-dados-anpd-publica-nova-resolucao-que-regulamenta-a-aplicacao-da-lgpd-para-agentes-de-tratamento-de-pequeno-porte/)
* [Migalhas, transferência internacional no radar da ANPD](https://www.migalhas.com.br/quentes/449475/envio-de-dados-ao-exterior-esta-no-radar-fiscalizatorio-da-anpd)
* [Eixos de fiscalização 2026/2027](https://www.brasilemfolhas.com.br/2026/10/anpd-define-eixos-de-fiscalizacao-de-dados-para-o-bienio-2026-2027/)
* [Google, verificação de escopos sensíveis](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
