import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiStar, FiPlusSquare, FiUsers, FiArrowRight, FiCheck
} from 'react-icons/fi';

const ONBOARDING_STEPS = [
  {
    icon: FiStar,
    iconBg: '#fffbeb',
    iconColor: '#f59e0b',
    title: 'Welcome to WorkHive!',
    description: 'Your collaborative workspace for managing projects, hiring talent, and earning rewards. Let\'s get you started.',
    action: null,
  },
  {
    icon: FiPlusSquare,
    iconBg: '#eff6ff',
    iconColor: '#3b82f6',
    title: 'Create or Join a Workspace',
    description: 'Workspaces are where your projects live. Create a new workspace or join an existing one to start collaborating.',
    action: { label: 'Create Workspace', path: '/workspaces' },
  },
  {
    icon: FiUsers,
    iconBg: '#ecfdf5',
    iconColor: '#10b981',
    title: 'Discover Talent & Services',
    description: 'Browse the talent marketplace to find skilled professionals, or offer your own services to earn Hive Tokens.',
    action: { label: 'Browse Talent', path: '/talent' },
  },
  {
    icon: FiCheck,
    iconBg: '#f0fdf4',
    iconColor: '#22c55e',
    title: 'You\'re All Set!',
    description: 'You\'re ready to start using WorkHive. Complete tasks to earn tokens, hire talent, and build amazing things together.',
    action: null,
  },
];

const MobileOnboarding = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const step = ONBOARDING_STEPS[currentStep];
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('workhive_onboarded', 'true');
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('workhive_onboarded', 'true');
    onClose();
  };

  const handleAction = () => {
    if (step.action) {
      localStorage.setItem('workhive_onboarded', 'true');
      navigate(step.action.path);
      onClose();
    }
  };

  return (
    <div className="onboarding-overlay" onClick={(e) => e.target === e.currentTarget && handleSkip()}>
      <div className="onboarding-card">
        {/* Progress dots */}
        <div className="onboarding-progress">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${i === currentStep ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="onboarding-content">
          <div className="onboarding-icon" style={{ backgroundColor: step.iconBg, color: step.iconColor }}>
            <step.icon size={28} />
          </div>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
        </div>

        {/* Actions */}
        <div className="onboarding-actions">
          <button className="btn btn-primary" onClick={handleNext} style={{ flex: 1 }}>
            {isLast ? 'Get Started' : <>Next <FiArrowRight size={16} /></>}
          </button>
          {step.action && (
            <button className="btn btn-secondary" onClick={handleAction} style={{ flex: 1 }}>
              {step.action.label}
            </button>
          )}
        </div>

        {!isLast && (
          <button className="onboarding-skip" onClick={handleSkip}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileOnboarding;
export { ONBOARDING_STEPS };