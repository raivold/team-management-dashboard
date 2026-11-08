// Team + Activity views — ported from public/app.js.
import { tr, tDept, tRole, tRoleDesc, tApprove, type Lang, type State } from './lib';

export function TeamView({ S, lang }: { S: State; lang: Lang }) {
  const byDept: Record<string, typeof S.people> = {};
  for (const p of S.people) { (byDept[p.department] = byDept[p.department] || []).push(p); }
  return (
    <div>
      <h2>{tr(lang, 'team_title')}</h2><p className="muted">{tr(lang, 'team_sub')}</p>
      {Object.entries(byDept).map(([dept, list]) => (
        <div key={dept} className="panel">
          <h3>{tDept(lang, dept)}</h3>
          <table><thead><tr><th>{tr(lang, 'th_name')}</th><th>{tr(lang, 'th_role')}</th><th>{tr(lang, 'th_can_approve')}</th></tr></thead>
            <tbody>{list.map((p) => <tr key={p.id}><td>{p.name}</td><td>{tRoleDesc(lang, p.role)}</td><td>{tApprove(lang, p.role)}</td></tr>)}</tbody></table>
        </div>
      ))}
    </div>
  );
}

export function ActivityView({ S, lang }: { S: State; lang: Lang }) {
  const personName = (id: number | null) => S.people.find((p) => p.id === id)?.name || '—';
  return (
    <div>
      <h2>{tr(lang, 'activity_title')}</h2>
      <div className="panel"><ul>
        {S.activity.map((a) => <li key={a.id}><b>{personName(a.actorId)}</b> — {a.text} <span className="muted">({new Date(a.createdAt).toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB')})</span></li>)}
      </ul></div>
    </div>
  );
}
