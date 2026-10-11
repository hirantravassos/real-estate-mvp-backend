import { User } from "../entities/user.entity";

const MEMORY_MAX_LENGTH = 4000;

const listOf = (items: string[] | null | undefined) =>
  (items ?? []).filter((item) => item.trim()).join(", ");

/**
 * What the AI always knows about the broker: where they work, what they sell,
 * whom they like to serve and the notes they wrote for it. Empty when the
 * broker has not told anything yet.
 */
export const describeBrokerContext = (user: User): string => {
  const lines = [
    user.city ? `- Cidade base: ${user.city}` : "",
    listOf(user.workingCities)
      ? `- Cidades e regiões onde atua: ${listOf(user.workingCities)}`
      : "",
    listOf(user.salesNiches)
      ? `- Nichos de venda: ${listOf(user.salesNiches)}`
      : "",
    listOf(user.targetClienteles)
      ? `- Clientela que prefere atender: ${listOf(user.targetClienteles)}`
      : "",
    user.aiMemory?.trim()
      ? `- Anotações do corretor para a IA:\n${user.aiMemory.trim().slice(0, MEMORY_MAX_LENGTH)}`
      : "",
  ].filter(Boolean);

  if (!lines.length) return "";

  return [
    `Perfil do corretor ${user.name} (use para priorizar e personalizar, sem citar estas notas ao cliente; dados reais e pedidos explícitos valem mais que este perfil):`,
    ...lines,
  ].join("\n");
};
