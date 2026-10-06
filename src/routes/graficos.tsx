import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { getAlunos } from "@/lib/sheets.functions";
import { buildStudents, COURSES, MAIN } from "@/lib/classes";

const alunosQuery = queryOptions({
  queryKey: ["alunos"],
  queryFn: () => getAlunos(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/graficos")({
  head: () => ({
    meta: [
      { title: "Gráficos das Classes — Jornada do Discipulado" },
      { name: "description", content: "Gráficos interativos de matrículas, progresso e vínculo dos alunos das classes." },
      { property: "og:title", content: "Gráficos das Classes — Jornada do Discipulado" },
      { property: "og:description", content: "Gráficos interativos de matrículas, progresso e vínculo dos alunos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(alunosQuery),
  component: Graficos,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-destructive">Não foi possível carregar a planilha: {(error as Error).message}</div>
  ),
});

const C = {
  primary: "var(--primary)",
  gold: "var(--gold)",
  muted: "var(--muted-foreground)",
  grid: "var(--border)",
};

function Graficos() {
  const { data: rows } = useSuspenseQuery(alunosQuery);
  const all = useMemo(() => buildStudents(rows), [rows]);
  const [vinculo, setVinculo] = useState("todos");
  const students = vinculo === "todos" ? all : all.filter((s) => s.vinculo === vinculo);
  const principais = MAIN.slice(0, 5);

  const funil = COURSES.map((c, i) => {
    const n = students.filter((s) => s.cursos[c.id]).length;
    const prev = i > 0 && c.order && principais.includes(c) ? students.filter((s) => s.cursos[COURSES[i - 1]!.id]).length : 0;
    return { nome: c.short, alunos: n, comp: !principais.includes(c), conv: prev ? Math.round((n / prev) * 100) : null };
  });

  const dist = [1, 2, 3, 4, 5].map((k) => ({
    nome: `${k} classe${k > 1 ? "s" : ""}`,
    alunos: students.filter((s) => principais.filter((c) => s.cursos[c.id]).length === k).length,
  }));

  const vinc = ["Membro", "Congregado"].map((v) => ({ nome: v, valor: all.filter((s) => s.vinculo === v).length }));
  const outros = all.length - vinc.reduce((a, b) => a + b.valor, 0);
  if (outros > 0) vinc.push({ nome: "Sem vínculo", valor: outros });

  const proxima = MAIN.map((c) => ({
    nome: c.short,
    alunos: students.filter((s) => s.progresso > 0 && s.proxima?.id === c.id).length,
  })).filter((x) => x.alunos > 0);

  const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 } };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Caminho do discipulado</p>
          <h1 className="mt-2 text-4xl font-bold text-primary sm:text-5xl">Gráficos interativos</h1>
        </div>
        <div className="flex gap-2">
          <select value={vinculo} onChange={(e) => setVinculo(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="todos">Todos os vínculos</option>
            <option value="Membro">Membros</option>
            <option value="Congregado">Congregados</option>
          </select>
          <Link to="/" className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-semibold hover:bg-muted">
            ← Voltar ao painel
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Alunos por classe" sub="Dourado = classes complementares. Passe o mouse para ver a retenção.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funil}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 12, fill: C.muted }} />
              <YAxis tick={{ fontSize: 12, fill: C.muted }} />
              <Tooltip {...tip} formatter={(v, _n, p) => [`${v}${p.payload.conv ? ` (${p.payload.conv}% da anterior)` : ""}`, "Alunos"]} />
              <Bar dataKey="alunos" radius={[6, 6, 0, 0]}>
                {funil.map((f) => <Cell key={f.nome} fill={f.comp ? C.gold : C.primary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Quantas classes principais cada aluno fez" sub="Considera apenas as 5 classes principais.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dist}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 12, fill: C.muted }} />
              <YAxis tick={{ fontSize: 12, fill: C.muted }} />
              <Tooltip {...tip} formatter={(v) => [v, "Alunos"]} />
              <Bar dataKey="alunos" radius={[6, 6, 0, 0]}>
                {dist.map((d, i) => <Cell key={d.nome} fill={i === 4 ? C.gold : C.primary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Membros e congregados" sub="Todos os alunos únicos.">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={vinc} dataKey="valor" nameKey="nome" innerRadius={70} outerRadius={110} paddingAngle={2}>
                {vinc.map((v, i) => <Cell key={v.nome} fill={[C.primary, C.gold, C.muted][i]} />)}
              </Pie>
              <Tooltip {...tip} formatter={(v) => [`${v} (${Math.round((Number(v) / all.length) * 100)}%)`, "Alunos"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Quem está pronto para cada próxima classe" sub="Alunos que já começaram e ainda não fizeram a próxima da sequência.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={proxima} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke={C.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: C.muted }} />
              <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 12, fill: C.muted }} />
              <Tooltip {...tip} formatter={(v) => [v, "Alunos"]} />
              <Bar dataKey="alunos" fill={C.primary} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </main>
  );
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{sub}</p>
      {children}
    </section>
  );
}
