import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getAlunos } from "@/lib/sheets.functions";
import { buildStudents, COURSES, MAIN, norm, type Student } from "@/lib/classes";

const alunosQuery = queryOptions({
  queryKey: ["alunos"],
  queryFn: () => getAlunos(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel das Classes — Alunos e Progresso" },
      { name: "description", content: "Acompanhe os alunos das 6 classes e da classe complementar." },
      { property: "og:title", content: "Painel das Classes — Alunos e Progresso" },
      { property: "og:description", content: "Acompanhe os alunos das 6 classes e da classe complementar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(alunosQuery),
  component: Dashboard,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-destructive">Não foi possível carregar a planilha: {error.message}</div>
  ),
});

type Tab = "alunos" | "convidar";

function Dashboard() {
  const { data: rows } = useSuspenseQuery(alunosQuery);
  const students = useMemo(() => buildStudents(rows), [rows]);
  const [tab, setTab] = useState<Tab>("alunos");
  const [q, setQ] = useState("");
  const [curso, setCurso] = useState("todos");
  const [vinculo, setVinculo] = useState("todos");

  const counts = COURSES.map((c) => ({ c, n: students.filter((s) => s.cursos[c.id]).length }));
  const max = Math.max(1, ...counts.map((x) => x.n));
  const completos = students.filter((s) => s.progresso === 6).length;
  const membros = students.filter((s) => s.vinculo === "Membro").length;

  const filtered = students.filter((s) => {
    if (q && !norm(s.nome).includes(norm(q)) && !s.celular.includes(q)) return false;
    if (vinculo !== "todos" && s.vinculo !== vinculo) return false;
    if (tab === "alunos") return curso === "todos" || !!s.cursos[curso];
    if (!s.proxima || s.progresso === 0) return false;
    return curso === "todos" || s.proxima.id === curso;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Caminho do discipulado</p>
          <h1 className="mt-2 text-4xl font-bold text-primary sm:text-5xl">Painel das Classes</h1>
        </div>
        <p className="text-sm text-muted-foreground">{rows.length} matrículas registradas</p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Alunos únicos" value={students.length} />
        <Stat label="Membros" value={membros} />
        <Stat label="Concluíram as 6 classes" value={completos} highlight />
        <Stat label="Prontos para próxima" value={students.filter((s) => s.proxima && s.progresso > 0).length} />
      </section>

      <section className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="mb-5 text-xl font-semibold">Alunos por classe</h2>
        <div className="space-y-3">
          {counts.map(({ c, n }) => (
            <button
              key={c.id}
              onClick={() => setCurso(curso === c.id ? "todos" : c.id)}
              className={`grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded-md p-1 text-left transition hover:bg-muted sm:grid-cols-[2rem_16rem_1fr_3rem] ${curso === c.id ? "bg-accent" : ""}`}
            >
              <span className="font-display text-lg font-bold text-gold">{c.order ? `${c.order}º` : "+"}</span>
              <span className="text-sm font-medium">{c.label}</span>
              <span className="hidden h-3 overflow-hidden rounded-full bg-muted sm:block">
                <span
                  className={`block h-full rounded-full ${c.order ? "bg-primary" : "bg-gold"}`}
                  style={{ width: `${(n / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums">{n}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="flex rounded-lg bg-muted p-1">
            {(["alunos", "convidar"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {t === "alunos" ? "Progresso por aluno" : "Quem convidar"}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou celular…"
            className="h-9 min-w-52 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select value={curso} onChange={(e) => setCurso(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="todos">{tab === "alunos" ? "Todas as classes" : "Qualquer próxima classe"}</option>
            {(tab === "alunos" ? COURSES : MAIN).map((c) => (
              <option key={c.id} value={c.id}>{c.short}</option>
            ))}
          </select>
          <select value={vinculo} onChange={(e) => setVinculo(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="todos">Todos os vínculos</option>
            <option value="Membro">Membro</option>
            <option value="Congregado">Congregado</option>
          </select>
        </div>
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          {filtered.length} aluno(s)
          {tab === "convidar" && " que já iniciaram o caminho e ainda não fizeram a próxima classe da sequência"}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Aluno</th>
                <th className="px-2 py-3">Vínculo</th>
                <th className="px-2 py-3">Classes</th>
                <th className="px-2 py-3">{tab === "alunos" ? "Progresso" : "Próxima classe"}</th>
                <th className="px-4 py-3">Contato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((s) => (
                <Row key={s.id} s={s} tab={tab} />
              ))}
            </tbody>
          </table>
          {filtered.length > 300 && (
            <p className="p-4 text-center text-xs text-muted-foreground">Mostrando 300 de {filtered.length}. Use a busca para refinar.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${highlight ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
      <p className="mt-2 font-display text-4xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Row({ s, tab }: { s: Student; tab: Tab }) {
  return (
    <tr className="border-t hover:bg-muted/50">
      <td className="px-4 py-3 font-medium">{s.nome}</td>
      <td className="px-2 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.vinculo === "Membro" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"}`}>
          {s.vinculo || "—"}
        </span>
      </td>
      <td className="px-2 py-3">
        <div className="flex gap-1">
          {COURSES.map((c) => {
            const done = !!s.cursos[c.id];
            return (
              <span
                key={c.id}
                title={`${c.label}${done ? ` — ${(s.cursos[c.id] ?? []).join(", ")}` : " — não fez"}`}
                className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${
                  done ? (c.order ? "bg-primary text-primary-foreground" : "bg-gold text-primary-foreground") : "border border-dashed text-muted-foreground"
                } ${c.order ? "" : "ml-1.5"}`}
              >
                {c.order ?? "S"}
              </span>
            );
          })}
        </div>
      </td>
      <td className="px-2 py-3">
        {tab === "alunos" ? (
          <span className="tabular-nums text-muted-foreground">{s.progresso}/6</span>
        ) : (
          <span className="font-semibold text-primary">{s.proxima?.order}º {s.proxima?.short}</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <div>{s.celular}</div>
        <div className="truncate">{s.email}</div>
      </td>
    </tr>
  );
}
