import React, { useState } from 'react';
import { SKILL_OPTIONS } from '../constants/skills';

const AVAILABILITY_OPTIONS = ['Open to work', 'Busy', 'Not available'];

const LAST_ACTIVE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' }
];

const TalentFilters = ({ filters, onChange }) => {
  const [skillSearch, setSkillSearch] = useState('');

  const handleSkillToggle = (skill) => {
    const currentSkills = filters.skills ? filters.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    onChange({ skills: newSkills.join(',') });
  };

  const selectedSkills = filters.skills ? filters.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

  const filteredOptions = skillSearch
    ? SKILL_OPTIONS.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase()))
    : SKILL_OPTIONS;

  return (
    <div className="talent-filters">
      <div className="filter-group">
        <label>Search</label>
        <input
          type="text"
          placeholder="Search by name or bio..."
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="filter-input"
        />
      </div>

      <div className="filter-group">
        <label>Minimum Rating</label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={filters.minRating || 0}
          onChange={(e) => onChange({ minRating: e.target.value })}
          className="filter-range"
        />
        <span className="range-value">{filters.minRating || 0}+ stars</span>
      </div>

      <div className="filter-group">
        <label>Availability</label>
        <select
          value={filters.availability}
          onChange={(e) => onChange({ availability: e.target.value })}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          {AVAILABILITY_OPTIONS.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Last Active</label>
        <select
          value={filters.lastActive || ''}
          onChange={(e) => onChange({ lastActive: e.target.value })}
          className="filter-select"
        >
          {LAST_ACTIVE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Skills {selectedSkills.length > 0 && `(${selectedSkills.length} selected)`}</label>
        <input
          type="text"
          placeholder="Search skills..."
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          className="filter-input skill-search-input"
        />
        <div className="skills-filter-grid">
          {filteredOptions.map(skill => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                className={`skill-filter-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSkillToggle(skill)}
              >
                {skill}
              </button>
            );
          })}
        </div>
        {selectedSkills.length > 0 && (
          <div className="selected-skills-tags">
            {selectedSkills.map(skill => (
              <span key={skill} className="selected-skill-tag">
                {skill}
                <button
                  className="remove-skill-btn"
                  onClick={() => handleSkillToggle(skill)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="filter-group">
        <label>Sort By</label>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          className="filter-select"
        >
          <option value="relevance">Most Relevant</option>
          <option value="rating">Highest Rated</option>
          <option value="projects">Most Projects</option>
          <option value="newest">Newest</option>
          <option value="hourlyRate">Hourly Rate (Low)</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      <button
        className="btn-clear-filters"
        onClick={() => onChange({ skills: '', minRating: '', availability: '', search: '', sort: 'rating', lastActive: '' })}
      >
        Clear Filters
      </button>
    </div>
  );
};

export default TalentFilters;
