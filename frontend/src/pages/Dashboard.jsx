import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import KpiGrid from '../components/ui/KpiGrid';
import KpiCard from '../components/ui/KpiCard';
import ChartCard from '../components/charts/ChartCard';
import { DEMO_PERSONAL_FOOTPRINT } from '../data/mockData';
import { useAuth } from '../hooks/useAuth';
import DatasetSubmission from '../components/datasets/DatasetSubmission';
import { createActivity, listActivities, updateActivity, deleteActivity } from '../services/activityService';

export default function Dashboard() {
  const { profile } = useAuth();
  const [demoConnected, setDemoConnected] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(null);
  const startNewActivity = () => { setEditingActivity(null); setShowActivityForm(true); };
  const handleDelete = async (id) => {
    setDeletingActivity(id); setActivityError('');
    try { await deleteActivity(id); setPendingDelete(null); await loadActivities(); }
    catch (error) { setActivityError(error.message || 'Unable to delete this activity.'); }
    finally { setDeletingActivity(null); }
  };

  const loadActivities = useCallback(async () => {
    try {
      setActivityError('');
      setActivities(await listActivities());
    } catch (error) {
      setActivityError(error.message || 'Unable to load your activities.');
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const activityData = useMemo(() => {
    if (!activities.length) return null;
    const totalKg = activities.reduce((sum, activity) => sum + Number(activity.co2_emission), 0);
    const categoryTotals = activities.reduce((totals, activity) => {
      const category = activity.category || 'Other';
      totals[category] = (totals[category] || 0) + Number(activity.co2_emission);
      return totals;
    }, {});
    const sources = Object.entries(categoryTotals).map(([label, value]) => ({
      label,
      percentage: totalKg ? Math.round((value / totalKg) * 100) : 0,
      value: `${value.toFixed(1)} kg`,
    }));
    const monthlyTotals = activities.reduce((totals, activity) => {
      const month = activity.activity_date.slice(0, 7);
      totals[month] = (totals[month] || 0) + Number(activity.co2_emission);
      return totals;
    }, {});
    const trend = Object.entries(monthlyTotals)
      .sort(([first], [second]) => first.localeCompare(second))
      .slice(-12)
      .map(([month, emissions]) => ({
        month: new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        emissions: Number(emissions.toFixed(2)),
      }));
    const sortedCategories = Object.entries(categoryTotals).sort(([, first], [, second]) => second - first);
    const sortedMonths = Object.entries(monthlyTotals).sort(([first], [second]) => first.localeCompare(second));
    const previousMonth = sortedMonths.at(-2)?.[1];
    const latestMonth = sortedMonths.at(-1)?.[1];
    const monthlyChange = previousMonth
      ? `${(((latestMonth - previousMonth) / previousMonth) * 100).toFixed(0)}%`
      : null;

    return {
      total: (totalKg / 1000).toFixed(2),
      monthlyChange,
      largestSource: sortedCategories[0]?.[0] || 'Other',
      largestSourcePercentage: totalKg ? Math.round((sortedCategories[0]?.[1] / totalKg) * 100) : 0,
      activities: activities.slice(0, 10).map((activity) => ({
        name: activity.activity_name,
        type: `${activity.category} · ${activity.activity_date}`,
        delta: `${Number(activity.co2_emission).toFixed(1)} kg CO₂e`,
      })),
      sources,
      trend,
    };
  }, [activities]);

  const data = activityData || (demoConnected ? DEMO_PERSONAL_FOOTPRINT : null);
  const hasData = !!data;

  const handleToggleDemo = () => {
    setDemoConnected(!demoConnected);
  };

  const handleCreateActivity = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    setSavingActivity(true);
    setActivityError('');
    try {
      const changes = {
        category: formData.get('category').trim(),
        activity_name: formData.get('activity_name').trim(),
        amount: Number(formData.get('amount')),
        unit: formData.get('unit').trim(),
        co2_emission: Number(formData.get('co2_emission')),
        activity_date: formData.get('activity_date'),
      };
      if (editingActivity) await updateActivity(editingActivity.id, changes);
      else await createActivity({ ...changes, user_id: profile.id });
      setEditingActivity(null);
      form.reset();
      setShowActivityForm(false);
      await loadActivities();
    } catch (error) {
      setActivityError(error.message || 'Unable to save this activity.');
    } finally {
      setSavingActivity(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          fontFamily: 'var(--font-mono)'
        }}>
          <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>{label}</p>
          <p style={{ color: 'var(--accent)', fontSize: '13px' }}>
            Footprint: <b>{payload[0].value} kg CO₂e</b>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container">
      <div className="personal-dash-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Your Carbon Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Track and manage your individual carbon footprint
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={startNewActivity} className="btn btn-primary">
            + Add activity
          </button>
          <button onClick={handleToggleDemo} className="demo-connect-btn">
            {demoConnected ? "🔌 Disconnect Demo Profile" : "🔌 Connect Demo Profile"}
          </button>
        </div>
      </div>

      {activityError && <p role="alert" style={{ marginBottom: '16px' }}>{activityError}</p>}
      {showActivityForm && (
        <form key={editingActivity?.id || 'new'} className="chart-card login-form" onSubmit={handleCreateActivity} style={{ marginBottom: '24px' }}>
          <h3>{editingActivity ? 'Edit carbon activity' : 'Log a carbon activity'}</h3>
          <div className="form-field">
            <label htmlFor="activity-category">Category</label>
            <input id="activity-category" name="category" defaultValue={editingActivity?.category ?? ''} className="text-input" required maxLength={100} placeholder="Transport, Energy, Food…" />
          </div>
          <div className="form-field">
            <label htmlFor="activity-name">Activity</label>
            <input id="activity-name" name="activity_name" defaultValue={editingActivity?.activity_name ?? ''} className="text-input" required maxLength={200} />
          </div>
          <div className="form-field">
            <label htmlFor="activity-amount">Amount</label>
            <input id="activity-amount" name="amount" defaultValue={editingActivity?.amount ?? ''} className="text-input" type="number" min="0" step="any" required />
          </div>
          <div className="form-field">
            <label htmlFor="activity-unit">Unit</label>
            <input id="activity-unit" name="unit" defaultValue={editingActivity?.unit ?? ''} className="text-input" required maxLength={50} placeholder="km, kWh, kg…" />
          </div>
          <div className="form-field">
            <label htmlFor="activity-emission">CO₂ emission (kg CO₂e)</label>
            <input id="activity-emission" name="co2_emission" defaultValue={editingActivity?.co2_emission ?? ''} className="text-input" type="number" min="0" step="any" required />
          </div>
          <div className="form-field">
            <label htmlFor="activity-date">Activity date</label>
            <input id="activity-date" name="activity_date" className="text-input" type="date" required defaultValue={editingActivity?.activity_date || new Date().toLocaleDateString('en-CA')} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingActivity}>
            {savingActivity ? 'Saving…' : editingActivity ? 'Save changes' : 'Save activity'}
          </button>
          <button className="btn btn-secondary" type="button" disabled={savingActivity} onClick={() => { setShowActivityForm(false); setEditingActivity(null); }}>Cancel</button>
        </form>
      )}

      {demoConnected && !activityData && <p role="status">Demo profile: all displayed activity and goal values are illustrative and are not saved to your account.</p>}
      {/* KPI Cards */}
      <KpiGrid>
        <KpiCard
          title="Personal Footprint"
          value={hasData ? `${data.total} t` : null}
          desc={activities.length ? "Sum of logged activity estimates" : hasData ? "Annual emission estimate" : null}
          isEmpty={!hasData}
        />
        <KpiCard
          title="Monthly Change"
          value={activities.length ? activityData.monthlyChange : hasData ? "-8%" : null}
          desc={activities.length
            ? activityData.monthlyChange ? "vs. previous logged month" : "Needs two months of activity"
            : hasData ? "vs. previous month" : null}
          isEmpty={!hasData}
        />
        <KpiCard
          title="Largest Source"
          value={activities.length ? activityData.largestSource : hasData ? "Transport" : null}
          desc={activities.length
            ? `${activityData.largestSourcePercentage}% of logged emissions`
            : hasData ? "42% of total emissions" : null}
          isEmpty={!hasData}
        />
        <KpiCard
          title="Activities Logged"
          value={activities.length ? `${activities.length}` : hasData ? `${data.activities.length}` : "0"}
          desc={activities.length || hasData ? "Total logged records" : loadingActivities ? "Loading records…" : "No records tracked"}
          isEmpty={!hasData}
        />
      </KpiGrid>

      <div className="analytics-grid" style={{ marginTop: '24px' }}>
        {/* Carbon Trend */}
        <ChartCard
          title="Carbon Trend"
          subtitle="Monthly emission trend in kg CO₂e"
          empty={!hasData}
        >
          {hasData && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.trend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="personalCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="var(--text-secondary)" 
                  fontSize={11} 
                  fontFamily="var(--font-mono)"
                  tickLine={false}
                  dy={8}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={11} 
                  fontFamily="var(--font-mono)"
                  tickLine={false}
                  dx={-8}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="emissions" 
                  stroke="var(--accent)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#personalCo2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Activity Breakdown */}
        <div className="chart-card">
          <div className="chart-header" style={{ marginBottom: '16px' }}>
            <div className="chart-title-wrapper">
              <h3>Activity Breakdown</h3>
              <p>Carbon weight breakdown by activity category</p>
            </div>
          </div>
          <div className="source-bars-list" style={{ marginTop: '0px' }}>
            {(hasData ? data.sources : [
              { label: "Transport", percentage: 0, value: "--" },
              { label: "Energy", percentage: 0, value: "--" },
              { label: "Food", percentage: 0, value: "--" },
              { label: "Travel", percentage: 0, value: "--" },
              { label: "Other", percentage: 0, value: "--" }
            ]).map((source, idx) => (
              <div className="source-bar-item" key={idx}>
                <span className="label" style={{ minWidth: '80px' }}>{source.label}</span>
                <div className="bar-track">
                  <div 
                    className="bar-fill" 
                    style={{ width: `${source.percentage}%` }}
                  ></div>
                </div>
                <span className="value">{source.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="analytics-grid" style={{ marginTop: '24px' }}>
        {/* Recent Activity */}
        <div className="chart-card">
          <div className="chart-header" style={{ marginBottom: '16px' }}>
            <div className="chart-title-wrapper">
              <h3>Recent Activity</h3>
              <p>Recently tracked footprint activities</p>
            </div>
          </div>
          {activities.length ? (
            <ul className="activity-list">
              {activities.slice(0, 10).map((activity) => (
                <li key={activity.id}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{activity.activity_name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {activity.category} · {activity.amount} {activity.unit} · {activity.activity_date}
                    </span>
                  </div>
                  <div className="activity-actions">
                    <b>{Number(activity.co2_emission).toFixed(1)} kg CO₂e</b>
                    <button className="btn btn-secondary" type="button" disabled={savingActivity || Boolean(deletingActivity)} onClick={() => { setEditingActivity(activity); setShowActivityForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit<span className="sr-only"> {activity.activity_name}</span></button>
                    {pendingDelete === activity.id ? <>
                      <span>Delete this activity?</span>
                      <button className="btn btn-secondary" type="button" disabled={Boolean(deletingActivity)} onClick={() => handleDelete(activity.id)}>{deletingActivity === activity.id ? 'Deleting…' : 'Confirm delete'}</button>
                      <button className="btn btn-secondary" type="button" disabled={Boolean(deletingActivity)} onClick={() => setPendingDelete(null)}>Keep activity</button>
                    </> : <button className="btn btn-secondary" type="button" onClick={() => setPendingDelete(activity.id)}>Delete<span className="sr-only"> {activity.activity_name}</span></button>}
                  </div>
                </li>
              ))}
            </ul>
          ) : hasData ? (
            <ul className="activity-list">
              {data.activities.map((act, idx) => (
                <li key={idx}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{act.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{act.type}</span>
                  </div>
                  <b>{act.delta}</b>
                </li>
              ))}
            </ul>
          ) : (
            <div className="comparison-result" style={{ border: 'none', background: 'none', padding: '16px 0' }}>
              <div className="state-overlay">
                <div className="state-icon">➕</div>
                <div className="state-title">No Activities Logged</div>
                <div className="state-desc">You have not tracked any emissions. Click "Add activity" to start.</div>
              </div>
            </div>
          )}
          <button className="add-activity-btn" style={{ marginTop: '24px' }} onClick={startNewActivity}>
            + Add activity
          </button>
        </div>

        {/* Reduction Progress */}
        <div className="chart-card">
          <div className="chart-header" style={{ marginBottom: '16px' }}>
            <div className="chart-title-wrapper">
              <h3>Reduction Progress</h3>
              <p>Illustrative goal shown only for the demo profile</p>
            </div>
          </div>
          <div className="comparison-result" style={{ border: 'none', background: 'none', padding: '0px' }}>
            {demoConnected && !activityData ? (
              <div style={{ textAlign: 'left', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                  <span>Annual Savings Goal</span>
                  <b style={{ color: 'var(--accent)' }}>12%</b>
                </div>
                <div className="bar-track" style={{ height: '12px', borderRadius: '6px', marginBottom: '20px' }}>
                  <div className="bar-fill" style={{ width: '85%', borderRadius: '6px' }}></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Calculated footprint:</span>
                    <b>6.2 t</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Target footprint:</span>
                    <b>5.5 t</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Remaining reduction:</span>
                    <b>0.7 t</b>
                  </div>
                </div>
              </div>
            ) : (
              <div className="state-overlay">
                <div className="state-icon">🎯</div>
                <div className="state-title">No Reduction Goal Active</div>
                <div className="state-desc">Your logged activities show your recorded footprint. A reduction percentage requires a comparable baseline and reporting period.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DatasetSubmission userId={profile.id} />
    </div>
  );
}
