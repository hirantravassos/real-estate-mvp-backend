import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CustomerCreateDto } from "../services/customer.service";
import { CustomerRole } from "../enums/customer.enum";
import { CustomerMapper } from "./customer.mapper";

const validDto = (roles?: unknown) =>
  plainToInstance(CustomerCreateDto, {
    name: "Maria Souza",
    phone: "13991234567",
    ...(roles === undefined ? {} : { roles }),
  });

const roleErrorsOf = (roles?: unknown) =>
  validateSync(validDto(roles)).filter((error) => error.property === "roles");

describe("customer roles", () => {
  it("accepts a contact holding several roles", () => {
    expect(
      roleErrorsOf([
        CustomerRole.BUYER,
        CustomerRole.SELLER,
        CustomerRole.PARTNER,
      ]),
    ).toHaveLength(0);
  });

  it("accepts a contact saved without roles, keeping the stored ones", () => {
    expect(roleErrorsOf()).toHaveLength(0);
    expect(CustomerMapper.toEntity(validDto()).roles).toBeUndefined();
  });

  it("refuses an empty list, an unknown role and a repeated role", () => {
    expect(roleErrorsOf([])).not.toHaveLength(0);
    expect(roleErrorsOf(["admin"])).not.toHaveLength(0);
    expect(
      roleErrorsOf([CustomerRole.BUYER, CustomerRole.BUYER]),
    ).not.toHaveLength(0);
  });

  it("copies the chosen roles to the entity", () => {
    const entity = CustomerMapper.toEntity(
      validDto([CustomerRole.SELLER, CustomerRole.PARTNER]),
    );
    expect(entity.roles).toEqual([CustomerRole.SELLER, CustomerRole.PARTNER]);
  });
});
