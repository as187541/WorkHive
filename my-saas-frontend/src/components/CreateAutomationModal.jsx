import React, { useState } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';

const TRIGGER_OPTIONS = [
  { value: 'task_completed', label: 'Task Completed' },
  { value: 'task_overdue', label: 'Task Overdue' },
  { value: 'proposal_submitted', label: 'Proposal Submitted' },
  { value: 'proposal_accepted', label: 'Proposal Accepted' },
  { value: 'hire_accepted', label: 'Hire Accepted' },
  { value: 'redemption_requested', label: 'Redemption Requested' },
  { value: 'order_delivered', label: 'Order Delivered' }
];

const ACTION_TYPES = [
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'award_tokens', label: 'Award Tokens' },
  { value: 'assign_task', label: 'Assign Task' },
  { value: 'change_status', label: 'Change Status' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'create_reminder', label: 'Create Reminder' }
];

const CONDITION_FIELDS = {
  task_completed: ['priority', 'completedEarly', 'assignedTo'],
  task_overdue: ['priority', 'dueDate', 'assignedTo'],
  proposal_submitted: ['proposedPrice', 'jobId'],
  proposal_accepted: ['freelancerId', 'proposedPrice'],
  hire_accepted: ['role', 'projectId'],
  redemption_requested: ['cost', 'rewardTitle'],
  order_delivered: ['sellerId', 'price']
};

const CONDITION_OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'contains', label: 'contains' }
];

