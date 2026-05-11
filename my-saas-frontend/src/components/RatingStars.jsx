import React from 'react';

const RatingStars = ({ score, size = 'medium', interactive = false, onRate }) => {
  const stars = [1, 2, 3, 4, 5];

  const sizeClass = size === 'small' ? 'rating-sm' : size === 'large' ? 'rating-lg' : '';

  return (
    <div className={`rating-stars ${sizeClass} ${interactive ? 'interactive' : ''}`}>
      {stars.map((star) => (
        <span
          key={star}
          className={`star ${star <= score ? 'filled' : 'empty'}`}
          onClick={() => interactive && onRate?.(star)}
          role={interactive ? 'button' : undefined}
          aria-label={interactive ? `Rate ${star} stars` : undefined}
          tabIndex={interactive ? 0 : undefined}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default RatingStars;
