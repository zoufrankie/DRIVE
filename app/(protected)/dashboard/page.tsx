"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

type Kpis = {
  revenueThisMonth: number;
  paymentsThisMonth: number;
  outstandingBalance: number;
  outstandingCount: number;
  jobsInProgressCount: number;
  jobsInProgressTotal: number;
  newClientsThisMonth: number;
  invoicesThisMonth: number;
};

type MonthlyPoint = {
  key: string;
  label: string;
  revenue: number;
  payments: number;
  invoicesCount: number;
  newClients: number;
  existingClients: number;
};

type CategoryPoint = {
  category: string;
  revenue: number;
  jobCount: number;
};

type OverdueInvoice = {
  id: string;
  number: string;
  clientName: string;
  total: number;
  balance: number;
  daysOld: number;
};

type Dashboard = {
  kpis: Kpis;
  monthly: MonthlyPoint[];
  byCategory: CategoryPoint[];
  overdue: OverdueInvoice[];
};

const CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#94a3b8",
];

function money(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function compact(n: number): string {
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
  return "$" + n.toFixed(0);
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch((e) => setError(`Load failed (${e})`))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-700 text-sm">Loading dashboard...</div>;
  if (error)
    return (
      <div className="p-8 m-8 bg-red-50 border border-red-300 text-red-800 text-sm rounded">
        {error}
      </div>
    );
  if (!data) return null;

  const { kpis, monthly, byCategory, overdue } = data;

  return (
    <div className="p-8 w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Dashboard</h1>
        <p className="text-gray-700 mt-1">Live snapshot of shop performance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Revenue This Month"
          value={money(kpis.revenueThisMonth)}
          sub={`${kpis.invoicesThisMonth} invoice${kpis.invoicesThisMonth === 1 ? "" : "s"} issued`}
          accent="blue"
        />
        <KpiCard
          label="Payments Received"
          value={money(kpis.paymentsThisMonth)}
          sub="Cash collected this month"
          accent="green"
        />
        <KpiCard
          label="Outstanding Balance"
          value={money(kpis.outstandingBalance)}
          sub={`${kpis.outstandingCount} invoice${kpis.outstandingCount === 1 ? "" : "s"} awaiting payment`}
          accent="orange"
        />
        <KpiCard
          label="Jobs In Progress"
          value={`${kpis.jobsInProgressCount} job${kpis.jobsInProgressCount === 1 ? "" : "s"}`}
          sub={`${money(kpis.jobsInProgressTotal)} total`}
          accent="purple"
        />
        <KpiCard
          label="New Clients This Month"
          value={String(kpis.newClientsThisMonth)}
          sub="First-time customers"
          accent="indigo"
        />
        <KpiCard
          label="Invoices This Month"
          value={String(kpis.invoicesThisMonth)}
          sub="Estimates and jobs"
          accent="gray"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue vs Payments" subtitle="Last 12 months">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number, name: string) => [money(v), name]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone" dataKey="revenue" name="Billed"
                stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }}
              />
              <Line
                type="monotone" dataKey="payments" name="Received"
                stroke="#10b981" strokeWidth={2} dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Clients per Month" subtitle="New vs returning">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="newClients" stackId="a" name="New" fill="#3b82f6" />
              <Bar dataKey="existingClients" stackId="a" name="Returning" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="New Invoices per Month" subtitle="Job volume">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="invoicesCount" name="Invoices" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Service" subtitle="Last 12 months">
          {byCategory.length === 0 ? (
            <p className="text-gray-600 text-sm py-12 text-center">No categorized work yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={byCategory}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={100}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="revenue" name="Revenue">
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Jobs by Service" subtitle="Last 12 months">
          {byCategory.length === 0 ? (
            <p className="text-gray-600 text-sm py-12 text-center">No categorized work yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={byCategory}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={100}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="jobCount" name="Jobs">
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Service Revenue vs Job Count" subtitle="Combined view">
          {byCategory.length === 0 ? (
            <p className="text-gray-600 text-sm py-12 text-center">No categorized work yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byCategory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 9 }}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis yAxisId="left" tickFormatter={compact} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === "Revenue" ? [money(v), name] : [String(v), name]
                  }
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#3b82f6" />
                <Bar yAxisId="right" dataKey="jobCount" name="Jobs" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Overdue */}
      <div className="bg-white border border-gray-300 rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-300 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-black">Overdue Invoices</h2>
            <p className="text-xs text-gray-600">
              Unpaid for more than 14 days
            </p>
          </div>
          <div className="text-sm text-gray-700">
            {overdue.length} invoice{overdue.length === 1 ? "" : "s"}
          </div>
        </div>
        {overdue.length === 0 ? (
          <p className="p-6 text-gray-600 text-sm">No overdue invoices — everything&apos;s on track.</p>
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-gray-100 border-b border-gray-300 text-xs font-semibold uppercase tracking-wide text-gray-700">
              <div>Invoice</div>
              <div>Client</div>
              <div className="text-right">Total</div>
              <div className="text-right">Balance</div>
              <div className="text-right">Days Old</div>
            </div>
            {overdue.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-gray-100 last:border-b-0 text-sm hover:bg-gray-50 items-center"
              >
                <div className="font-mono text-blue-700 font-semibold">{inv.number}</div>
                <div className="text-black truncate">{inv.clientName}</div>
                <div className="text-black font-mono text-right">{money(inv.total)}</div>
                <div className="text-orange-700 font-mono text-right font-semibold">
                  {money(inv.balance)}
                </div>
                <div className="text-black text-right">{inv.daysOld} days</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "blue" | "green" | "orange" | "purple" | "indigo" | "gray";
}) {
  const accents: Record<typeof accent, string> = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    orange: "border-l-orange-500",
    purple: "border-l-purple-500",
    indigo: "border-l-indigo-500",
    gray: "border-l-gray-500",
  };
  return (
    <div className={`bg-white border border-gray-300 border-l-4 rounded p-4 ${accents[accent]}`}>
      <div className="text-xs uppercase tracking-wide text-gray-600">{label}</div>
      <div className="text-2xl font-bold text-black mt-1 truncate">{value}</div>
      <div className="text-xs text-gray-600 mt-1">{sub}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-300 rounded p-4">
      <div className="mb-3">
        <h3 className="text-base font-bold text-black">{title}</h3>
        {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}