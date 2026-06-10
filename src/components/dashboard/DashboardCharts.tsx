'use client';

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnalyticsSummary } from '@/lib/api';
import { TASK_STATUS_LABELS } from '@/lib/roles';
import ui from '@/components/ui/ui.module.css';
import styles from './dashboard-charts.module.css';

const PROJECT_COLORS = ['#6366f1', '#22c55e', '#ef4444'];
const STATUS_COLORS = ['#94a3b8', '#6366f1', '#f59e0b', '#22c55e'];

interface DashboardChartsProps {
  summary: AnalyticsSummary;
}

export function DashboardCharts({ summary }: DashboardChartsProps) {
  const projectData = [
    { name: 'Active', value: summary.projects.active },
    { name: 'Completed', value: summary.projects.completed },
    { name: 'Delayed', value: summary.projects.delayed },
  ].filter((d) => d.value > 0);

  const taskStatusData = Object.entries(summary.tasksByStatus).map(([status, count]) => ({
    name: TASK_STATUS_LABELS[status] ?? status,
    count,
  }));

  const userData = summary.tasksCompletedPerUser
    .map((u) => ({
      name: `${u.firstName} ${u.lastName[0]}.`,
      count: u.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className={styles.grid}>
      <div className={ui.card}>
        <div className={ui.cardTitle}>Projects Overview</div>
        <div className={ui.cardDesc}>Active, completed, and delayed</div>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={projectData.length ? projectData : [{ name: 'No data', value: 1 }]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {(projectData.length ? projectData : [{ name: 'No data', value: 1 }]).map(
                  (_, i) => (
                    <Cell key={i} fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} />
                  ),
                )}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.legend}>
          <span>Active: {summary.projects.active}</span>
          <span>Completed: {summary.projects.completed}</span>
          <span>Delayed: {summary.projects.delayed}</span>
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.cardTitle}>Tasks by Status</div>
        <div className={ui.cardDesc}>Current workload breakdown</div>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={taskStatusData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {taskStatusData.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.cardTitle}>Tasks Completed per User</div>
        <div className={ui.cardDesc}>Done tasks by assignee</div>
        <div className={styles.chart}>
          {userData.length === 0 ? (
            <p className={styles.empty}>No completed tasks yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={userData} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={`${ui.card} ${styles.rateCard}`}>
        <div className={ui.cardTitle}>Team Completion Rate</div>
        <div className={ui.cardDesc}>
          {summary.totals.completedTasks} of {summary.totals.tasks} tasks done
        </div>
        <div className={styles.rateValue}>{summary.teamCompletionRate}%</div>
        <div className={styles.rateBar}>
          <div
            className={styles.rateFill}
            style={{ width: `${Math.min(summary.teamCompletionRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
