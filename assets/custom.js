document.querySelectorAll('.slider-scrollings').forEach((scrollingElement) => {
  let isDragging = false;
  let startX;
  let scrollLeft;
  let scrollInterval;
  let dragSpeed = 1.2;
  const autoScrollSpeed = Number(scrollingElement.dataset.speed) || 1;

  // --- 1) DUPLICATE CHILDREN FOR SEAMLESS LOOP ---
  const children = Array.from(scrollingElement.children);
  children.forEach(child => scrollingElement.appendChild(child.cloneNode(true))); // safe clone

  const half = scrollingElement.scrollWidth / 2; // cached half width

  // --- 2) AUTOPLAY ---
  const startAutoScroll = () => {
    stopAutoScroll();
    scrollInterval = setInterval(() => {
      scrollingElement.scrollLeft += autoScrollSpeed;

      // seamless loop
      if (scrollingElement.scrollLeft >= half) {
        scrollingElement.scrollLeft -= half;
      }
    }, 16);
  };

  const stopAutoScroll = () => clearInterval(scrollInterval);

  // --- 3) DRAG EVENTS (DESKTOP) ---
  scrollingElement.addEventListener("mousedown", (e) => {
    isDragging = true;
    stopAutoScroll();
    startX = e.pageX - scrollingElement.offsetLeft;
    scrollLeft = scrollingElement.scrollLeft;
    scrollingElement.style.cursor = "grabbing";
  });

  scrollingElement.addEventListener("mouseleave", () => {
    if (!isDragging) return;
    isDragging = false;
    scrollingElement.style.cursor = "default";
    startAutoScroll();
  });

  scrollingElement.addEventListener("mouseup", () => {
    isDragging = false;
    scrollingElement.style.cursor = "default";
    startAutoScroll();
  });

  scrollingElement.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const x = e.pageX - scrollingElement.offsetLeft;
    const walk = (x - startX) * dragSpeed;
    scrollingElement.scrollLeft = scrollLeft - walk;

    // --- CONTINUOUS LOOP FIX FOR DESKTOP DRAG ---
    if (scrollingElement.scrollLeft >= half) {
      scrollingElement.scrollLeft -= half;
      scrollLeft = scrollingElement.scrollLeft + walk;
      startX = x;
    } else if (scrollingElement.scrollLeft <= 0) {
      scrollingElement.scrollLeft += half;
      scrollLeft = scrollingElement.scrollLeft + walk;
      startX = x;
    }
  });

  // --- 4) TOUCH EVENTS (MOBILE) ---
  scrollingElement.addEventListener("touchstart", (e) => {
    isDragging = true;
    stopAutoScroll();
    startX = e.touches[0].pageX - scrollingElement.offsetLeft;
    scrollLeft = scrollingElement.scrollLeft;
  });

  scrollingElement.addEventListener("touchend", () => {
    isDragging = false;
    startAutoScroll();
  });

  scrollingElement.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - scrollingElement.offsetLeft;
    const walk = (x - startX) * dragSpeed;
    scrollingElement.scrollLeft = scrollLeft - walk;

    // seamless loop for mobile
    if (scrollingElement.scrollLeft >= half) {
      scrollingElement.scrollLeft -= half;
    } else if (scrollingElement.scrollLeft <= 0) {
      scrollingElement.scrollLeft += half;
    }
  });

  // Start autoplay
  startAutoScroll();
});
