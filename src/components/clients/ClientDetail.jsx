import { formatCurrency, formatDate } from '../../utils/dateUtils.js';
import { getProjectTypeLabel, getSupportPlanTypeLabel } from '../../utils/calculations.js';

export default function ClientDetail({ client, projects, supportPlans, payments, onClose }) {
  const clientProjects = projects.filter(p => p.clientName === client.name);
  const clientPlans    = supportPlans.filter(s => s.clientName === client.name);
  const clientPayments = payments.filter(p => p.clientName === client.name);
  const totalRevenue   = clientPayments.reduce((s, p) => s + p.amount, 0);
  const activePlans    = clientPlans.filter(p => p.status === 'active');
  const monthlyValue   = activePlans.reduce((s, p) => s + p.monthlyAmount, 0);

  return (
    <div className="card" style={{ border: '2px solid #A678D1' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>{client.name}</h3>
          {client.contactName && <p style={{ color: '#666', fontSize: '0.9rem' }}>Contact: {client.contactName}</p>}
        </div>
        <button className="btn-cancel" onClick={onClose}>Close</button>
      </div>

      {/* Contact Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20, padding: '14px', background: '#f8f9fa', borderRadius: 8 }}>
        {client.email && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Email</div>
            <a href={`mailto:${client.email}`} style={{ color: '#A678D1', fontWeight: 600, fontSize: '0.9rem' }}>{client.email}</a>
          </div>
        )}
        {client.phone && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Phone</div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{client.phone}</span>
          </div>
        )}
        {client.website && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Website</div>
            <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer" style={{ color: '#1D8A99', fontWeight: 600, fontSize: '0.9rem' }}>{client.website}</a>
          </div>
        )}
        {client.contractStart && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Contract Start</div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatDate(client.contractStart)}</span>
          </div>
        )}
        {client.contractEnd && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Contract Renewal</div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FC7645' }}>{formatDate(client.contractEnd)}</span>
          </div>
        )}
      </div>

      {/* Revenue summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="metric-card metric-teal">
          <h4>Total Revenue</h4>
          <div className="value">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="metric-card metric-purple">
          <h4>Active Plans</h4>
          <div className="value">{activePlans.length}</div>
        </div>
        <div className="metric-card">
          <h4>Monthly Value</h4>
          <div className="value">{formatCurrency(monthlyValue)}/mo</div>
        </div>
        <div className="metric-card metric-gold">
          <h4>Projects</h4>
          <div className="value">{clientProjects.length}</div>
        </div>
      </div>

      {/* Support Plans */}
      {clientPlans.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h4 style={{ color: '#A678D1', marginBottom: 10 }}>Support Plans</h4>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Plan</th><th>Monthly</th><th>Status</th><th>Since</th></tr></thead>
              <tbody>
                {clientPlans.map(p => (
                  <tr key={p.id}>
                    <td>{getSupportPlanTypeLabel(p.planType)}</td>
                    <td>{formatCurrency(p.monthlyAmount)}</td>
                    <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                    <td>{formatDate(p.startDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects */}
      {clientProjects.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h4 style={{ color: '#A678D1', marginBottom: 10 }}>Projects</h4>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead>
              <tbody>
                {clientProjects.map(p => (
                  <tr key={p.id}>
                    <td>{getProjectTypeLabel(p.projectType)}</td>
                    <td>{formatCurrency(p.totalAmount)}</td>
                    <td>{formatCurrency(p.paidAmount)}</td>
                    <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {client.notes && (
        <div style={{ padding: '12px 16px', background: '#f8f9fa', borderRadius: 6, fontSize: '0.9rem', color: '#555', borderLeft: '3px solid #A678D1' }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Notes</strong>
          {client.notes}
        </div>
      )}
    </div>
  );
}
