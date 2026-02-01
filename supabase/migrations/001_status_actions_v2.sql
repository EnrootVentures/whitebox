-- Status / Filter tables
create table if not exists report_statuses (
  status_id bigserial primary key,
  code text not null unique,
  label text not null,
  is_terminal boolean not null default false,
  is_filter_stage boolean not null default false,
  display_order int not null default 0,
  allowed_roles text[] not null default '{}'
);

create table if not exists report_status_transitions (
  from_status_id bigint references report_statuses(status_id),
  to_status_id bigint references report_statuses(status_id),
  allowed_roles text[] not null default '{}',
  requires_comment boolean not null default false,
  requires_action boolean not null default false,
  primary key (from_status_id, to_status_id)
);

create table if not exists report_status_history (
  id bigserial primary key,
  report_id bigint not null references reports(report_id) on delete cascade,
  status_id bigint not null references report_statuses(status_id),
  changed_by_user uuid references user_profiles(user_id),
  changed_at timestamptz not null default now(),
  comment_text text
);

create table if not exists report_filter_results (
  result_id bigserial primary key,
  code text not null unique,
  label text not null,
  inbox text not null
);

create table if not exists report_filter_decisions (
  id bigserial primary key,
  report_id bigint not null references reports(report_id) on delete cascade,
  result_id bigint not null references report_filter_results(result_id),
  decided_by_user uuid references user_profiles(user_id),
  decided_at timestamptz not null default now(),
  reasoning text,
  is_auto boolean not null default false,
  needs_super_review boolean not null default false
);

-- Actions tables
create table if not exists report_action_sources (
  source_id bigserial primary key,
  code text unique,
  label text
);

create table if not exists report_action_statuses (
  status_id bigserial primary key,
  code text not null unique,
  label text not null,
  display_order int not null default 0
);

create table if not exists report_action_history (
  id bigserial primary key,
  action_id bigint not null references report_actions(action_id) on delete cascade,
  status_id bigint not null references report_action_statuses(status_id),
  changed_by_user uuid references user_profiles(user_id),
  changed_at timestamptz not null default now(),
  note text
);

create table if not exists report_action_decisions (
  id bigserial primary key,
  action_id bigint not null references report_actions(action_id) on delete cascade,
  decision text not null,
  decided_by_user uuid references user_profiles(user_id),
  decided_at timestamptz not null default now(),
  notes text
);

create table if not exists report_action_feedback (
  id bigserial primary key,
  action_id bigint not null references report_actions(action_id) on delete cascade,
  submitted_by_role text not null,
  effectiveness text not null,
  comment_text text,
  created_at timestamptz not null default now()
);

-- Alter reports table
alter table reports
  add column if not exists status_id bigint references report_statuses(status_id),
  add column if not exists current_filter_result_id bigint references report_filter_results(result_id);

-- Alter report_actions table
alter table report_actions
  add column if not exists owner_org_id bigint,
  add column if not exists created_by_user uuid references user_profiles(user_id),
  add column if not exists source_id bigint references report_action_sources(source_id),
  add column if not exists is_responsible_action boolean not null default false,
  add column if not exists is_public boolean not null default true,
  add column if not exists status_id bigint references report_action_statuses(status_id),
  add column if not exists due_date date;

-- Indexes
create index if not exists report_status_history_report_id_idx on report_status_history(report_id);
create index if not exists report_filter_decisions_report_id_idx on report_filter_decisions(report_id);
create index if not exists report_action_history_action_id_idx on report_action_history(action_id);
create index if not exists report_action_feedback_action_id_idx on report_action_feedback(action_id);

-- Seed data
insert into report_statuses (code,label,is_terminal,is_filter_stage,display_order,allowed_roles)
values
  ('pre_evaluation','Pre Evaluation',false,true,1,'{system_admin,org_admin}'),
  ('waiting_admitted','Waiting (Admitted)',false,false,2,'{system_admin,org_admin}'),
  ('open_in_progress','Opened (In Progress)',false,false,3,'{system_admin,org_admin}'),
  ('investigation','Investigation',false,false,4,'{system_admin,org_admin}'),
  ('remediation','Remediation / Action in Formulation',false,false,5,'{system_admin,org_admin}'),
  ('archived','Archived',true,false,6,'{system_admin,org_admin}')
on conflict (code) do nothing;

insert into report_filter_results (code,label,inbox)
values
  ('admitted','Admitted','admitted'),
  ('out_of_scope','Out of Scope','filter'),
  ('unfounded','Unfounded','archive'),
  ('spam','Spam','spam')
on conflict (code) do nothing;

insert into report_action_sources (code,label)
values
  ('reporter','Reporter'),
  ('advisor','Advisor/Service Provider'),
  ('customer','Customer'),
  ('supplier','Supplier'),
  ('responsible_company','Responsible Company'),
  ('ai','AI'),
  ('super_admin','Super Admin')
on conflict (code) do nothing;

insert into report_action_statuses (code,label,display_order)
values
  ('suggested','Suggested Action',1),
  ('action_formulation','Action in Formulation',2),
  ('action_implemented','Action Implemented',3),
  ('failed','Failed',4),
  ('extended_due','Extended Due Date',5),
  ('successful','Successful',6),
  ('feedback_requested','Feedback Requested',7),
  ('resolved','Resolved',8)
on conflict (code) do nothing;

-- Backfill report status_id from legacy reports.status values
update reports r
set status_id = s.status_id
from report_statuses s
where r.status_id is null
  and (
    (r.status = 'waiting_filter' and s.code = 'pre_evaluation') or
    (r.status = 'waiting' and s.code = 'waiting_admitted') or
    (r.status = 'open' and s.code = 'open_in_progress') or
    (r.status = 'investigation' and s.code = 'investigation') or
    (r.status = 'escalated' and s.code = 'remediation') or
    (r.status = 'archived' and s.code = 'archived') or
    (r.status = 'out_of_scope' and s.code = 'archived')
  );
