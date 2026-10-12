import { BadRequestException } from "@nestjs/common";
import { KIND_LABEL } from "../../inbox/helpers/property-pitch.helper";
import { Property } from "../../properties/entities/property.entity";

/** What the model sent to a tool, read field by field. */
export type ToolArguments = Record<string, unknown>;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const textOf = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const numberOf = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const booleanOf = (value: unknown) =>
  typeof value === "boolean" ? value : null;

export const limitOf = (value: unknown, fallback: number, maximum: number) =>
  Math.min(Math.max(Math.round(numberOf(value) ?? fallback), 1), maximum);

export const requireId = (value: unknown, label: string) => {
  const id = textOf(value);
  if (!id || !UUID_PATTERN.test(id)) {
    throw new BadRequestException(`Id de ${label} inválido.`);
  }
  return id;
};

/** The property's nickname, or its kind and address. */
export const propertyTitleOf = (property: Property) =>
  property.alias ??
  [property.kind ? KIND_LABEL[property.kind] : "Imóvel", property.address]
    .filter(Boolean)
    .join(" em ")
    .substring(0, 120);
