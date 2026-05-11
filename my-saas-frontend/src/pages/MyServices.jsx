import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ServicePackageCard from '../components/ServicePackageCard';
import CreateServicePackageModal from '../components/CreateServicePackageModal';

const MyServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/services/my/services');
      setServices(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load your services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleCreateSuccess = (newService) => {
    setServices(prev => [newService, ...prev]);
  };

  const handleToggleStatus = async (serviceId, currentStatus) => {
    try {
      setActionLoading(serviceId);
      const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
      await api.patch(`/services/${serviceId}`, { status: newStatus });
      setServices(prev =>
        prev.map(s => s._id === serviceId ? { ...s, status: newStatus } : s)
      );
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service package?')) return;
    try {
      setActionLoading(serviceId);
      await api.delete(`/services/${serviceId}`);
      setServices(prev => prev.filter(s => s._id !== serviceId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete service');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="my-services-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-services-page page-enter">
      <header className="page-header">
        <div>
          <h1>My Services</h1>
          <p>Manage your service packages and track orders.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + New Service Package
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No service packages yet</h3>
          <p>Create your first service package to start selling your skills!</p>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Service Package
          </button>
        </div>
      ) : (
        <div className="services-grid">
          {services.map(service => (
            <div key={service._id} className="service-card-wrapper">
              <ServicePackageCard
                service={service}
                showOrderButton={false}
              />
              <div className="service-card-actions">
                <button
                  className={`btn btn-sm ${service.status === 'Active' ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => handleToggleStatus(service._id, service.status)}
                  disabled={actionLoading === service._id}
                >
                  {actionLoading === service._id
                    ? 'Updating...'
                    : service.status === 'Active'
                    ? 'Pause'
                    : 'Activate'}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(service._id)}
                  disabled={actionLoading === service._id}
                >
                  Delete
                </button>
              </div>
              <div className="service-card-stats">
                <span>📊 {service.totalOrders} orders</span>
                <span>⭐ {service.ratingAverage || 0} rating</span>
                <span className={`status-badge status-${service.status.toLowerCase()}`}>
                  {service.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateServicePackageModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default MyServices;
