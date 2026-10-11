import { OpenaiTool } from "../../../infrastructure/openai/services/openai.service";

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
  | "propose_whatsapp_message"
  | "propose_visit"
  | "propose_customer_note"
  | "propose_stage_change"
  | "propose_lost_status";

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
        enum: ["house", "apartment", "commercial", null],
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
    name: "propose_whatsapp_message",
    description:
      "Prepara uma mensagem de WhatsApp para um cliente ou conversa. Só é enviada depois que o corretor confirmar. Crie uma proposta por destinatário.",
    parameters: objectOf({
      customerId: nullable("string", "Id do cliente."),
      conversationId: nullable(
        "string",
        "Id da conversa, para contatos que não são clientes.",
      ),
      text: {
        type: "string",
        description: "A mensagem pronta, como o corretor escreveria.",
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
];
