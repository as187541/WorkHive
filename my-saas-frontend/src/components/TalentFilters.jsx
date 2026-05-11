import React from 'react';
import { SKILL_OPTIONS } from '../constants/skills';

const AVAILABILITY_OPTIONS = ['Open to work', 'Busy', 'Not available'];

const TalentFilters = ({ filters, onChange }) => {
  const handleSkillToggle = (skill) => {
    const currentSkills = filters.skills ? filters.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    onChange({ skills: newSkills.join(',') });
  };

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
        <label>Skills</label>
        <div className="skills-filter-grid">
          {SKILL_OPTIONS.map(skill => {
            const isSelected = filters.skills?.split(',').map(s => s.trim()).includes(skill);
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
      </div>

      <div className="filter-group">
        <label>Sort By</label>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          className="filter-select"
        >
          <option value="rating">Highest Rated</option>
          <option value="projects">Most Projects</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      <button
        className="btn-clear-filters"
        onClick={() => onChange({ skills: '', minRating: '', availability: '', search: '', sort: 'rating' })}
      >
        Clear Filters
      </button>
    </div>
  );
};

export default TalentFilters;
