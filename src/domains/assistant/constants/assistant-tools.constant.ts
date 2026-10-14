import { OpenaiTool } from "../../../infrastructure/openai/services/openai.service";
import { PortalKey } from "../../property-hunts/enums/property-hunt.enum";

/** Strict mode wants every field listed, so optional ones accept null. */
const nullable = (type: string, description: string) => ({
  type: [type, "null"],
  description,
});

const objectOf = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export type AssistantToolName =
  | "list_stages"
  | "search_customers"
  | "get_customer"
  | "list_visits"
  | "search_properties"
  | "search_conversations"
  | "get_conversation"
  | "list_files"
  | "list_conversation_files"
  | "list_deals"
  | "propose_deal_documents"
  | "generate_document"
  | "propose_whatsapp_message"
  | "propose_visit"
  | "propose_customer_note"
  | "propose_stage_change"
  | "propose_lost_status"
  | "list_whatsapp_contacts"
  | "list_certificates"
  | "propose_property_hunt"
  | "propose_owner_search"
  | "propose_contact_import"
  | "propose_certificate_lookup";

export const ASSISTANT_TOOLS: (OpenaiTool & { name: AssistantToolName })[] = [
  {
    name: "list_stages",
    description: "Lista as etapas do funil (kanban) do corretor, em ordem.",
    parameters: objectOf({}),
  },
  {
    name: "search_customers",
    description:
      "Busca clientes do corretor. Cada cliente traz a temperatura (new, hot, warm, cooling = esfriando, cold = frio), dias sem atividade, próxima visita, etapa, orçamento, última anotação e a última mensagem do WhatsApp.",
    parameters: objectOf({
      search: nullable("string", "Parte do nome ou do telefone."),
      stageId: nullable("string", "Id da etapa do funil."),
      warmth: {
        type: ["array", "null"],
        description:
          "Filtra pela temperatura. Use ['cooling'] para clientes esfriando e ['cold'] para frios.",
        items: {
          type: "string",
          enum: ["new", "hot", "warm", "cooling", "cold"],
        },
      },
      waitingForReply: nullable(
        "boolean",
        "true traz só quem mandou a última mensagem no WhatsApp e ainda não teve resposta do corretor.",
      ),
      includeLost: nullable(
        "boolean",
        "true inclui clientes marcados como perdidos. Padrão: false.",
      ),
      minimumBudget: nullable("number", "Orçamento mínimo em reais."),
      maximumBudget: nullable("number", "Orçamento máximo em reais."),
      limit: nullable("integer", "Quantos trazer, até 30. Padrão: 15."),
    }),
  },
  {
    name: "get_customer",
    description:
      "Ficha completa de um cliente: anotações, visitas e as últimas mensagens do WhatsApp.",
    parameters: objectOf({
      customerId: { type: "string", description: "Id do cliente." },
    }),
  },
  {
    name: "list_visits",
    description:
      "Lista as visitas agendadas entre duas datas, inclusive, no fuso do corretor.",
    parameters: objectOf({
      from: { type: "string", description: "Data inicial, AAAA-MM-DD." },
      to: { type: "string", description: "Data final, AAAA-MM-DD." },
    }),
  },
  {
    name: "search_properties",
    description:
      "Busca imóveis da carteira do corretor. Traz o link público de cada imóvel, que pode ser enviado ao cliente.",
    parameters: objectOf({
      search: nullable(
        "string",
        "Bairro, rua, cidade ou nome do imóvel, busca no endereço.",
      ),
      kind: {
        type: ["string", "null"],
        enum: ["house", "apartment", "commercial", "land", null],
        description: "Tipo do imóvel.",
      },
      minimumBedrooms: nullable("integer", "Mínimo de dormitórios."),
      maximumBedrooms: nullable("integer", "Máximo de dormitórios."),
      minimumPrice: nullable("number", "Valor mínimo em reais."),
      maximumPrice: nullable("number", "Valor máximo em reais."),
      minimumSquareMeters: nullable("number", "Área mínima em m²."),
      minimumParkingSpaces: nullable("integer", "Mínimo de vagas."),
      limit: nullable("integer", "Quantos trazer, até 20. Padrão: 10."),
    }),
  },
  {
    name: "search_conversations",
    description:
      "Procura conversas de WhatsApp em que o cliente escreveu alguma das palavras, para achar quem falou de um assunto (ex: preço alto, desconto, financiamento). Use várias palavras e variações.",
    parameters: objectOf({
      keywords: {
        type: "array",
        items: { type: "string" },
        description: "Palavras ou trechos curtos, sem acento não importa.",
      },
      days: nullable("integer", "Quantos dias para trás olhar. Padrão: 30."),
    }),
  },
  {
    name: "get_conversation",
    description: "As últimas mensagens de uma conversa do WhatsApp.",
    parameters: objectOf({
      conversationId: { type: "string", description: "Id da conversa." },
    }),
  },
  {
    name: "list_files",
    description:
      "Lista arquivos que podem ser enviados: documentos e vendas de um cliente, documentos, fotos e vídeos de um imóvel, ou, sem filtro, os arquivos recentes feitos pelo assistente ou anexados no chat.",
    parameters: objectOf({
      customerId: nullable("string", "Id do cliente."),
      propertyId: nullable("string", "Id do imóvel."),
    }),
  },
  {
    name: "list_conversation_files",
    description:
      "Lista os arquivos (documentos, fotos e vídeos) que chegaram ou foram enviados numa conversa do WhatsApp, com nome do arquivo, legenda, data, quem mandou e o messageId. Use para achar documentos que o cliente ou um parceiro mandou pelo WhatsApp.",
    parameters: objectOf({
      conversationId: nullable("string", "Id da conversa."),
      customerId: nullable(
        "string",
        "Id do cliente, quando não souber a conversa.",
      ),
      days: nullable("integer", "Quantos dias para trás olhar. Padrão: 90."),
    }),
  },
  {
    name: "list_deals",
    description:
      "Lista as vendas (salas de fechamento) do corretor com as pessoas da venda (compradores e vendedores além do cliente principal) e a lista de documentos de cada uma (checklist): id, título, de quem é (buyer = comprador, seller = vendedor, property = imóvel), de qual pessoa, situação e quantos arquivos já tem.",
    parameters: objectOf({
      customerId: nullable("string", "Só as vendas deste cliente."),
      includeClosed: nullable(
        "boolean",
        "true inclui vendas concluídas ou canceladas. Padrão: false.",
      ),
    }),
  },
  {
    name: "propose_deal_documents",
    description:
      "Prepara guardar arquivos que chegaram pelo WhatsApp nos documentos de uma venda, cada um no item certo do checklist. Só guarda depois que o corretor confirmar. Use list_conversation_files para os messageId e list_deals para os itens. Fotos e documentos, não vídeos.",
    parameters: objectOf({
      dealId: { type: "string", description: "Id da venda." },
      files: {
        type: "array",
        description: "Arquivos e onde guardar cada um, até 20.",
        items: objectOf({
          messageId: {
            type: "string",
            description: "messageId do arquivo na conversa.",
          },
          checklistItemId: nullable(
            "string",
            "Item do checklist que o arquivo cumpre. Null para criar um item novo.",
          ),
          newItemTitle: nullable(
            "string",
            "Título do item novo, só quando nenhum item do checklist serve.",
          ),
          newItemParty: {
            type: ["string", "null"],
            enum: ["buyer", "seller", "property", null],
            description: "De quem é o item novo.",
          },
          newItemParticipantId: nullable(
            "string",
            "participantId da pessoa dona do item novo, de list_deals. Null para o comprador principal, o vendedor sem nome ou o imóvel.",
          ),
        }),
      },
    }),
  },
  {
    name: "generate_document",
    description:
      "Cria um arquivo PDF ou Word na hora (proposta, ficha de imóvel, lista de imóveis, resumo de cliente, recibo, minuta). O corretor recebe o arquivo para baixar e ele pode ser anexado numa mensagem de WhatsApp. Use só dados reais das ferramentas.",
    parameters: objectOf({
      title: { type: "string", description: "Título do documento." },
      subtitle: nullable("string", "Linha abaixo do título."),
      fileName: nullable("string", "Nome do arquivo, sem extensão."),
      format: {
        type: "string",
        enum: ["pdf", "docx"],
        description: "pdf por padrão, docx quando o corretor quiser editar.",
      },
      customerId: nullable(
        "string",
        "Cliente do documento, para guardar na ficha dele.",
      ),
      propertyId: nullable(
        "string",
        "Imóvel do documento, para guardar nos documentos dele.",
      ),
      blocks: {
        type: "array",
        description:
          "Conteúdo em ordem. heading: text. paragraph: text. bullets: items. fields: pares rótulo e valor. table: columns e rows. property: propertyId, desenha foto de capa, dados e link do imóvel. signatures: items com os nomes. page_break: nova página.",
        items: objectOf({
          type: {
            type: "string",
            enum: [
              "heading",
              "paragraph",
              "bullets",
              "fields",
              "table",
              "property",
              "signatures",
              "page_break",
            ],
          },
          text: nullable("string", "Texto de heading e paragraph."),
          items: {
            type: ["array", "null"],
            items: { type: "string" },
            description: "Itens de bullets ou nomes de signatures.",
          },
          fields: {
            type: ["array", "null"],
            items: objectOf({
              label: { type: "string" },
              value: { type: "string" },
            }),
            description: "Pares de fields.",
          },
          columns: {
            type: ["array", "null"],
            items: { type: "string" },
            description: "Cabeçalho de table, até 8 colunas.",
          },
          rows: {
            type: ["array", "null"],
            items: { type: "array", items: { type: "string" } },
            description: "Linhas de table.",
          },
          propertyId: nullable("string", "Imóvel de property."),
        }),
      },
    }),
  },
  {
    name: "propose_whatsapp_message",
    description:
      "Prepara uma mensagem de WhatsApp para um cliente ou contato, com anexos se quiser (PDFs, documentos, fotos, vídeos, qualquer arquivo de list_files, generate_document ou anexado pelo corretor). Só é enviada depois que o corretor confirmar. Crie uma proposta por destinatário.",
    parameters: objectOf({
      customerId: nullable("string", "Id do cliente."),
      conversationId: nullable(
        "string",
        "Id da conversa, para contatos que não são clientes.",
      ),
      text: {
        type: "string",
        description:
          "A mensagem pronta, como o corretor escreveria. Pode ser vazia quando só houver anexos.",
      },
      attachments: {
        type: ["array", "null"],
        description: "Arquivos que vão junto, na ordem de envio, até 10.",
        items: objectOf({
          type: {
            type: "string",
            enum: ["document", "property_media"],
            description:
              "document para documentos e arquivos, property_media para fotos e vídeos de imóvel.",
          },
          id: { type: "string", description: "Id do arquivo." },
        }),
      },
    }),
  },
  {
    name: "propose_visit",
    description:
      "Prepara o agendamento de uma visita. Só é criada depois que o corretor confirmar.",
    parameters: objectOf({
      customerId: { type: "string", description: "Id do cliente." },
      startsAt: {
        type: "string",
        description: "Início no fuso do corretor, AAAA-MM-DDTHH:mm.",
      },
      durationMinutes: nullable("integer", "Duração. Padrão: 60."),
      propertyId: nullable("string", "Id do imóvel visitado."),
      address: nullable(
        "string",
        "Endereço, quando não houver imóvel cadastrado.",
      ),
      notes: nullable("string", "Observações da visita."),
    }),
  },
  {
    name: "propose_customer_note",
    description:
      "Prepara uma anotação na ficha do cliente. Só é salva depois que o corretor confirmar.",
    parameters: objectOf({
      customerId: { type: "string", description: "Id do cliente." },
      note: { type: "string", description: "Texto da anotação." },
    }),
  },
  {
    name: "propose_stage_change",
    description:
      "Prepara a mudança do cliente para outra etapa do funil. Só muda depois que o corretor confirmar.",
    parameters: objectOf({
      customerId: { type: "string", description: "Id do cliente." },
      stageId: { type: "string", description: "Id da nova etapa." },
    }),
  },
  {
    name: "propose_lost_status",
    description:
      "Prepara marcar o cliente como perdido (lost true) ou trazê-lo de volta (lost false). Marcar como perdido apaga as visitas dele. Só muda depois que o corretor confirmar.",
    parameters: objectOf({
      customerId: { type: "string", description: "Id do cliente." },
      lost: { type: "boolean", description: "true para perdido." },
    }),
  },
  {
    name: "list_whatsapp_contacts",
    description:
      "Lista contatos do WhatsApp do corretor que ainda não são clientes, os de conversa mais recente primeiro, com o preço de importar com IA. Use antes de propose_contact_import.",
    parameters: objectOf({
      search: nullable("string", "Parte do nome ou do telefone."),
      onlyWithHistory: nullable(
        "boolean",
        "true traz só quem tem conversa, que a IA consegue ler. Padrão: true.",
      ),
      limit: nullable("integer", "Quantos trazer, até 40. Padrão: 20."),
    }),
  },
  {
    name: "list_certificates",
    description:
      "Lista as certidões públicas de um imóvel e dos proprietários: quais saem sozinhas (automatic), o preço em créditos, o que falta preencher e a última busca. Use antes de propose_certificate_lookup.",
    parameters: objectOf({
      propertyId: { type: "string", description: "Id do imóvel." },
    }),
  },
  {
    name: "propose_property_hunt",
    description:
      "PAGO. Prepara uma caça de imóveis com IA nos portais (ZAP, Viva Real, OLX...) e na carteira do corretor, para um cliente ou não. A IA entende o pedido e lê cada anúncio, cobrando por anúncio lido. Só começa depois que o corretor confirmar o custo.",
    parameters: objectOf({
      request: {
        type: "string",
        description:
          "O pedido em uma frase, como o corretor digitaria. Ex.: apartamento 3 quartos com suíte no Embaré em Santos até 800 mil. Monte a partir da conversa ou da ficha do cliente quando for para um cliente.",
      },
      customerId: nullable("string", "Cliente para quem é a caça."),
      portals: {
        type: ["array", "null"],
        description: "Portais onde buscar. Padrão: todos.",
        items: { type: "string", enum: Object.values(PortalKey) },
      },
      includeCatalog: nullable(
        "boolean",
        "Busca também na carteira do corretor. Padrão: true.",
      ),
    }),
  },
  {
    name: "propose_owner_search",
    description:
      "PAGO. Prepara a busca do contato do proprietário de um imóvel em anúncios do próprio dono na internet. Só busca depois que o corretor confirmar o custo.",
    parameters: objectOf({
      propertyId: nullable("string", "Id do imóvel cadastrado."),
      address: nullable(
        "string",
        "Endereço completo, quando o imóvel não está cadastrado.",
      ),
      details: nullable(
        "string",
        "Algo que diferencie o imóvel: prédio, andar, metragem, link do anúncio.",
      ),
    }),
  },
  {
    name: "propose_contact_import",
    description:
      "PAGO quando usa IA ou bonequinhos. Prepara a importação de contatos do WhatsApp como clientes, com a conversa. Com useAi a IA lê cada conversa, importa só os contatos de trabalho e preenche etapa, orçamento e anotação, cobrando por contato com conversa. Só importa depois que o corretor confirmar o custo.",
    parameters: objectOf({
      phones: {
        type: "array",
        items: { type: "string" },
        description: "Telefones de list_whatsapp_contacts, até 40.",
      },
      useAi: nullable(
        "boolean",
        "Usar a IA para ler as conversas. Padrão: true.",
      ),
      avatarFromPhoto: nullable(
        "boolean",
        "Criar o bonequinho de cada cliente pela foto do WhatsApp, cobrado por foto. Padrão: false.",
      ),
      kanbanId: nullable(
        "string",
        "Etapa do funil para quem a IA não indicar outra.",
      ),
    }),
  },
  {
    name: "propose_certificate_lookup",
    description:
      "PAGO. Prepara a emissão automática de uma certidão pública do imóvel ou de um proprietário. O arquivo fica nos documentos do imóvel. Só busca depois que o corretor confirmar o custo.",
    parameters: objectOf({
      propertyId: { type: "string", description: "Id do imóvel." },
      lookupKey: {
        type: "string",
        description: "lookupKey de list_certificates.",
      },
      ownerDocumentNumber: nullable(
        "string",
        "CPF ou CNPJ do proprietário, nas certidões por proprietário.",
      ),
    }),
  },
];
