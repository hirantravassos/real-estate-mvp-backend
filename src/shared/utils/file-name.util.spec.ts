import { repairFileName } from "./file-name.util";

const asMultipartName = (name: string) =>
  Buffer.from(name, "utf8").toString("latin1");

describe("repairFileName", () => {
  it("turns a name read as latin1 back into the real one", () => {
    expect(repairFileName(asMultipartName("Matrícula Atualizada.pdf"))).toBe(
      "Matrícula Atualizada.pdf",
    );
    expect(repairFileName(asMultipartName("Certidão de ônus.pdf"))).toBe(
      "Certidão de ônus.pdf",
    );
  });

  it("keeps names that are already right", () => {
    expect(repairFileName("Matrícula Atualizada.pdf")).toBe(
      "Matrícula Atualizada.pdf",
    );
    expect(repairFileName("contrato.pdf")).toBe("contrato.pdf");
    expect(repairFileName("Certidão 😀.pdf")).toBe("Certidão 😀.pdf");
    expect(repairFileName("")).toBe("");
  });
});
