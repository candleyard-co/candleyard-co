document.querySelectorAll('.slider-scrollings').forEach((scrollingElement) => {
  let isDragging = false;
  let startX;
  let scrollLeft;
  const dragSpeed = 1.2;
  const autoScrollSpeed = Number(scrollingElement.dataset.speed) || 1;
  let animationFrame;
  let half = 0;

  // --- 1) DUPLICATE CONTENT ---
  const children = Array.from(scrollingElement.children);
  children.forEach(child => scrollingElement.appendChild(child.cloneNode(true)));

  // --- IMPORTANT: WAIT FOR FULL LAYOUT BEFORE GETTING half ---
  const computeHalf = () => {
    half = scrollingElement.scrollWidth / 2;
  };

  // Compute full width AFTER DOM + rendering
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      computeHalf();
      startAutoScroll();   // Start autoplay ONLY NOW
    });
  });

  // --- 2) AUTOPLAY WITH RAF ---
  const startAutoScroll = () => {
    stopAutoScroll();

    let last = null;
    const step = (ts) => {
      if (isDragging || !half) {
        animationFrame = requestAnimationFrame(step);
        return;
      }

      if (!last) last = ts;
      const delta = ts - last;
      last = ts;

      scrollingElement.scrollLeft += autoScrollSpeed * (delta / 16);

      if (scrollingElement.scrollLeft >= half) {
        scrollingElement.scrollLeft -= half;
      }

      animationFrame = requestAnimationFrame(step);
    };

    animationFrame = requestAnimationFrame(step);
  };

  const stopAutoScroll = () => {
    cancelAnimationFrame(animationFrame);
  };

  // --- 3) DRAG FUNCTION ---
  const handleDrag = (clientX) => {
    const walk = (clientX - startX) * dragSpeed;
    let newScroll = scrollLeft - walk;

    if (newScroll >= half) newScroll -= half;
    else if (newScroll <= 0) newScroll += half;

    scrollingElement.scrollLeft = newScroll;
  };

  // --- 4) DESKTOP EVENTS ---
  scrollingElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    stopAutoScroll();
    startX = e.clientX;
    scrollLeft = scrollingElement.scrollLeft;
    scrollingElement.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    handleDrag(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    scrollingElement.style.cursor = 'default';
    startAutoScroll();
  });

  scrollingElement.addEventListener('mouseleave', () => {
    if (!isDragging) return;
    isDragging = false;
    scrollingElement.style.cursor = 'default';
    startAutoScroll();
  });

  // --- 5) TOUCH EVENTS ---
  scrollingElement.addEventListener('touchstart', (e) => {
    isDragging = true;
    stopAutoScroll();
    startX = e.touches[0].clientX;
    scrollLeft = scrollingElement.scrollLeft;
  });

  scrollingElement.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    handleDrag(e.touches[0].clientX);
  });

  scrollingElement.addEventListener('touchend', () => {
    isDragging = false;
    startAutoScroll();
  });

});

function scrollToHash() {
  const hash = window.location.hash; // "#faq"
  if (hash) {
    const id = hash.slice(1); // remove #
    const target = document.querySelector(`[data-section-id="${id}"]`);
    if (target) {
      let offset = 0;
      const stickyHeader = document.querySelector('.header[data-sticky-state="active"]');
      if (stickyHeader) {
        offset = stickyHeader.clientHeight;
      }

      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
      });
    }
  }
}

// Run on page load
scrollToHash();


// Run on hash change
window.addEventListener("hashchange", scrollToHash);


function calculateHeaderGroupHeight(
  header = document.querySelector('header-component'),
  headerGroup = document.querySelector('#header-group')
) {
  if (!headerGroup) return 0;

  let totalHeight = 0;
  const children = headerGroup.children;

  for (let i = 0; i < children.length; i++) {
    const element = children[i];
    if (element === header || !(element instanceof HTMLElement)) continue;
    totalHeight += element.offsetHeight;
  }

  // If header is transparent, include the header height
  if (
    header instanceof HTMLElement &&
    header.hasAttribute('transparent') &&
    header.parentElement?.nextElementSibling
  ) {
    return totalHeight + header.offsetHeight;
  }

  return totalHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  const headerGroup = document.querySelector('#header-group');
  const header = document.querySelector('header-component');
  if (!headerGroup) return;

  // Initial calc
  if (header instanceof HTMLElement) {
    const height = calculateHeaderGroupHeight(header);
    document.body.style.setProperty('--header-static-height', `${height - 1}px`);
  }

  // ResizeObserver to re-calc when layout changes
  const observer = new ResizeObserver(() => {
    if (!(header instanceof HTMLElement)) return;

    const height = calculateHeaderGroupHeight(header);
    document.body.style.setProperty('--header-static-height', `${height - 1}px`);
  });

  observer.observe(headerGroup);
});
