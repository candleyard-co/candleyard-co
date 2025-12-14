document.addEventListener('DOMContentLoaded', function() {
  const buttons = document.querySelectorAll('.button--state-page-navigation');
  const navContainer = document.querySelector('.page-navigation');
  
  if (!buttons.length || !navContainer) return;
  
  // Debug: Log container info
  console.log('Container width:', navContainer.clientWidth);
  console.log('Container scrollWidth:', navContainer.scrollWidth);
  console.log('Container can scroll:', navContainer.scrollWidth > navContainer.clientWidth);
  
  // Function to scroll button into view
  function scrollButtonToView(button) {
    if (!button) return;
    
    // Get button position relative to container
    const buttonRect = button.getBoundingClientRect();
    const containerRect = navContainer.getBoundingClientRect();
    
    // Calculate how much we need to scroll to center the button
    const buttonCenter = buttonRect.left - containerRect.left + buttonRect.width / 2;
    const containerCenter = containerRect.width / 2;
    const scrollAmount = buttonCenter - containerCenter;
    
    // Apply the scroll
    navContainer.scrollLeft += scrollAmount;
  }
  
  // Function to update active button
  function updateActiveButton() {
    let activeButton = null;
    let closestDistance = Infinity;
    
    // Check each button's section
    buttons.forEach(button => {
      const href = button.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      
      const sectionId = href.substring(1);
      const section = document.querySelector(`[data-section-id="${sectionId}"]`);
      
      if (section) {
        const rect = section.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Check if section is visible in viewport (middle 60%)
        const isInView = rect.top < windowHeight * 0.7 && rect.bottom > windowHeight * 0.3;
        
        if (isInView) {
          // Calculate distance from center
          const sectionMiddle = rect.top + rect.height / 2;
          const viewportMiddle = windowHeight / 2;
          const distance = Math.abs(sectionMiddle - viewportMiddle);
          
          // If this section is closer to viewport center
          if (distance < closestDistance) {
            closestDistance = distance;
            activeButton = button;
          }
        }
      }
    });
    
    // Update active class
    if (activeButton) {
      buttons.forEach(b => b.classList.remove('active'));
      activeButton.classList.add('active');
      
      // Scroll button into view
      scrollButtonToView(activeButton);
    } else if (buttons.length > 0) {
      // Fallback: If at top of page, activate first button
      if (window.scrollY < 50) {
        buttons.forEach(b => b.classList.remove('active'));
        buttons[0].classList.add('active');
        scrollButtonToView(buttons[0]);
      }
    }
  }
  
  // Run on scroll (with throttling for performance)
  let scrollTimeout;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveButton, 50);
  });
  
  // Run on click
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      const sectionId = href.substring(1);
      const section = document.querySelector(`[data-section-id="${sectionId}"]`);
      
      if (section) {
        buttons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Scroll button into view
        scrollButtonToView(this);
        
        // Then scroll to section
        section.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  
  // Also update on resize
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateActiveButton, 100);
  });
  
  // Initial check
  setTimeout(updateActiveButton, 100);
});