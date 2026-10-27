import { Button } from "@/components/button";
import type { ManagedUser } from "@/lib/user-management-model";
import type { UsersWorkspaceLabels } from "./users-feedback";

export function UsersLedger({
  users,
  selectedId,
  labels,
  selectUser,
}: {
  users: ManagedUser[];
  selectedId: string | null;
  labels: UsersWorkspaceLabels;
  selectUser: (candidate: ManagedUser, invoker: HTMLButtonElement) => void;
}) {
  return (
    <div className="dashboard-users-ledger">
      <table>
        <thead>
          <tr>
            <th scope="col">{labels.name}</th>
            <th scope="col">{labels.role}</th>
            <th scope="col">{labels.status}</th>
            <th scope="col">
              <span className="sr-only">{labels.selectUser}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((candidate) => (
            <tr
              key={candidate.id}
              data-selected={selectedId === candidate.id ? "true" : undefined}
            >
              <td>
                <strong>{candidate.name}</strong>
                <span>{candidate.email}</span>
              </td>
              <td>{labels.roles[candidate.role]}</td>
              <td>
                <span
                  className="dashboard-users-status"
                  data-tone={candidate.blocked ? "blocked" : "active"}
                >
                  {candidate.blocked
                    ? labels.accountStates.blocked
                    : labels.accountStates.active}
                </span>
              </td>
              <td>
                <Button
                  type="button"
                  className="dashboard-users-select"
                  variant="informational"
                  aria-pressed={selectedId === candidate.id}
                  onClick={(event) =>
                    selectUser(candidate, event.currentTarget)
                  }
                >
                  {labels.selectUser}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    width="20"
                    height="20"
                  >
                    <path
                      d="M4 10h11M11 6l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="dashboard-users-mobile-list">
        {users.map((candidate) => (
          <li key={candidate.id}>
            <Button
              type="button"
              variant="secondary"
              aria-pressed={selectedId === candidate.id}
              onClick={(event) => selectUser(candidate, event.currentTarget)}
            >
              <span>
                <strong>{candidate.name}</strong>
                <small>{candidate.email}</small>
              </span>
              <span>
                {labels.roles[candidate.role]}
                <small>
                  {candidate.blocked
                    ? labels.accountStates.blocked
                    : labels.accountStates.active}
                </small>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
