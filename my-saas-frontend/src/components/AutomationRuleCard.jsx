import React from 'react';
import { FiEdit3, FiTrash2, FiZap } from 'react-icons/fi';

const AutomationRuleCard = ({ rule, onToggle, onEdit, onDelete, triggerLabels, actionLabels }) => {
  return (
    <div className={`automation-rule-card ${rule.enabled ? '' : 'disabled'}`}>
      <div className="automation-rule-card-header">
        <div className="automation-rule-card-info">
          <h3>{rule.name}</h3>
          {rule.description && <p className="automation-rule-desc">{rule.description}</p>}
        </div>
        <div className="automation-rule-card-actions">
          <label className="automation-toggle">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={onToggle}
            />
            <span className="automation-toggle-slider"></span>
          </label>
          <button className="automation-icon-btn" onClick={onEdit} title="Edit rule">
            <FiEdit3 />
          </button>
          <button className="automation-icon-btn danger" onClick={onDelete} title="Delete rule">
            <FiTrash2 />
          </button>
        </div>
      </div>

      <div className="automation-rule-card-body">
        <div className="automation-rule-section">
          <span className="automation-rule-label">Trigger:</span>
          <span className="automation-trigger-badge">{triggerLabels[rule.trigger] || rule.trigger}</span>
        </div>

        {rule.conditions && rule.conditions.length > 0 && (
          <div className="automation-rule-section">
            <span className="automation-rule-label">Conditions:</span>
            <div className="automation-conditions-list">
              {rule.conditions.map((cond, idx) => (
                <span key={idx} className="automation-condition-chip">
                  {cond.field} {cond.operator} {String(cond.value)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="automation-rule-section">
          <span className="automation-rule-label">Actions:</span>
          <div className="automation-actions-list">
            {rule.actions.map((action, idx) => (
              <span key={idx} className="automation-action-chip">
                <FiZap size={12} />
                {actionLabels[action.type] || action.type}
                {action.type === 'award_tokens' && action.config?.amount && ` (${action.config.amount} HT)`}
                {action.type === 'send_notification' && action.config?.title && `: ${action.config.title}`}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="automation-rule-card-footer">
        <span className="automation-rule-meta">
          Created {new Date(rule.createdAt).toLocaleDateString()}
          {rule.createdBy?.name && ` by ${rule.createdBy.name}`}
        </span>
      </div>
    </div>
  );
};

export default AutomationRuleCard;