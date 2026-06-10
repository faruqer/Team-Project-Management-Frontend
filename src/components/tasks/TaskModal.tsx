'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Task,
  TaskComment,
  TeamMember,
  MentionUser,
  tasksApi,
  ApiRequestError,
} from '@/lib/api';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, can } from '@/lib/roles';
import ui from '@/components/ui/ui.module.css';
import styles from './taskModal.module.css';

interface TaskModalProps {
  task: Task | null;
  token: string;
  members: TeamMember[];
  userRole: string;
  userId: string;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
  initialStatus?: string;
  projectId?: string;
  isCreate?: boolean;
}

function CommentItem({
  comment,
  token,
  userId,
  userRole,
  onRefresh,
  onReplyClick,
  depth = 0,
}: {
  comment: TaskComment;
  token: string;
  userId: string;
  userRole: string;
  onRefresh: () => void;
  onReplyClick: () => void;
  depth?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);

  async function handleDelete() {
    try {
      await tasksApi.deleteComment(token, comment.id);
      onRefresh();
    } catch {
      // ignore
    }
  }

  async function handleSaveEdit() {
    try {
      await tasksApi.updateComment(token, comment.id, editBody);
      setEditing(false);
      onRefresh();
    } catch {
      // ignore
    }
  }

  const canEdit = comment.authorId === userId;
  const canDelete = canEdit || can(userRole, 'task:delete');

  return (
    <div className={styles.comment} style={{ marginLeft: depth * 20 }}>
      <div className={styles.commentHeader}>
        <div className={ui.avatar} style={{ width: 28, height: 28, fontSize: '0.65rem' }}>
          {comment.author.avatarUrl ? (
            <img src={comment.author.avatarUrl} alt="" />
          ) : (
            `${comment.author.firstName[0]}${comment.author.lastName[0]}`
          )}
        </div>
        <span className={styles.commentAuthor}>
          {comment.author.firstName} {comment.author.lastName}
        </span>
        <span className={styles.commentTime}>
          {new Date(comment.createdAt).toLocaleString()}
        </span>
      </div>
      {editing ? (
        <div className={styles.editRow}>
          <textarea
            className={ui.textarea}
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
          />
          <button className={`${ui.button} ${ui.primary} ${ui.sm}`} onClick={handleSaveEdit}>
            Save
          </button>
          <button className={`${ui.button} ${ui.ghost} ${ui.sm}`} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <p className={styles.commentBody}>{comment.body}</p>
      )}
      {comment.attachments.length > 0 && (
        <div className={styles.attachments}>
          {comment.attachments.map((a) => (
            <a key={a.id} href={a.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.attachment}>
              📎 {a.fileName}
            </a>
          ))}
        </div>
      )}
      <div className={styles.commentActions}>
        {depth < 2 && (
          <button className={`${ui.button} ${ui.ghost} ${ui.sm}`} onClick={onReplyClick}>
            Reply
          </button>
        )}
        {canEdit && !editing && (
          <button className={`${ui.button} ${ui.ghost} ${ui.sm}`} onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        {canDelete && (
          <button className={`${ui.button} ${ui.danger} ${ui.sm}`} onClick={handleDelete}>
            Delete
          </button>
        )}
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          token={token}
          userId={userId}
          userRole={userRole}
          onRefresh={onRefresh}
          onReplyClick={onReplyClick}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function MentionTextarea({
  value,
  onChange,
  onSearch,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: (q: string) => Promise<MentionUser[]>;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = async (text: string) => {
    onChange(text);
    const cursorPos = textareaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, cursorPos);
    const match = before.match(/@(\w*)$/);

    if (match) {
      setMentionQuery(match[1]);
      const users = await onSearch(match[1]);
      setSuggestions(users);
      setShowSuggestions(users.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (user: MentionUser) => {
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const replaced = before.replace(/@\w*$/, `@${user.firstName} ${user.lastName} `);
    onChange(replaced + after);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  return (
    <div className={styles.mentionWrap}>
      <textarea
        ref={textareaRef}
        className={ui.textarea}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
      />
      {showSuggestions && (
        <ul className={styles.mentionList}>
          {suggestions.map((u) => (
            <li key={u.id}>
              <button type="button" className={styles.mentionItem} onClick={() => insertMention(u)}>
                <span className={ui.avatar} style={{ width: 24, height: 24, fontSize: '0.6rem' }}>
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" />
                  ) : (
                    `${u.firstName[0]}${u.lastName[0]}`
                  )}
                </span>
                {u.firstName} {u.lastName}
                <span className={styles.mentionEmail}>{u.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TaskModal({
  task,
  token,
  members,
  userRole,
  userId,
  onClose,
  onUpdate,
  onDelete,
  initialStatus,
  projectId,
  isCreate,
}: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState(task?.status ?? initialStatus ?? 'TODO');
  const [priority, setPriority] = useState(task?.priority ?? 'MEDIUM');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? task.dueDate.slice(0, 10) : '',
  );
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const activeMembers = members.filter((m) => m.isActive);
  const canEdit = isCreate || can(userRole, 'task:update');
  const canDelete = !isCreate && can(userRole, 'task:delete');

  const loadComments = useCallback(async () => {
    if (!task) return;
    const res = await tasksApi.listComments(token, task.id);
    setComments(res.comments);
  }, [task, token]);

  useEffect(() => {
    if (task && !isCreate) loadComments();
  }, [task, isCreate, loadComments]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (isCreate && projectId) {
        const { task: created } = await tasksApi.create(token, projectId, {
          title,
          description: description || undefined,
          status,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        });
        onUpdate(created);
        onClose();
      } else if (task) {
        const { task: updated } = await tasksApi.update(token, task.id, {
          title,
          description: description || null,
          status,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        });
        onUpdate(updated);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.data.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      await tasksApi.delete(token, task.id);
      onDelete(task.id);
      onClose();
    } catch {
      setError('Failed to delete task');
    }
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    if (!task || !commentBody.trim()) return;

    try {
      await tasksApi.createComment(
        token,
        task.id,
        { body: commentBody, parentId: replyTo },
        attachments.length > 0 ? attachments : undefined,
      );
      setCommentBody('');
      setReplyTo(null);
      setAttachments([]);
      loadComments();
    } catch {
      setError('Failed to post comment');
    }
  }

  const searchMentions = useCallback(
    (q: string) => (task ? tasksApi.searchMentions(token, task.id, q).then((r) => r.users) : Promise.resolve([])),
    [token, task],
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isCreate ? 'New Task' : 'Task Details'}</h2>
          <button className={`${ui.button} ${ui.ghost}`} onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className={`${ui.alert} ${ui.alertError}`}>{error}</div>}

        <form onSubmit={handleSave} className={styles.form}>
          <div className={ui.field}>
            <label className={ui.label}>Title</label>
            <input
              className={ui.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={!canEdit}
            />
          </div>

          <div className={ui.field}>
            <label className={ui.label}>Description</label>
            <textarea
              className={ui.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div className={styles.formRow}>
            <div className={ui.field}>
              <label className={ui.label}>Status</label>
              <select
                className={ui.select}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={!canEdit}
              >
                {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className={ui.field}>
              <label className={ui.label}>Priority</label>
              <select
                className={ui.select}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={!canEdit}
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={ui.field}>
              <label className={ui.label}>Assignee</label>
              <select
                className={ui.select}
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!canEdit}
              >
                <option value="">Unassigned</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className={ui.field}>
              <label className={ui.label}>Due date</label>
              <input
                className={ui.input}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          {canEdit && (
            <div className={styles.formActions}>
              <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={saving}>
                {saving ? 'Saving...' : isCreate ? 'Create task' : 'Save changes'}
              </button>
              {canDelete && (
                <button className={`${ui.button} ${ui.danger}`} type="button" onClick={handleDelete}>
                  Delete
                </button>
              )}
            </div>
          )}
        </form>

        {task && !isCreate && (
          <div className={styles.commentsSection}>
            <h3>Comments ({comments.length})</h3>
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                token={token}
                userId={userId}
                userRole={userRole}
                onRefresh={loadComments}
                onReplyClick={() => setReplyTo(c.id)}
              />
            ))}
            <form onSubmit={handleComment} className={styles.commentForm}>
              {replyTo && (
                <span className={styles.replyingTo}>
                  Replying to comment
                  <button type="button" onClick={() => setReplyTo(null)}>Cancel</button>
                </span>
              )}
              <MentionTextarea
                value={commentBody}
                onChange={setCommentBody}
                onSearch={searchMentions}
                placeholder="Write a comment... Use @ to mention"
              />
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
              />
              <div className={styles.commentFormActions}>
                <button
                  type="button"
                  className={`${ui.button} ${ui.secondary} ${ui.sm}`}
                  onClick={() => fileRef.current?.click()}
                >
                  Attach files
                </button>
                {attachments.length > 0 && (
                  <span className={styles.fileCount}>{attachments.length} file(s)</span>
                )}
                <button className={`${ui.button} ${ui.primary} ${ui.sm}`} type="submit">
                  Post comment
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
