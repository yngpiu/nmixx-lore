import { useState, useEffect } from 'react';
import './App.css';

// Generate array of image numbers from 1 to 29
const images = Array.from({ length: 29 }, (_, i) => i + 1);

function App() {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for fade-in animation
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          target.classList.add('visible');
          observer.unobserve(target);
        }
      });
    }, observerOptions);

    // Observe all story items
    const storyItems = document.querySelectorAll('.story-item');
    storyItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [loadedImages]);

  const handleImageLoad = (imageNumber: number) => {
    setLoadedImages((prev) => new Set([...prev, imageNumber]));
  };

  return (
    <div className="app">
      {/* Gradient Overlays */}
      <div className="gradient-overlay-top"></div>
      <div className="gradient-overlay-bottom"></div>

      {/* Scroll Progress Bar */}
      <div className="scroll-progress">
        <div
          className="scroll-progress-bar"
          style={{ width: `${scrollProgress}%` }}
        ></div>
      </div>

      {/* Story Container */}
      <main className="story-container">
        {images.map((imageNumber) => (
          <div
            key={imageNumber}
            className={`story-item ${
              loadedImages.has(imageNumber) ? '' : 'loading'
            }`}
          >
            <img
              src={`/lore/${imageNumber}.png`}
              alt={`NMIXX Lore ${imageNumber}`}
              className="story-image"
              loading="lazy"
              onLoad={() => handleImageLoad(imageNumber)}
            />
          </div>
        ))}
      </main>
    </div>
  );
}

export default App;
