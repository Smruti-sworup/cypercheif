import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SoundSynth from '../../utils/soundSynth';

export default function Shop({ setGlobalTheme }) {
  const { user, token, loadMe, setUser } = useAuth();
  
  const [shopItems, setShopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('theme'); // 'theme', 'avatar', 'skin'
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/game/shop', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShopItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    SoundSynth.playClick();

    if (user.coins < item.cost) {
      setErrorMsg('Insufficient coins balance!');
      SoundSynth.playLose();
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/game/shop/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: item.id })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(data.message);
        SoundSynth.playWin();

        // Update local user context
        setUser(prev => ({
          ...prev,
          coins: data.newCoinsBalance,
          inventory: data.inventory
        }));
      } else {
        setErrorMsg(data.error);
        SoundSynth.playLose();
      }
    } catch (e) {
      setErrorMsg('Network error processing purchase.');
      SoundSynth.playLose();
    }
  };

  const handleEquipTheme = (themeId) => {
    SoundSynth.playClick();
    setGlobalTheme(themeId);
    setSuccessMsg(`Theme equipped successfully!`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const filteredItems = shopItems.filter(i => i.type === activeTab);

  return (
    <div style={styles.container}>
      <div className="card-panel" style={styles.header}>
        <div style={styles.headerTitle}>
          <h1 className="text-gradient">Customization Shop</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Dazzle opponents! Spend your virtual coins on premium board skins, themes, and avatars.
          </p>
        </div>
        <div style={styles.coinBadge}>
          💰 {user?.coins} Coins
        </div>
      </div>

      {/* Messages */}
      {errorMsg && <div style={{ ...styles.alert, color: 'var(--accent-danger)' }}>⚠️ {errorMsg}</div>}
      {successMsg && <div style={{ ...styles.alert, color: 'var(--accent-success)' }}>🎉 {successMsg}</div>}

      {/* Item Type tabs */}
      <div style={styles.tabsRow}>
        {['theme', 'avatar', 'skin'].map(t => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); SoundSynth.playClick(); }}
            style={{
              ...styles.tabBtn,
              background: activeTab === t ? 'var(--primary-glow)' : 'transparent',
              borderColor: activeTab === t ? 'var(--primary)' : 'transparent',
              color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            {t === 'theme' ? '🎨 Custom Themes' : t === 'avatar' ? '👤 Player Avatars' : '🔲 Game Board Skins'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading catalog...</div>
      ) : (
        <div style={styles.catalogGrid}>
          {filteredItems.map(item => {
            const isOwned = user.inventory.includes(item.id);
            return (
              <div key={item.id} className="card-panel hover-card" style={styles.itemCard}>
                <div style={styles.itemIcon}>
                  {item.type === 'theme' ? '🎨' : item.type === 'avatar' ? '👦' : '🔲'}
                </div>
                <h4>{item.name}</h4>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', minHeight: 32 }}>
                  {item.desc}
                </p>

                {isOwned ? (
                  item.type === 'theme' ? (
                    <button onClick={() => handleEquipTheme(item.id)} className="btn-primary" style={{ width: '100%' }}>
                      Equip Theme
                    </button>
                  ) : (
                    <span style={styles.ownedBadge}>✓ OWNED</span>
                  )
                ) : (
                  <button onClick={() => handlePurchase(item)} className="btn-secondary" style={styles.buyBtn}>
                    Buy for 💰 {item.cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(22, 30, 49, 0.8) 0%, rgba(0, 240, 255, 0.1) 100%)'
  },
  headerTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  coinBadge: {
    background: 'var(--bg-secondary)',
    border: '2px solid var(--accent-warning)',
    color: 'var(--accent-warning)',
    padding: '12px 20px',
    borderRadius: 12,
    fontWeight: '800',
    fontSize: 16
  },
  alert: {
    fontSize: 14,
    fontWeight: '600',
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    border: '1px solid'
  },
  tabsRow: {
    display: 'flex',
    gap: 12,
    borderBottom: '1px solid var(--card-border)',
    paddingBottom: 12
  },
  tabBtn: {
    padding: '10px 18px',
    border: '1px solid transparent',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  catalogGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 20
  },
  itemCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: 20
  },
  itemIcon: {
    fontSize: 48,
    margin: '10px 0'
  },
  buyBtn: {
    width: '100%',
    fontWeight: 'bold'
  },
  ownedBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'var(--accent-success)',
    background: 'rgba(16, 185, 129, 0.15)',
    padding: '6px 16px',
    borderRadius: 6,
    width: '100%',
    textAlign: 'center',
    border: '1px solid var(--accent-success)'
  }
};
