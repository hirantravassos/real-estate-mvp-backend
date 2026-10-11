export type TaxDocumentKind = "cpf" | "cnpj";

const onlyDigits = (value: string) => value.replaceAll(/\D/g, "");

const checkDigit = (digits: number[], weights: number[]) => {
  const sum = digits.reduce(
    (total, digit, index) => total + digit * weights[index],
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

const isValidCpf = (digits: string) => {
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  const numbers = [...digits].map(Number);
  const first = checkDigit(numbers.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(
    numbers.slice(0, 10),
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return numbers[9] === first && numbers[10] === second;
};

const isValidCnpj = (digits: string) => {
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const numbers = [...digits].map(Number);
  const first = checkDigit(
    numbers.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const second = checkDigit(
    numbers.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return numbers[12] === first && numbers[13] === second;
};

/** CPF or CNPJ in only digits, null when the check digits do not match. */
export const normalizeTaxDocument = (value: string) => {
  const digits = onlyDigits(value);
  if (isValidCpf(digits) || isValidCnpj(digits)) return digits;
  return null;
};

export const taxDocumentKindOf = (digits: string): TaxDocumentKind =>
  digits.length === 14 ? "cnpj" : "cpf";
