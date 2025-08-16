import { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import './App.css';

// Generate array of image numbers from 1 to 29
const images = Array.from({ length: 29 }, (_, i) => i + 1);

function App() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const lenisRef = useRef<Lenis | null>(null);

  // Optimized Lenis initialization
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.0, // Faster for better responsiveness
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1.2,
      touchMultiplier: 1.5,
    });

    lenisRef.current = lenis;

    // Lenis animation frame
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Update scroll progress
    lenis.on('scroll', (e: { scroll: number; limit: number }) => {
      const progress = (e.scroll / (e.limit || 1)) * 100;
      setScrollProgress(progress);
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  // Scroll progress tracking (fallback for non-Lenis browsers)
  useEffect(() => {
    const handleScroll = () => {
      if (!lenisRef.current) {
        const scrollTop = window.pageYOffset;
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for fade-in animation and current image tracking
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1, // Trigger when only 10% of image is visible
      rootMargin: '100px', // Start animation 100px before entering viewport
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          const imageIndex = parseInt(target.dataset.index || '0');
          const imageNumber = images[imageIndex];

          // Only show if image is loaded
          if (loadedImages.has(imageNumber)) {
            target.classList.add('visible');
          } else {
            // Mark as pending to show when image loads
            target.dataset.pendingVisible = 'true';
          }
        }
      });
    }, observerOptions);

    // Observe all story items
    const storyItems = document.querySelectorAll('.story-item');
    storyItems.forEach((item, index) => {
      observer.observe(item);
      // Make first image visible immediately if loaded
      if (index === 0 && loadedImages.has(images[0])) {
        (item as HTMLElement).classList.add('visible');
      }
    });

    return () => observer.disconnect();
  }, [loadedImages]);

  // Optimized scroll-driven scaling effect
  useEffect(() => {
    let ticking = false;
    let lastScrollY = window.pageYOffset;

    const updateScaling = () => {
      const currentScrollY = window.pageYOffset;
      // Only update if scroll changed significantly (performance optimization)
      if (Math.abs(currentScrollY - lastScrollY) < 5) {
        ticking = false;
        return;
      }
      lastScrollY = currentScrollY;

      const viewportCenter = window.innerHeight / 2 + currentScrollY;
      const storyItems = document.querySelectorAll('.story-item.visible');

      storyItems.forEach((item) => {
        const element = item as HTMLElement;
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + currentScrollY + rect.height / 2;

        // Calculate distance from viewport center
        const distance = Math.abs(viewportCenter - elementCenter);
        const maxDistance = window.innerHeight * 0.8; // Reduced range for better performance

        // Calculate scale based on distance (closer to center = larger scale)
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const scale = Math.max(0.85, 1 - normalizedDistance * 0.15); // Optimized range

        const imageElement = element.querySelector(
          '.story-image'
        ) as HTMLElement;
        if (imageElement) {
          imageElement.style.transform = `scale(${scale})`;
        }
      });

      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScaling);
        ticking = true;
      }
    };

    // Initial call
    requestAnimationFrame(updateScaling);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle image load
  const handleImageLoad = (imageNumber: number) => {
    setLoadedImages((prev) => {
      const newSet = new Set([...prev, imageNumber]);

      // Check if any pending items should be made visible
      setTimeout(() => {
        const pendingItems = document.querySelectorAll(
          '[data-pending-visible="true"]'
        );
        pendingItems.forEach((item) => {
          const element = item as HTMLElement;
          const imageIndex = parseInt(element.dataset.index || '0');
          const itemImageNumber = images[imageIndex];

          if (newSet.has(itemImageNumber)) {
            element.classList.add('visible');
            element.removeAttribute('data-pending-visible');
          }
        });
      }, 50);

      return newSet;
    });
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
        {images.map((imageNumber, index) => (
          <div key={imageNumber} className="story-item" data-index={index}>
            <img
              src={`/lore/${imageNumber}.png`}
              alt={`NMIXX Lore ${imageNumber}`}
              className="story-image"
              onLoad={() => handleImageLoad(imageNumber)}
              loading="lazy"
            />
          </div>
        ))}
      </main>
    </div>
  );
}

export default App;
