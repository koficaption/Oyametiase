# Role / permission matrix

Authorization is enforced three times:

1. Navigation (UI hides unauthorized items)
2. Server Actions (`requirePermission` / `requireRole`)
3. PostgreSQL RLS (cannot be bypassed from the client)

Hiding a button is never the only control.

## Roles

- **PE** — Presiding Elder
- **SEC** — Assembly Secretary
- **FIN** — Treasurer / Finance Officer
- **DL** — Department Leader (scoped to assigned departments)
- **WK** — Worker / officer
- **MEM** — Member (portal)

`Y` = allowed. `S` = scoped (own record, own department, or assigned follow-up). `R` = read / report only. `—` = denied.

| Capability | PE | SEC | FIN | DL | WK | MEM |
| --- | --- | --- | --- | --- | --- | --- |
| Assembly dashboard | Y | Y | Y | Y | Y | — |
| Finance dashboard | R | — | Y | — | — | — |
| Member portal | Y | Y | Y | Y | Y | Y |
| View members (directory) | Y | Y | S | S | S | — |
| Create / edit / archive members | Y | Y | — | — | — | — |
| Edit own permitted profile fields | Y | Y | Y | Y | Y | Y |
| View sensitive member notes / emergency contacts | Y | Y | — | — | — | own |
| Attendance record / summaries | Y | Y | — | S | S | own |
| Visitors + visitor follow-up | Y | Y | — | — | S | — |
| New convert / new member follow-up | Y | Y | — | S | S | — |
| Departments (create / deactivate) | Y | Y | — | — | — | — |
| Department members / activities | Y | Y | — | S | S | S |
| Workers / positions | Y | Y | — | — | — | — |
| Events / calendar | Y | Y | — | S | S | R |
| Announcements publish | Y | Y | — | S | — | — |
| Announcements read | Y | Y | Y | Y | Y | Y |
| Prayer: own submissions | Y | Y | Y | Y | Y | Y |
| Prayer: private | owner | — | — | — | — | owner |
| Prayer: Presiding Elder only | Y | — | — | — | — | — |
| Prayer: authorized leaders | Y | Y | — | prayer dept | — | — |
| Prayer: prayer team | Y | — | — | prayer dept | prayer team | — |
| Welfare cases | Y | S | — | welfare dept | — | — |
| Finance transactions (write) | — | — | Y | — | — | — |
| Finance reports | Y | — | Y | — | — | — |
| Documents (by category ACL) | Y | S | S | S | S | S |
| User management | Y | — | — | — | — | — |
| Audit logs | Y | — | — | — | — | — |
| Assembly settings | Y | — | — | — | — | — |
| Reports: membership / attendance / visitors | Y | Y | — | S | — | — |
| Reports: finance | Y | — | Y | — | — | — |
| Reports: welfare | Y | S | — | welfare | — | — |

## Department isolation

A Youth Ministry leader may:

- List members assigned to Youth
- Record Youth meeting attendance
- Manage Youth events and department announcements
- Submit a department report

They must **not** be able to query Women’s Ministry attendance, notes, or reports by changing `/departments/[id]` or calling Supabase directly.

## Prayer privacy

A private prayer request is visible only to the author (and the database owner / service role used for backups). Holding the Presiding Elder or Secretary role does **not** reveal `privacy_level = private` rows.

## Finance isolation

The Secretary does not automatically receive finance table `SELECT`. The Treasurer does not receive prayer or welfare `SELECT`. The Presiding Elder may read financial transactions for oversight reports but does not perform cashier data entry by default.

## Member portal denials

Members cannot read:

- Other members’ private data
- Financial transactions
- Welfare cases (unless they are the subject and the assembly later opts into that — default is deny)
- Audit logs
- User management
- Assembly settings
