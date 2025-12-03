document.querySelectorAll('.slider-scrollings').forEach((scrollingElement) => {
  let isDragging = false;
  let startX;
  let scrollLeft;
  let scrollInterval;
  const dragSpeed = 1.2;
  const autoScrollSpeed = Number(scrollingElement.dataset.speed) || 1;

  // --- 1) DUPLICATE CONTENT FOR SEAMLESS LOOP ---
  const children = Array.from(scrollingElement.children);
  children.forEach(child => scrollingElement.appendChild(child.cloneNode(true)));
  const half = scrollingElement.scrollWidth / 2;

  // --- 2) AUTOPLAY ---
  const startAutoScroll = () => {
    stopAutoScroll();
    scrollInterval = setInterval(() => {
      scrollingElement.scrollLeft += autoScrollSpeed;
      if (scrollingElement.scrollLeft >= half) scrollingElement.scrollLeft -= half;
    }, 16);
  };
  const stopAutoScroll = () => clearInterval(scrollInterval);

  // --- 3) DRAG FUNCTION (SHARED) ---
  const handleDrag = (clientX) => {
    const walk = (clientX - startX) * dragSpeed;
    let newScroll = scrollLeft - walk;

    // --- WRAP LOOP ---
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

  // --- 6) START AUTOSCROLL ---
  startAutoScroll();
});
