import React, { useEffect, useRef, useState } from 'react';
import { FaRedoAlt } from 'react-icons/fa';
import './PullToRefresh.css';

function PullToRefresh({ onRefresh, disabled = false, children }) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const runRefresh = async () => {
    if (refreshing || disabled) return;
    setRefreshing(true);
    setError('');
    try {
      await onRefresh();
    } catch (requestError) {
      setError(requestError.message || 'Refresh failed. Check your connection and try again.');
    } finally {
      setRefreshing(false);
      setOffset(0);
    }
  };

  useEffect(() => {
    if (disabled) return undefined;

    const onTouchStart = (event) => {
      if (refreshing || window.scrollY > 4) return;
      if (event.target.closest('textarea, input, select, .leaflet-container, .nilgiris-map-wrapper, .modal, dialog, .chat-panel, .earth-modal')) return;
      startY.current = event.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (event) => {
      if (!pulling.current || refreshing) return;
      const distance = event.touches[0].clientY - startY.current;
      if (distance > 0 && window.scrollY <= 0) {
        setOffset(Math.min(88, distance * 0.45));
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (offset > 64) {
        void runRefresh();
      } else {
        setOffset(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, offset, refreshing, onRefresh]);

  return (
    <div className="ptr-root">
      <div className={`ptr-indicator ${refreshing || offset > 8 ? 'visible' : ''}`} style={{ height: refreshing ? 56 : offset }} aria-live="polite">
        {refreshing ? 'Refreshing…' : offset > 64 ? 'Release to refresh' : 'Pull to refresh'}
      </div>
      {children}
      <button type="button" className="ptr-fallback" onClick={runRefresh} disabled={refreshing || disabled} aria-label="Refresh content">
        <FaRedoAlt /> {refreshing ? 'Refreshing' : 'Refresh'}
      </button>
      {error && <p className="ptr-error" role="alert">{error}</p>}
    </div>
  );
}

export default PullToRefresh;
