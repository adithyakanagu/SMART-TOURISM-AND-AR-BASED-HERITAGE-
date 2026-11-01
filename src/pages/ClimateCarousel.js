import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import Climate, { ClimateOverview } from './Climate';
import './ClimateCarousel.css';

function ClimateCarousel({ activeTab }) {
  const [{ activeSlide, direction }, setCarouselState] = useState({ activeSlide: 0, direction: 1 });
  const [locationId, setLocationId] = useState('ooty');
  const touchStart = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const targetSlide = activeTab === 'climate' ? 1 : 0;
    setCarouselState((current) => {
      if (current.activeSlide === targetSlide) return current;
      return {
        activeSlide: targetSlide,
        direction: targetSlide > current.activeSlide ? 1 : -1
      };
    });
  }, [activeTab]);

  const goToSlide = (nextSlide) => {
    setCarouselState((current) => {
      if (nextSlide === current.activeSlide || nextSlide < 0 || nextSlide > 1) return current;
      return {
        activeSlide: nextSlide,
        direction: nextSlide > current.activeSlide ? 1 : -1
      };
    });
  };

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    if (!touchStart.current || event.target.closest('button, a, input, select, textarea')) {
      touchStart.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return;
    goToSlide(activeSlide + (deltaX < 0 ? 1 : -1));
  };

  const handleKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowRight') goToSlide(activeSlide + 1);
    if (event.key === 'ArrowLeft') goToSlide(activeSlide - 1);
  };

  return (
    <section className="climate-carousel" aria-label="Nilgiris climate and travel safety">
      <div className="climate-carousel-controls">
        <div className="climate-carousel-caption" aria-live="polite">
          <strong>Climate & travel safety</strong>
          <span>{activeSlide === 0 ? 'At a glance' : 'Forecast, advisories & history'}</span>
        </div>
        <div className="climate-carousel-navigation">
          <button type="button" className="climate-carousel-arrow" onClick={() => goToSlide(activeSlide - 1)} disabled={activeSlide === 0} aria-label="Show climate overview">
            <FaArrowLeft aria-hidden="true" />
          </button>
          <div className="climate-carousel-dots" role="group" aria-label="Choose climate slide">
            {[0, 1].map((slide) => (
              <button
                key={slide}
                type="button"
                className={activeSlide === slide ? 'active' : ''}
                aria-label={`Show ${slide === 0 ? 'quick safety overview' : 'detailed climate report'}`}
                aria-pressed={activeSlide === slide}
                onClick={() => goToSlide(slide)}
              />
            ))}
          </div>
          <button type="button" className="climate-carousel-arrow" onClick={() => goToSlide(activeSlide + 1)} disabled={activeSlide === 1} aria-label="Show detailed climate report">
            <FaArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="climate-carousel-viewport"
        role="group"
        aria-roledescription="carousel"
        aria-label={`Slide ${activeSlide + 1} of 2`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={activeSlide}
            className="climate-carousel-slide"
            custom={direction}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: 'easeOut' }}
          >
            {activeSlide === 0 ? (
              <ClimateOverview locationId={locationId} onLocationChange={setLocationId} onViewDetails={() => goToSlide(1)} />
            ) : (
              <Climate embedded initialLocation={locationId} onLocationChange={setLocationId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

export default ClimateCarousel;
