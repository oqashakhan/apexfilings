"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminApplication, AdminStatusEvent } from "@/lib/admin-models";

export default function ApplicationsChart({ month = "all", applications, statusEvents }: { month?: string; applications: AdminApplication[]; statusEvents: AdminStatusEvent[] }) {
  const months = Array.from({ length: 6 }, (_, index) => { const value = new Date(); value.setDate(1); value.setMonth(value.getMonth() - 5 + index); return value; });
  const chartData = months.map((value) => { const key = value.toISOString().slice(0, 7); return { month: value.toLocaleString("en-US", { month: "short" }), key, new: applications.filter((item) => item.submittedAt?.startsWith(key)).length, completed: statusEvents.filter((item) => item.status === "Completed" && item.date.startsWith(key)).length }; });
  const visible = month === "all" ? chartData : chartData.filter((item) => item.key === month);
  return <div className="chart-container" role="img" aria-label="New and completed applications over the past six months">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={visible} margin={{ top: 15, right: 12, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9edf2" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#8a97a8", fontSize: 12 }} dy={12} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8a97a8", fontSize: 12 }} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 12px 28px rgba(25,31,41,.08)" }} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, paddingBottom: 18 }} />
        <Line type="monotone" dataKey="new" name="New applications" stroke="#F04623" strokeWidth={2.5} dot={{ r: 3, fill: "#F04623" }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="completed" name="Completed applications" stroke="#263447" strokeWidth={2.5} dot={{ r: 3, fill: "#263447" }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
