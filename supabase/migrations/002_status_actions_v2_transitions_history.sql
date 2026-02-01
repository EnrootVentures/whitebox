-- Enforce status transitions + log history

create or replace function enforce_report_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status_id is distinct from old.status_id then
    -- Allow if no transitions are defined yet
    if exists (select 1 from report_status_transitions) then
      if old.status_id is not null then
        if not exists (
          select 1
          from report_status_transitions
          where from_status_id = old.status_id
            and to_status_id = new.status_id
        ) then
          raise exception 'Invalid report status transition';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function log_report_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status_id is not null then
      insert into report_status_history (report_id, status_id, changed_by_user, comment_text)
      values (new.report_id, new.status_id, auth.uid(), null);
    end if;
    return new;
  end if;

  if new.status_id is distinct from old.status_id then
    insert into report_status_history (report_id, status_id, changed_by_user, comment_text)
    values (new.report_id, new.status_id, auth.uid(), null);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_report_status_transition on reports;
create trigger trg_enforce_report_status_transition
before update of status_id on reports
for each row
execute function enforce_report_status_transition();

drop trigger if exists trg_log_report_status_change on reports;
create trigger trg_log_report_status_change
after insert or update of status_id on reports
for each row
execute function log_report_status_change();

-- Seed allowed transitions (idempotent)
insert into report_status_transitions (from_status_id, to_status_id, allowed_roles, requires_comment, requires_action)
select fs.status_id, ts.status_id, '{system_admin,org_admin}', false, false
from report_statuses fs
join report_statuses ts on ts.code = 'waiting_admitted'
where fs.code = 'pre_evaluation'
on conflict do nothing;

insert into report_status_transitions (from_status_id, to_status_id, allowed_roles, requires_comment, requires_action)
select fs.status_id, ts.status_id, '{system_admin,org_admin}', false, false
from report_statuses fs
join report_statuses ts on ts.code = 'open_in_progress'
where fs.code = 'waiting_admitted'
on conflict do nothing;

insert into report_status_transitions (from_status_id, to_status_id, allowed_roles, requires_comment, requires_action)
select fs.status_id, ts.status_id, '{system_admin,org_admin}', false, false
from report_statuses fs
join report_statuses ts on ts.code = 'investigation'
where fs.code in ('waiting_admitted','open_in_progress')
on conflict do nothing;

insert into report_status_transitions (from_status_id, to_status_id, allowed_roles, requires_comment, requires_action)
select fs.status_id, ts.status_id, '{system_admin,org_admin}', false, true
from report_statuses fs
join report_statuses ts on ts.code = 'remediation'
where fs.code in ('open_in_progress','investigation','waiting_admitted')
on conflict do nothing;

-- Allow archive from any non-archived status
insert into report_status_transitions (from_status_id, to_status_id, allowed_roles, requires_comment, requires_action)
select fs.status_id, ts.status_id, '{system_admin,org_admin}', false, false
from report_statuses fs
join report_statuses ts on ts.code = 'archived'
where fs.code <> 'archived'
on conflict do nothing;
