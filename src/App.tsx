import { useState, useEffect, useCallback, useRef } from 'react';
import Lenis from 'lenis';
import './App.css';

// Generate array of image numbers from 1 to 29
const images = Array.from({ length: 29 }, (_, i) => i + 1);

function App() {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  // Initialize Lenis
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
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
      threshold: 0.5,
      rootMargin: '0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          target.classList.add('visible');

          // Update current image index
          const imageIndex = parseInt(target.dataset.index || '0');
          setCurrentImageIndex(imageIndex);
        }
      });
    }, observerOptions);

    // Observe all story items
    const storyItems = document.querySelectorAll('.story-item');
    storyItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [loadedImages]);

  // Scroll-driven scaling effect
  useEffect(() => {
    let ticking = false;

    const updateScaling = () => {
      const viewportCenter = window.innerHeight / 2 + window.pageYOffset;
      const storyItems = document.querySelectorAll('.story-item');

      storyItems.forEach((item) => {
        const element = item as HTMLElement;
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + window.pageYOffset + rect.height / 2;

        // Calculate distance from viewport center
        const distance = Math.abs(viewportCenter - elementCenter);
        const maxDistance = window.innerHeight;

        // Calculate scale based on distance (closer to center = larger scale)
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const scale = 1 - normalizedDistance * 0.2; // Scale from 0.8 to 1

        const imageElement = element.querySelector(
          '.story-image'
        ) as HTMLElement;
        if (imageElement) {
          imageElement.style.transform = `scale(${Math.max(scale, 0.8)})`;
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
    updateScaling();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleImageLoad = (imageNumber: number) => {
    setLoadedImages((prev) => new Set([...prev, imageNumber]));
  };

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const scrollToImage = useCallback(
    (index: number) => {
      // Prevent multiple navigation calls
      if (isNavigating) return;

      setIsNavigating(true);

      const targetElement = document.querySelector(
        `[data-index="${index}"]`
      ) as HTMLElement;
      if (targetElement) {
        const elementTop = targetElement.offsetTop;
        const elementHeight = targetElement.offsetHeight;
        const windowHeight = window.innerHeight;

        // Calculate position to center the image
        const centerPosition =
          elementTop - windowHeight / 2 + elementHeight / 2;
        const targetPosition = Math.max(0, centerPosition);

        // Use Lenis for smooth scrolling if available
        if (lenisRef.current) {
          lenisRef.current.scrollTo(targetPosition, {
            duration: 1.5,
            easing: (t) => 1 - Math.pow(1 - t, 3),
          });

          // Reset navigation flag after animation completes
          setTimeout(() => setIsNavigating(false), 1600);
        } else {
          // Fallback to custom smooth scroll
          const startPosition = window.pageYOffset;
          const distance = targetPosition - startPosition;
          const duration = 800; // ms
          let startTime: number | null = null;

          const animateScroll = (currentTime: number) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            // Apply easing function
            const easedProgress = easeInOutCubic(progress);
            const currentPosition = startPosition + distance * easedProgress;

            window.scrollTo(0, currentPosition);

            if (progress < 1) {
              requestAnimationFrame(animateScroll);
            } else {
              // Reset navigation flag when animation completes
              setIsNavigating(false);
            }
          };

          requestAnimationFrame(animateScroll);
        }
      } else {
        setIsNavigating(false);
      }
    },
    [isNavigating]
  );

  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      scrollToImage(currentImageIndex - 1);
    }
  };

  const goToNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      scrollToImage(currentImageIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if (currentImageIndex > 0) {
          scrollToImage(currentImageIndex - 1);
        }
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (currentImageIndex < images.length - 1) {
          scrollToImage(currentImageIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImageIndex, scrollToImage]);

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
          <div
            key={imageNumber}
            className={`story-item ${
              loadedImages.has(imageNumber) ? '' : 'loading'
            }`}
            data-index={index}
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

      {/* Navigation Buttons */}
      <div className="nav-buttons">
        <button
          className={`nav-btn nav-btn-up ${
            currentImageIndex === 0 || isNavigating ? 'disabled' : ''
          }`}
          onClick={goToPreviousImage}
          onTouchStart={(e) => e.preventDefault()}
          disabled={currentImageIndex === 0 || isNavigating}
        >
          ↑
        </button>
        <button
          className={`nav-btn nav-btn-down ${
            currentImageIndex === images.length - 1 || isNavigating
              ? 'disabled'
              : ''
          }`}
          onClick={goToNextImage}
          onTouchStart={(e) => e.preventDefault()}
          disabled={currentImageIndex === images.length - 1 || isNavigating}
        >
          ↓
        </button>
      </div>
    </div>
  );
}

export default App;
