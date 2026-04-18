import { FormEvent, useMemo, useState } from "react";
import type { Finding, InvestigationTask, TaskStatus, WorkflowPriority } from "../types";
import { groupTasksByStatus } from "../workspace/view-model";

interface TaskBoardProps {
  tasks: InvestigationTask[];
  findings: Finding[];
  busy?: boolean;
  onCreateTask: (input: {
    title: string;
    description?: string;
    owner?: string;
    priority?: WorkflowPriority;
    linkedFindingIds?: string[];
    required?: boolean;
  }) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
}

const priorityOptions: WorkflowPriority[] = ["low", "medium", "high", "critical"];
const statusOptions: TaskStatus[] = ["open", "in_progress", "blocked", "done", "cancelled"];

export function TaskBoard({ tasks, findings, busy = false, onCreateTask, onUpdateTaskStatus }: TaskBoardProps): JSX.Element {
  const lanes = useMemo(() => groupTasksByStatus(tasks), [tasks]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState<WorkflowPriority>("medium");
  const [findingId, setFindingId] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onCreateTask({
      title,
      description: description || undefined,
      owner: owner || undefined,
      priority,
      linkedFindingIds: findingId ? [findingId] : undefined,
      required: true
    });
    setTitle("");
    setDescription("");
    setOwner("");
    setFindingId("");
  }

  return (
    <div className="task-workspace">
      <form className="task-create-form" onSubmit={submit}>
        <h3>Add Task</h3>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Confirm source host ownership" />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
        </label>
        <div className="form-grid">
          <label>
            Owner
            <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="analyst" />
          </label>
          <label>
            Priority
            <select value={priority} onChange={(event) => setPriority(event.target.value as WorkflowPriority)}>
              {priorityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Linked finding
          <select value={findingId} onChange={(event) => setFindingId(event.target.value)}>
            <option value="">None</option>
            {findings.map((finding) => (
              <option key={finding.id} value={finding.id}>
                {finding.title}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button" type="submit" disabled={busy || !title.trim()}>
          Add Task
        </button>
      </form>

      <div className="task-lanes" aria-label="Task board">
        {lanes.map((lane) => (
          <section className="task-lane" key={lane.status}>
            <div className="lane-header">
              <h3>{lane.label}</h3>
              <span>{lane.tasks.length}</span>
            </div>
            {lane.tasks.length === 0 ? (
              <p className="muted">No tasks.</p>
            ) : (
              lane.tasks.map((task) => (
                <article key={task.id}>
                  <strong>{task.title}</strong>
                  {task.description && <p>{task.description}</p>}
                  <small>
                    {task.priority} priority
                    {task.owner ? ` · ${task.owner}` : ""}
                    {task.dueAt ? ` · due ${new Date(task.dueAt).toLocaleDateString()}` : ""}
                  </small>
                  <label>
                    Status
                    <select
                      value={task.status}
                      disabled={busy}
                      onChange={(event) => {
                        void onUpdateTaskStatus(task.id, event.target.value as TaskStatus);
                      }}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
