import {
  PropertyDto,
  PropertyFurnitureEnum,
  PropertyKindEnum,
} from "../../properties/mappers/property.mapper";

const KIND_LABEL: Record<PropertyKindEnum, string> = {
  [PropertyKindEnum.HOUSE]: "Casa",
  [PropertyKindEnum.APARTMENT]: "Apartamento",
  [PropertyKindEnum.COMMERCIAL]: "Ponto comercial",
};

export const formatBrl = (value: string | number | null | undefined) => {
  const amount = Number(value);
  if (!value || Number.isNaN(amount)) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(amount);
};

/** The facts a customer may see. Owner contacts and private notes stay out. */
export const describePropertyFacts = (property: PropertyDto) => {
  const facts: string[] = [];
  if (property.kind) facts.push(`Tipo: ${KIND_LABEL[property.kind]}`);
  if (property.alias) facts.push(`Nome: ${property.alias}`);
  facts.push(
    `Endereço: ${[property.address, property.address2].filter(Boolean).join(", ")}`,
  );
  const price = formatBrl(property.price);
  if (price) facts.push(`Valor: ${price}`);
  if (property.infoSquareMeters)
    facts.push(`Área: ${property.infoSquareMeters} m²`);
  if (property.infoBedrooms) {
    facts.push(
      `Dormitórios: ${property.infoBedrooms}${property.infoSuiteBedrooms ? ` (${property.infoSuiteBedrooms} suítes)` : ""}`,
    );
  }
  if (property.infoBathrooms)
    facts.push(`Banheiros: ${property.infoBathrooms}`);
  if (property.infoParkingSpaceUnits) {
    facts.push(`Vagas: ${property.infoParkingSpaceUnits}`);
  }
  if (property.infoFloor !== null && property.infoFloor !== undefined) {
    facts.push(`Andar: ${property.infoFloor}`);
  }
  const amenities = describeAmenities(property);
  if (amenities.length) facts.push(`Diferenciais: ${amenities.join(", ")}`);
  const tax = formatBrl(property.infoPropertyTax);
  if (tax) facts.push(`IPTU: ${tax}`);
  const fee = formatBrl(property.infoMaintenanceFee);
  if (fee) facts.push(`Condomínio: ${fee}`);
  return facts;
};

const describeAmenities = (property: PropertyDto) => {
  const amenities: string[] = [];
  if (property.infoHasPool) amenities.push("piscina");
  if (property.infoHasBalcony) {
    amenities.push(
      property.infoHasFancyBalcony ? "varanda gourmet" : "varanda",
    );
  }
  if (property.infoHasGym) amenities.push("academia");
  if (property.infoHasAirConditioningSystem) amenities.push("ar condicionado");
  if (property.infoHasGasSystem) amenities.push("gás encanado");
  if (property.infoHasGasWaterHeatingSystem)
    amenities.push("aquecimento a gás");
  if (property.infoHasDedicatedParkingSpace) amenities.push("vaga demarcada");
  if (property.infoFurniture === PropertyFurnitureEnum.FULL) {
    amenities.push("mobiliado");
  } else if (property.infoFurniture === PropertyFurnitureEnum.HALF) {
    amenities.push("semi mobiliado");
  }
  if (
    property.infoBeachProximityInKm !== null &&
    property.infoBeachProximityInKm !== undefined
  ) {
    amenities.push(`${property.infoBeachProximityInKm} km da praia`);
  }
  return amenities;
};

/** Simple pitch used when the broker does not use the AI. */
export const formatPropertyPitch = (
  property: PropertyDto,
  customerFirstName: string | null,
  link: string,
) => {
  const sections: string[] = [];
  const greeting = customerFirstName ? `Oi, ${customerFirstName}! ` : "Oi! ";
  sections.push(`${greeting}Separei esse imóvel pra você 🏡`);

  const title = property.alias?.trim()
    ? `*${property.alias.trim()}*`
    : `*${property.kind ? KIND_LABEL[property.kind] : "Imóvel"}*`;
  sections.push(
    `${title}\n📍 ${[property.address, property.address2].filter(Boolean).join(", ")}`,
  );

  const specs: string[] = [];
  if (property.infoSquareMeters)
    specs.push(`📐 ${property.infoSquareMeters} m²`);
  if (property.infoBedrooms) {
    specs.push(
      `🛏️ ${property.infoBedrooms} dormitórios${property.infoSuiteBedrooms ? ` (${property.infoSuiteBedrooms} suítes)` : ""}`,
    );
  }
  if (property.infoBathrooms)
    specs.push(`🚿 ${property.infoBathrooms} banheiros`);
  if (property.infoParkingSpaceUnits) {
    specs.push(`🚗 ${property.infoParkingSpaceUnits} vagas`);
  }
  if (specs.length) sections.push(specs.join("\n"));

  const amenities = describeAmenities(property);
  if (amenities.length) sections.push(`✨ ${amenities.join(" · ")}`);

  const pricing = [`💰 *${formatBrl(property.price) ?? "Valor sob consulta"}*`];
  const tax = formatBrl(property.infoPropertyTax);
  const fee = formatBrl(property.infoMaintenanceFee);
  if (fee) pricing.push(`Condomínio ${fee}`);
  if (tax) pricing.push(`IPTU ${tax}`);
  sections.push(pricing.join("\n"));

  sections.push(`Veja todas as fotos e detalhes:\n🔗 ${link}`);
  sections.push("Quer agendar uma visita? 😊");

  return sections.join("\n\n");
};
