// Team view + activity feed section (shown at the bottom of Log) —
// Ant Design restyle. Team tables and the activity feed are antd Table
// and List. The feed gains an "Open task" action per entry — it falls
// out of the List swap naturally (the prototype feed already has it;
// the standalone feed did not). Entries without a task (material,
// shift, import) get no button.
import { Button, Card, Empty, List, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { tr, tDept, tRole, tRoleDesc, tApprove, type Lang, type Person, type State } from './lib';

export function TeamView({ S, lang }: { S: State; lang: Lang }) {
  const byDept: Record<string, typeof S.people> = {};
  for (const p of S.people) { (byDept[p.department] = byDept[p.department] || []).push(p); }
  const cols: ColumnsType<Person> = [
    { title: tr(lang, 'th_name'), dataIndex: 'name', key: 'name' },
    { title: tr(lang, 'th_role'), key: 'role', render: (_, p) => tRoleDesc(lang, p.role) },
    { title: tr(lang, 'th_can_approve'), key: 'approve', render: (_, p) => tApprove(lang, p.role) },
  ];
  return (
    <div>
      <h2>{tr(lang, 'team_title')}</h2><p className="muted">{tr(lang, 'team_sub')}</p>
      {Object.entries(byDept).map(([dept, list]) => (
        <Card key={dept} className="panel-card" title={tDept(lang, dept)}>
          <Table<Person> rowKey="id" dataSource={list} columns={cols} pagination={false} />
        </Card>
      ))}
    </div>
  );
}

// Activity feed, shown as the last section of the Log view (one scroll:
// monthly report on top, activity feed below). Same content and order as
// the old Activity view; the heading drops from h2 to h3 because it is
// now a section, not a view. Empty state names the cause (R-27): the feed
// is empty until someone does something worth logging.
export function ActivitySection({ S, lang, openTask }: { S: State; lang: Lang; openTask: (id: number) => void }) {
  const personName = (id: number | null) => S.people.find((p) => p.id === id)?.name || '–';
  return (
    <Card className="panel-card" title={tr(lang, 'activity_title')}>
      {S.activity.length ? (
        <List
          dataSource={S.activity}
          renderItem={(a) => (
            <List.Item key={a.id}
              actions={a.taskId ? [<Button key="open" type="link" size="small" onClick={() => openTask(a.taskId!)}>{tr(lang, 'open_task')}</Button>] : []}>
              <List.Item.Meta
                title={<span><b>{personName(a.actorId)}</b> · {a.text}</span>}
                description={new Date(a.createdAt).toLocaleString(lang === 'id' ? 'id-ID' : 'en-GB')} />
            </List.Item>
          )} />
      ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr(lang, 'activity_empty')} />}
    </Card>
  );
}
