import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/auth/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { useChangeTaskStatusMutation } from '@/services/tasks/tasks.queries';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/services/tasks/tasks.types';
import { isNormalizedApiError } from '@/services/http/errors';
import { TaskCard } from './TaskCard';
import { TaskStatusPicker } from './TaskStatusPicker';
import { canTransition, isOwnTask, isTerminal, sortTasks } from '../taskRules';

const COLUMN_LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  OVERDUE: 'Overdue',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

interface KanbanBoardProps {
  tasks: Task[];
  /** Disable drag (mobile) — status changes go through the inline picker. */
  dragEnabled: boolean;
}

export function KanbanBoard({ tasks, dragEnabled }: KanbanBoardProps) {
  const { role } = usePermissions();
  const userSub = useAuthStore((s) => s.user?.sub);
  const mutation = useChangeTaskStatusMutation();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      PENDING: [],
      IN_PROGRESS: [],
      OVERDUE: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    tasks.forEach((t) => grouped[t.status].push(t));
    TASK_STATUSES.forEach((s) => grouped[s].sort(sortTasks));
    return grouped;
  }, [tasks]);

  const onDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === String(event.active.id)) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const taskId = String(event.active.id);
    const target = event.over?.id as TaskStatus | undefined;
    if (!target) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === target) return;

    if (!canTransition(task, target, role, userSub)) {
      toast.error(transitionDeniedReason(task, target, role === 'ANALYST'));
      return;
    }
    mutation.mutate(
      { id: taskId, status: target },
      {
        onSuccess: () => toast.success(`Moved to ${COLUMN_LABEL[target]}`),
        onError: (err) => {
          if (isNormalizedApiError(err) && err.status !== 403) toast.error(err.message);
        },
      },
    );
  };

  const board = (
    <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2 md:h-[calc(100vh-14rem)] md:min-h-[28rem]">
      {TASK_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          label={COLUMN_LABEL[status]}
          tasks={columns[status]}
          dragEnabled={dragEnabled}
          renderCard={(task) => {
            const draggable = dragEnabled && canDrag(task, role, userSub);
            return draggable ? (
              <DraggableCard key={task.id} task={task} />
            ) : (
              <TaskCard
                key={task.id}
                task={task}
                lockedReason={lockReason(task, role === 'ANALYST', userSub)}
              />
            );
          }}
        />
      ))}
    </div>
  );

  if (!dragEnabled) {
    // Mobile / no-drag: render columns with inline status pickers on each card.
    return board;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      {board}
      {/* Floating copy of the dragged card, portaled above all columns so it is
          never clipped by a column's overflow-y-auto. */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-72 rotate-1 cursor-grabbing">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function canDrag(task: Task, role: ReturnType<typeof usePermissions>['role'], sub: string | undefined) {
  if (isTerminal(task.status)) return false;
  if (role === 'ANALYST') return isOwnTask(task, sub);
  return role === 'ADMIN' || role === 'DETECTIVE';
}

function lockReason(task: Task, isAnalyst: boolean, sub: string | undefined): string | undefined {
  if (isTerminal(task.status)) return `${task.status} tasks can’t be moved`;
  if (isAnalyst && !isOwnTask(task, sub)) return 'Only the assignee can move this task';
  return undefined;
}

function transitionDeniedReason(task: Task, target: TaskStatus, isAnalyst: boolean): string {
  if (isTerminal(task.status)) return `A ${task.status.toLowerCase()} task can’t be moved.`;
  if (target === 'CANCELLED' && isAnalyst) return 'Analysts can’t cancel tasks.';
  if (target === 'OVERDUE') return 'Overdue is set automatically by the system.';
  return 'That move isn’t allowed.';
}

function DraggableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  // The card stays in place (no transform) and dims; the DragOverlay renders the
  // floating copy that follows the cursor above every column.
  return (
    <div ref={setNodeRef} className={cn(isDragging && 'opacity-40')}>
      <TaskCard task={task} draggable dragHandle={{ ...attributes, ...listeners }} />
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  dragEnabled: boolean;
  renderCard: (task: Task) => React.ReactNode;
}

function KanbanColumn({ status, label, tasks, dragEnabled, renderCard }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={dragEnabled ? setNodeRef : undefined}
      className={cn(
        // flex-1 lets the 5 columns share the row width on wide screens (no
        // horizontal scroll); min-w keeps them usable and triggers the themed
        // horizontal scroll only when they genuinely don't fit.
        'flex min-w-[15rem] flex-1 flex-col rounded-lg border border-border bg-muted/30 md:h-full',
        isOver && 'ring-2 ring-primary',
      )}
      aria-label={`${label} column`}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </header>
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">No tasks</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="space-y-1">
              {renderCard(task)}
              {!dragEnabled && (
                <div className="px-1">
                  <TaskStatusPicker task={task} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
