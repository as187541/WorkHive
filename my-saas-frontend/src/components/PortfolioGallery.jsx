import React from 'react';

const PortfolioGallery = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="portfolio-gallery">
      {items.map((item, idx) => (
        <div key={idx} className="portfolio-item">
          {item.image && (
            <div className="portfolio-image">
              <img src={item.image} alt={item.title} loading="lazy" />
            </div>
          )}
          <div className="portfolio-content">
            <h4>{item.title}</h4>
            {item.description && <p>{item.description}</p>}
            {item.url && (
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="portfolio-link"
                aria-label={`View ${item.title} project`}
              >
                View Project →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PortfolioGallery;
