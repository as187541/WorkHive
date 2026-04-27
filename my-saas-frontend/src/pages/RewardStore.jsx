// src/pages/RewardStore.jsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../services/api';
import { FiAward, FiClock, FiCheckCircle } from 'react-icons/fi';

const RewardStore = () => {
  const { user, setUser } = useOutletContext();

  const availableRewards = [
    { id: '1', title: 'Early Log-off', cost: 200, icon: '🌅', desc: 'Leave 1 hour early on Friday' },
    { id: '2', title: 'Coffee Treat', cost: 500, icon: '☕', desc: '$10 Starbucks Gift Card' },
    { id: '3', title: 'Meeting Shield', cost: 1000, icon: '🛡️', desc: 'One day with zero meetings' },
    { id: '4', title: 'Paid Day Off', cost: 5000, icon: '🏖️', desc: 'One full day paid leave' },
  ];

  const handleRedeem = async (reward) => {
    if (user.wallet.balance < reward.cost) {
      alert("Not enough tokens!");
      return;
    }

    if (window.confirm(`Redeem "${reward.title}" for ${reward.cost} HT?`)) {
      try {
        // --- HIGHLIGHT: Updated endpoint and payload to match authController ---
        const res = await api.post('/auth/redeem', { 
          rewardTitle: reward.title, 
          cost: reward.cost 
        });
        
        // Update global user state (Balance + adding to History locally for instant feedback)
        setUser(prev => ({
          ...prev,
          wallet: { 
            ...prev.wallet, 
            balance: res.data.newBalance,
            history: [
              ...prev.wallet.history, 
              { amount: -reward.cost, reason: `Redeemed: ${reward.title}`, date: new Date() }
            ]
          }
        }));
        
        alert("Success! Your request has been sent to the workspace admin.");
      } catch (err) {
        alert(err.response?.data?.msg || "Redemption failed.");
      }
    }
  };

  return (
    <div className="reward-store-container">
      <header className="store-header">
        <div className="header-text">
          <h1>Hive Reward Store</h1>
          <p>Exchange your hard-earned tokens for exclusive perks.</p>
        </div>
        <div className="user-balance-pill">
          <FiAward className="gold-icon" />
          <div className="balance-info">
            <span className="amount">{user?.wallet?.balance || 0}</span>
            <span className="label">HT Available</span>
          </div>
        </div>
      </header>

      {/* Rewards Grid */}
      <div className="reward-grid">
        {availableRewards.map(reward => (
          <div key={reward.id} className={`reward-card ${user?.wallet?.balance < reward.cost ? 'locked' : ''}`}>
            <div className="reward-icon-large">{reward.icon}</div>
            <h3>{reward.title}</h3>
            <p>{reward.desc}</p>
            <div className="reward-footer">
              <span className="price-tag">{reward.cost} HT</span>
              <button 
                className="redeem-btn"
                disabled={user?.wallet?.balance < reward.cost}
                onClick={() => handleRedeem(reward)}
              >
                {user?.wallet?.balance < reward.cost ? 'Locked' : 'Redeem'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- NEW: TRANSACTION HISTORY SECTION --- */}
      <section className="transaction-history-section">
        <div className="section-header">
          <FiClock /> <h2>Transaction History</h2>
        </div>
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Activity</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {user?.wallet?.history?.length > 0 ? (
                user.wallet.history.slice().reverse().map((item, index) => (
                  <tr key={index}>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>{item.reason}</td>
                    <td className={`text-right amount-col ${item.amount > 0 ? 'positive' : 'negative'}`}>
                      {item.amount > 0 ? `+${item.amount}` : item.amount} HT
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="empty-history">No transactions yet. Complete tasks to earn tokens!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default RewardStore;