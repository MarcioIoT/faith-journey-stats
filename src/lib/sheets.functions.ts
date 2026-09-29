import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SPREADSHEET_ID = "1Tg8aBAlGMViRij3ruOf9j0EPiC8fPvw12Dvc_UEOnVs";
const RANGE = "'Exportar_alunos (1)'!A1:F5000";

export type SheetRow = {
  curso: string;
  classe: string;
  aluno: string;
  vinculo: string;
  email: string;
  celular: string;
};

export const getAlunos = createServerFn({ method: "GET" }).handler(async () => {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !sheetsKey) throw new Error("Conexão com Google Sheets não configurada");

  const res = await fetch(`${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}`, {
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": sheetsKey },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Sheets request failed [${res.status}]: ${body}`);
    throw new Error(`Falha ao ler planilha [${res.status}]`);
  }
  const json = (await res.json()) as { values?: string[][] };
  const rows = (json.values ?? []).slice(1);
  return rows
    .filter((r) => r[0] && r[2])
    .map<SheetRow>((r) => ({
      curso: (r[0] ?? "").trim(),
      classe: (r[1] ?? "").trim(),
      aluno: (r[2] ?? "").trim(),
      vinculo: (r[3] ?? "").trim(),
      email: (r[4] ?? "").trim(),
      celular: (r[5] ?? "").trim(),
    }));
});
