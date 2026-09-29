import type { SheetRow } from "./sheets.functions";

export type Course = { id: string; label: string; short: string; order: number | null; key: string };

export const COURSES: Course[] = [
  { id: "membresia", label: "Comprometidos com a Membresia", short: "Membresia", order: 1, key: "membresia" },
  { id: "maturidade", label: "Comprometidos com a Maturidade", short: "Maturidade", order: 2, key: "maturidade" },
  { id: "ministerio", label: "Comprometidos com o Ministério", short: "Ministério", order: 3, key: "ministerio" },
  { id: "evangelismo", label: "Comprometidos com o Evangelismo", short: "Evangelismo", order: 4, key: "evangelismo" },
  { id: "adoracao", label: "Comprometidos com a Adoração", short: "Adoração", order: 5, key: "adoracao" },
  { id: "doutrinas", label: "As Doutrinas da Bíblia", short: "Doutrinas", order: 6, key: "doutrina" },
  { id: "servico", label: "Comprometidos com o Serviço", short: "Serviço", order: null, key: "servico" },
];
export const MAIN = COURSES.filter((c) => c.order !== null);

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export const courseOf = (curso: string) => {
  const n = norm(curso);
  return COURSES.find((c) => n.includes(c.key));
};

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

export type Student = {
  id: string;
  nome: string;
  vinculo: string;
  email: string;
  celular: string;
  cursos: Record<string, string[]>; // courseId -> classes
  progresso: number; // main courses done
  proxima: Course | null;
};

export function buildStudents(rows: SheetRow[]): Student[] {
  const map = new Map<string, Student>();
  for (const r of rows) {
    const c = courseOf(r.curso);
    if (!c) continue;
    const id = norm(r.aluno);
    let s = map.get(id);
    if (!s) {
      const nome = r.aluno === r.aluno.toUpperCase() ? titleCase(r.aluno) : r.aluno;
      s = { id, nome, vinculo: r.vinculo, email: r.email, celular: r.celular, cursos: {}, progresso: 0, proxima: null };
      map.set(id, s);
    }
    if (r.vinculo === "Membro") s.vinculo = "Membro";
    if (!s.email && r.email) s.email = r.email;
    if (!s.celular && r.celular) s.celular = r.celular;
    (s.cursos[c.id] ??= []).push(r.classe);
  }
  for (const s of map.values()) {
    s.progresso = MAIN.filter((c) => s.cursos[c.id]).length;
    s.proxima = MAIN.find((c) => !s.cursos[c.id]) ?? null;
  }
  return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
