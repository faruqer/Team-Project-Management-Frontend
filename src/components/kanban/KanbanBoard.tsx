'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, tasksApi } from '@/lib/api';
import { KANBAN_COLUMNS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/lib/roles';
import ui from '@/components/ui/ui.module.css';
import styles from './kanban.module.css';

interface KanbanBoardProps {
  tasks: Task[];
  token: string;
  onTasksChange: (tasks: Task[]) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: string) => void;
}

function TaskCard({
  task,
  onClick,
  isDragging,
}: {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div className={styles.cardTitle}>{task.title}</div>
      <div className={styles.cardMeta}>
        <span className={`${styles.priority} ${styles[`priority${task.priority}`]}`}>
          {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
        </span>
        {task.assignee && (
          <div className={ui.avatar} style={{ width: 24, height: 24, fontSize: '0.6rem' }}>
            {task.assignee.avatarUrl ? (
              <img src={task.assignee.avatarUrl} alt="" />
            ) : (
              `${task.assignee.firstName[0]}${task.assignee.lastName[0]}`
            )}
          </div>
        )}
      </div>
      {task.dueDate && (
        <div className={`${styles.dueDate} ${overdue ? styles.dueDateOverdue : ''}`}>
          Due {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onAddTask,
}: {
  status: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { status } });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? styles.columnOver : ''}`}
    >
      <div className={styles.columnHeader}>
        <span className={styles.columnTitle}>{TASK_STATUS_LABELS[status] ?? status}</span>
        <span className={styles.columnCount}>{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.columnBody}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>
      <button
        className={`${ui.button} ${ui.ghost} ${ui.sm} ${styles.addTaskBtn}`}
        onClick={() => onAddTask(status)}
      >
        + Add task
      </button>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  token,
  onTasksChange,
  onTaskClick,
  onAddTask,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of KANBAN_COLUMNS) map[col] = [];
    for (const task of tasks) {
      if (map[task.status]) map[task.status].push(task);
    }
    for (const col of KANBAN_COLUMNS) {
      map[col].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [tasks]);

  const findContainer = useCallback(
    (id: string): string | null => {
      if (id.startsWith('column-')) return id.replace('column-', '');
      const task = tasks.find((t) => t.id === id);
      return task?.status ?? null;
    },
    [tasks],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    let overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    onTasksChange(
      tasks.map((t) =>
        t.id === activeId ? { ...t, status: overContainer! } : t,
      ),
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    let overContainer = findContainer(over.id as string);
    if (!overContainer) return;

    const containerTasks = tasks
      .filter((t) => t.status === overContainer && t.id !== activeId)
      .sort((a, b) => a.position - b.position);

    let newPosition = containerTasks.length;

    if (!(over.id as string).startsWith('column-')) {
      const overIndex = containerTasks.findIndex((t) => t.id === over.id);
      newPosition = overIndex >= 0 ? overIndex : containerTasks.length;
    }

    const prevTasks = [...tasks];

    onTasksChange(
      tasks.map((t) =>
        t.id === activeId
          ? { ...t, status: overContainer!, position: newPosition }
          : t,
      ),
    );

    try {
      const { task: updated } = await tasksApi.move(token, activeId, {
        status: overContainer,
        position: newPosition,
      });
      onTasksChange(
        tasks.map((t) => (t.id === activeId ? updated : t)),
      );
    } catch {
      onTasksChange(prevTasks);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status] ?? []}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className={`${styles.card} ${styles.cardOverlay}`}>
            <div className={styles.cardTitle}>{activeTask.title}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
