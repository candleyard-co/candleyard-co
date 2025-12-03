document.querySelectorAll('.slider-scrollings').forEach((scrollingElement) => {
  let isDragging = false;
  let startX;
  let scrollLeft;
  let scrollInterval;
  let dragSpeed = 1.2;

  const autoScrollSpeed = Number(scrollingElement.dataset.speed) || 1;

  // --- 1) DUPLICATE CHILDREN FOR SEAMLESS LOOP ---
  const content = scrollingElement.innerHTML;
  scrollingElement.innerHTML = content + content; // clone once

  // --- 2) AUTOPLAY ---
  const startAutoScroll = () => {
    stopAutoScroll();
    scrollInterval = setInterval(() => {
      scrollingElement.scrollLeft += autoScrollSpeed;

      const half = scrollingElement.scrollWidth / 2;

      // When reaching cloned half, jump back to original half
      if (scrollingElement.scrollLeft >= half) {
        scrollingElement.scrollLeft = scrollingElement.scrollLeft - half;
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

    const maxScroll = scrollingElement.scrollWidth - scrollingElement.clientWidth;

    // ---- CONTINUOUS LOOP FIX FOR DESKTOP DRAG ----
    if (scrollingElement.scrollLeft <= 0) {
        scrollingElement.scrollLeft = maxScroll - 1;
        scrollLeft = scrollingElement.scrollLeft + walk;
        startX = x;
    } else if (scrollingElement.scrollLeft >= maxScroll - 1) {
        scrollingElement.scrollLeft = 1;
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

    const half = scrollingElement.scrollWidth / 2;

    // Loop while dragging on mobile
    if (scrollingElement.scrollLeft >= half) {
      scrollingElement.scrollLeft = scrollingElement.scrollLeft - half;
    } else if (scrollingElement.scrollLeft <= 0) {
      scrollingElement.scrollLeft = scrollingElement.scrollLeft + half;
    }
  });

  // Start autoplay
  startAutoScroll();
});