const CreateAutomationModal = ({ workspaceId, rule, onClose, onSave, triggerLabels, actionLabels }) => {
  const isEditing = rule && rule._id;
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [trigger, setTrigger] = useState(rule?.trigger || 'task_completed');
  const [conditions, setConditions] = useState(rule?.conditions || []);
  const [actions, setActions] = useState(rule?.actions || [{ type: 'send_notification', config: { title: '', message: '' } }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const availableFields = CONDITION_FIELDS[trigger] || [];

  const addCondition = () => {
    setConditions([...conditions, { field: availableFields[0] || '', operator: 'eq', value: '' }]);
  };

  const removeCondition = (idx) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx, key, value) => {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], [key]: value };
    setConditions(updated);
  };

  const addAction = () => {
    setActions([...actions, { type: 'send_notification', config: {} }]);
  };

  const removeAction = (idx) => {
    setActions(actions.filter((_, i) => i !== idx));
  };

  const updateActionType = (idx, newType) => {
    const updated = [...actions];
    updated[idx] = { type: newType, config: {} };
    // Set default config based on type
    if (newType === 'award_tokens') updated[idx].config = { amount: 10, reason: '' };
    else if (newType === 'send_notification') updated[idx].config = { title: '', message: '', targetRole: 'Admin' };
    else if (newType === 'send_email') updated[idx].config = { subject: '', body: '' };
    else if (newType === 'change_status') updated[idx].config = { entity: 'task', newStatus: '' };
    else if (newType === 'assign_task') updated[idx].config = { assignToRole: 'Admin' };
    else if (newType === 'create_reminder') updated[idx].config = { message: '' };
    setActions(updated);
  };

  const updateActionConfig = (idx, key, value) => {
    const updated = [...actions];
    updated[idx] = { ...updated[idx], config: { ...updated[idx].config, [key]: value } };
    setActions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Rule name is required.'); return; }
    if (!workspaceId) { setError('Please select a workspace first.'); return; }
    if (actions.length === 0) { setError('At least one action is required.'); return; }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        workspace: workspaceId,
        trigger,
        conditions: conditions.filter(c => c.field && c.value),
        actions: actions.filter(a => a.type)
      };

      if (isEditing) {
        await api.patch(`/automations/${rule._id}`, payload);
      } else {
        await api.post('/automations', payload);
      }

      onSave();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to save automation rule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content automation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Automation Rule' : 'Create Automation Rule'}</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit} className="automation-form">
          {error && <div className="automation-error">{error}</div>}

          <div className="form-group">
            <label>Rule Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Early Completion Reward" required />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this rule do?" rows={2} />
          </div>

          <div className="form-group">
            <label>Trigger Event *</label>
            <select value={trigger} onChange={(e) => { setTrigger(e.target.value); setConditions([]); }}>
              {TRIGGER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Conditions */}
          <div className="form-group">
            <label>Conditions (optional — all must match)</label>
            {conditions.map((cond, idx) => (
              <div key={idx} className="automation-condition-row">
                <select value={cond.field} onChange={(e) => updateCondition(idx, 'field', e.target.value)}>
                  {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={cond.operator} onChange={(e) => updateCondition(idx, 'operator', e.target.value)}>
                  {CONDITION_OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                <input type="text" value={cond.value} onChange={(e) => updateCondition(idx, 'value', e.target.value)} placeholder="Value" />
                <button type="button" className="automation-remove-btn" onClick={() => removeCondition(idx)}><FiTrash2 /></button>
              </div>
            ))}
            <button type="button" className="automation-add-btn" onClick={addCondition}><FiPlus /> Add Condition</button>
          </div>

          {/* Actions */}
          <div className="form-group">
            <label>Actions *</label>
            {actions.map((action, idx) => (
              <div key={idx} className="automation-action-row">
                <select value={action.type} onChange={(e) => updateActionType(idx, e.target.value)}>
                  {ACTION_TYPES.map(at => <option key={at.value} value={at.value}>{at.label}</option>)}
                </select>
                <div className="automation-action-config">
                  {action.type === 'award_tokens' && (
                    <>
                      <input type="number" value={action.config.amount || ''} onChange={(e) => updateActionConfig(idx, 'amount', Number(e.target.value))} placeholder="Amount (HT)" min="1" />
                      <input type="text" value={action.config.reason || ''} onChange={(e) => updateActionConfig(idx, 'reason', e.target.value)} placeholder="Reason" />
                    </>
                  )}
                  {action.type === 'send_notification' && (
                    <>
                      <input type="text" value={action.config.title || ''} onChange={(e) => updateActionConfig(idx, 'title', e.target.value)} placeholder="Notification title" />
                      <input type="text" value={action.config.message || ''} onChange={(e) => updateActionConfig(idx, 'message', e.target.value)} placeholder="Notification message" />
                      <select value={action.config.targetRole || ''} onChange={(e) => updateActionConfig(idx, 'targetRole', e.target.value)}>
                        <option value="Admin">Workspace Admins</option>
                        <option value="self">Triggering User</option>
                      </select>
                    </>
                  )}
                  {action.type === 'send_email' && (
                    <>
                      <input type="text" value={action.config.subject || ''} onChange={(e) => updateActionConfig(idx, 'subject', e.target.value)} placeholder="Email subject" />
                      <textarea value={action.config.body || ''} onChange={(e) => updateActionConfig(idx, 'body', e.target.value)} placeholder="Email body (HTML)" rows={2} />
                    </>
                  )}
                  {action.type === 'change_status' && (
                    <>
                      <select value={action.config.entity || 'task'} onChange={(e) => updateActionConfig(idx, 'entity', e.target.value)}>
                        <option value="task">Task</option>
                      </select>
                      <input type="text" value={action.config.newStatus || ''} onChange={(e) => updateActionConfig(idx, 'newStatus', e.target.value)} placeholder="New status" />
                    </>
                  )}
                  {action.type === 'assign_task' && (
                    <select value={action.config.assignToRole || 'Admin'} onChange={(e) => updateActionConfig(idx, 'assignToRole', e.target.value)}>
                      <option value="Admin">Assign to Workspace Admin</option>
                    </select>
                  )}
                  {action.type === 'create_reminder' && (
                    <input type="text" value={action.config.message || ''} onChange={(e) => updateActionConfig(idx, 'message', e.target.value)} placeholder="Reminder message" />
                  )}
                </div>
                {actions.length > 1 && (
                  <button type="button" className="automation-remove-btn" onClick={() => removeAction(idx)}><FiTrash2 /></button>
                )}
              </div>
            ))}
            <button type="button" className="automation-add-btn" onClick={addAction}><FiPlus /> Add Action</button>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAutomationModal;