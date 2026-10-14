# Caça de imóveis nos portais, decisão de 2026-10-14

Revê o item 4.1 de `lgpd-auditoria-2026-10-13.md`. Decisão do responsável pelo
produto: a caça volta a ler os portais e guarda o que achou no sistema, só
para o corretor que rodou a busca, porque parcerias com o anunciante podem
nascer daí. Nada disso vira público.

Este texto é um registro técnico, não é parecer jurídico. Validar com advogado
antes da divulgação ampla.

## O que a análise jurídica encontrou

* **Fatos do anúncio** (preço, área, quartos, bairro) não são obra protegida
  (Lei 9.610/1998, art. 8º, I e art. 7º, § 2º). Guardar é baixo risco.
* **Fotos são obra protegida** (art. 7º, VII). Guardar cópia é reprodução
  (art. 5º, VI e art. 29, IX) e o art. 46 não cobre um CRM comercial. Por isso
  as fotos **não são copiadas** para o nosso storage: ficam só os links, vistos
  pelo corretor direto do portal.
* **Dados do anunciante pessoa física** seguem sob a LGPD mesmo publicados
  (art. 7º, §§ 3º, 4º, 6º e 7º). Base provável: legítimo interesse (art. 7º,
  IX e art. 10), com finalidade compatível (parceria entre corretores),
  necessidade e direitos do titular (art. 18).
* **Termos dos portais** (Grupo OLX/ZAP e outros) proíbem coleta automatizada.
  É risco contratual e de bloqueio que continua existindo, mesmo lendo só
  páginas públicas.

## Como o código ficou

* `PORTAL_SEARCH_ENABLED = true`: o navegador abre os portais como qualquer
  visitante, **sem login**, sem clicar em "ver telefone", e para em captcha ou
  tela de login. As contas da plataforma não são mais usadas pelas caçadas.
* Pausa entre páginas (`PORTAL_PAGE_DELAY_MILLISECONDS`) e limite de anúncios
  por portal (`PORTAL_LISTINGS_PER_PORTAL`) seguem valendo.
* Cada caçada é um histórico próprio (`property_hunts` e `property_matches`),
  roda no servidor e continua disponível quando o corretor sai da tela.
* `hunted_listings` guarda, por corretor, cada anúncio que a IA já leu. Por
  `LISTING_REUSE_DAYS` (14 dias) as próximas caçadas reaproveitam a leitura
  sem abrir a página nem cobrar créditos. Depois disso a linha é apagada.
* `LISTING_IMPORT_ENABLED = true`: guardar na carteira cria um imóvel
  **privado**: sem cópia nem carimbo de fotos (só links em `sourceDetails`),
  fora da página pública (`findForLanding` e `setLandingVisibility`), sem link
  `/p/[id]` (a apresentação devolve 404) e sem link nas mensagens, documentos
  e respostas do assistente.
* Exclusão da conta apaga `hunted_listings` junto com as caçadas.

## Pendências recomendadas

1. Parecer jurídico e teste de legítimo interesse (LIA) registrado.
2. Política de Privacidade citando a coleta em portais e o canal para o
   anunciante pedir exclusão (art. 18).
3. Avaliar respeito ao `robots.txt` de cada portal e acordos ou feeds
   licenciados como caminho definitivo.
4. Prazo de retenção para `property_matches` de caçadas antigas.
