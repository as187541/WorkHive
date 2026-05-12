import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ServicePackageCard from '../components/ServicePackageCard';
import OrderServiceModal from '../components/OrderServiceModal';
import { SKILL_OPTIONS } from '../constants/skills';

const ServicePackagesMarketplace = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    skills: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    search: '',
    sort: 'rating'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const [selectedService, setSelectedService] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const fetchServices = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.minRating) params.append('minRating', filters.minRating);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort) params.append('sort', filters.sort);
      params.append('page', page);
      params.append('limit', 12);

      const res = await api.get(`/services?${params.toString()}`);
      setServices(res.data.data || []);
      setPagination({
        page: res.data.page,
        pages: res.data.pages,
        total: res.data.total
      });
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchServices(newPage);
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleOrderClick = (service) => {
    setSelectedService(service);
    setIsOrderModalOpen(true);
  };

  const handleOrderSuccess = () => {
    fetchServices(pagination.page);
  };

  const categories = [
    'Design', 'Development', 'Writing', 'Marketing',
    'Video & Animation', 'Music & Audio', 'Business', 'Data'
  ];

  return (
    <div className="services-marketplace-page page-enter">
      <header className="marketplace-header">
        <div>
          <h1>Services Marketplace</h1>
          <p>Browse predefined service packages from talented freelancers</p>
        </div>
      </header>

      <div className="marketplace-toolbar">
        <div className="search-bar-wrapper" style={{ maxWidth: '500px', flex: 1 }}>
          <input
            type="text"
            placeholder="Search for services..."
            value={filters.search}
            onChange={e => handleFilterChange({ search: e.target.value })}
            className="search-bar"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        <button
          className={`category-tab ${!filters.category ? 'active' : ''}`}
          onClick={() => handleFilterChange({ category: '' })}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-tab ${filters.category === cat ? 'active' : ''}`}
            onClick={() => handleFilterChange({ category: cat })}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="marketplace-toolbar-secondary">
        <span className="results-count">{pagination.total || services.length} services available</span>
        <div className="filter-dropdowns">
          <select
            value={filters.sort}
            onChange={e => handleFilterChange({ sort: e.target.value })}
            className="filter-select"
          >
            <option value="rating">Price: Low to High</option>
            <option value="newest">Delivery Time</option>
            <option value="popular">Top Rated</option>
          </select>
        </div>
      </div>

      <div className="marketplace-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading services...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : services.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No services found</h3>
            <p>Try adjusting your filters or search terms.</p>
          </div>
        ) : (
            <>
              <div className="results-info">
                <span>{pagination.total} services found</span>
              </div>
              <div className="services-grid">
                {services.map(service => (
                  <ServicePackageCard
                    key={service._id}
                    service={service}
                    onOrderClick={handleOrderClick}
                  />
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    ← Prev
                  </button>
                  <span>Page {pagination.page} of {pagination.pages}</span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      {isOrderModalOpen && selectedService && (
        <OrderServiceModal
          service={selectedService}
          onClose={() => {
            setIsOrderModalOpen(false);
            setSelectedService(null);
          }}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
};

export default ServicePackagesMarketplace;
