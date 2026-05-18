import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiPlus, FiZap } from 'react-icons/fi';
import api from '../services/api';
import AutomationRuleCard from '../components/AutomationRuleCard';
import CreateAutomationModal from '../components/CreateAutomationModal';

const TRIGGER_LABELS = {
  task_completed: 'Task Completed',
  task_overdue: 'Task Overdue',
  proposal_submitted: 'Proposal Submitted',
  proposal_accepted: 'Proposal Accepted',
  hire_accepted: 'Hire Accepted',
  redemption_requested: 'Redemption Requested',
  order_delivered: 'Order Delivered'
};

const ACTION_LABELS = {
  send_notification: 'Send Notification',
  award_tokens: 'Award Tokens',
  assign_task: 'Assign Task',
  change_status: 'Change Status',
  send_email: 'Send Email',
  create_reminder: 'Create Reminder'
};

const AutomationPage = () => {
  const { workspaces } = useOutletContext();
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (workspaces?.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]._id);
    }
  }, [workspaces]);

  useEffect(() => {
    if (!selectedWorkspace) return;
    fetchRules();
  }, [selectedWorkspace]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/automations/workspace/${selectedWorkspace}`);
      setRules(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch automation rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/automations/templates');
      setTemplates(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const handleToggle = async (ruleId, currentEnabled) => {
    try {
      await api.patch(`/automations/${ruleId}/toggle`);
      setRules(rules.map(r => r._id === ruleId ? { ...r, enabled: !currentEnabled } : r));
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      await api.delete(`/automations/${ruleId}`);
      setRules(rules.filter(r => r._id !== ruleId));
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowCreateModal(true);
  };

  const handleCreateFromTemplate = (template) => {
    setEditingRule({ ...template, _id: null, workspace: selectedWorkspace });
    setShowCreateModal(true);
    setShowTemplates(false);
  };

  const handleSave = () => {
    setShowCreateModal(false);
    setEditingRule(null);
    fetchRules();
  };

  // Try to get workspaces from outlet context, fallback to API fetch
  const workspaceList = workspaces || [];

  return (
    <div className="automation-page">
      <div className="automation-header">
        <div className="automation-header-left">
          <FiZap className="automation-icon" />
          <div>
            <h1>Workflow Automations</h1>
            <p>Create rules that automatically trigger actions when events happen in your workspace.</p>
          </div>
        </div>
        <div className="automation-header-right">
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            className="automation-workspace-select"
          >
            <option value="">Select Workspace</option>
            {workspaceList.map(ws => (
              <option key={ws._id} value={ws._id}>{ws.name}</option>
            ))}
          </select>
          <button className="automation-btn-secondary" onClick={() => setShowTemplates(!showTemplates)}>
            <FiZap /> From Template
          </button>
          <button className="automation-btn-primary" onClick={() => { setEditingRule(null); setShowCreateModal(true); }}>
            <FiPlus /> Create Rule
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="automation-templates-panel">
          <h3>Pre-built Templates</h3>
          <div className="automation-templates-grid">
            {templates.map((template, idx) => (
              <div key={idx} className="automation-template-card" onClick={() => handleCreateFromTemplate(template)}>
                <h4>{template.name}</h4>
                <p>{template.description}</p>
                <div className="automation-template-meta">
                  <span className="automation-trigger-badge">{TRIGGER_LABELS[template.trigger] || template.trigger}</span>
                  <span className="automation-action-count">{template.actions.length} action{template.actions.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="automation-rules-list">
        {loading ? (
          <div className="automation-loading">Loading automation rules...</div>
        ) : !selectedWorkspace ? (
          <div className="automation-empty">Select a workspace to view automation rules.</div>
        ) : rules.length === 0 ? (
          <div className="automation-empty">
            <FiZap size={48} />
            <h3>No automation rules yet</h3>
            <p>Create your first automation rule or start from a template.</p>
          </div>
        ) : (
          rules.map(rule => (
            <AutomationRuleCard
              key={rule._id}
              rule={rule}
              onToggle={() => handleToggle(rule._id, rule.enabled)}
              onEdit={() => handleEdit(rule)}
              onDelete={() => handleDelete(rule._id)}
              triggerLabels={TRIGGER_LABELS}
              actionLabels={ACTION_LABELS}
            />
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateAutomationModal
          workspaceId={selectedWorkspace}
          rule={editingRule}
          onClose={() => { setShowCreateModal(false); setEditingRule(null); }}
          onSave={handleSave}
          triggerLabels={TRIGGER_LABELS}
          actionLabels={ACTION_LABELS}
        />
      )}
    </div>
  );
};

export default AutomationPage;