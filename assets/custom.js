import { fetchConfig } from '@theme/utilities';
import { ThemeEvents } from '@theme/events';

function cartListener(event) {
    const eventData = event.detail.data;

    // Skip events triggered by this listener to prevent loops
    if (event.detail.sourceId === 'free-gift-adder') {
        return;
    }

    if (eventData.sections && typeof eventData.sections === 'object') {
        const sectionId = Object.keys(eventData.sections)[0];
        const sectionHtml = eventData.sections[sectionId];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sectionHtml;
        const cartDataElement = tempDiv.querySelector('noscript.cart-data');
        
        if (cartDataElement?.textContent) {
            try {
                const cartData = JSON.parse(cartDataElement.textContent);
                const storedDataStr = sessionStorage.getItem('free-gift-selection');
                
                // Check if cart already has ANY free gift (not just from current session)
                const existingFreeGifts = cartData.items.filter(item => 
                    item.properties && item.properties._type === 'Free Gift'
                );
                
                const hasPaidItems = cartData.total_price > 0;
                
                // Remove ALL free gifts if cart has no paid items
                if (existingFreeGifts.length > 0 && !hasPaidItems) {
                    removeAllFreeGifts(cartData, existingFreeGifts);
                }
                // Add free gift if cart has paid items and NO free gifts exist
                else if (hasPaidItems && existingFreeGifts.length === 0) {
                    // Only add if we have gift data in session storage
                    if (storedDataStr) {
                        const storedData = JSON.parse(storedDataStr);
                        if (storedData?.freeGift?.variantId) {
                            addFreeGiftToCart(storedData.freeGift, cartData);
                        }
                    }
                }
                // If free gifts already exist and cart has paid items, ensure only ONE exists
                else if (hasPaidItems && existingFreeGifts.length > 1) {
                    removeExcessFreeGifts(cartData, existingFreeGifts);
                }
            } catch (error) {
                // Keep only essential error logging
            }
        }
    }
}

function addFreeGiftToCart(freeGiftData, cartData) {
    const formData = new FormData();
    
    // Add the free gift variant
    formData.append('id', freeGiftData.variantId);
    formData.append('quantity', 1);
    
    // Get cart sections
    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    let sectionIds = [];
    let mainVariantId = null;
    
    // Get the cart sections
    cartItemsComponents.forEach((item) => {
        if (item instanceof HTMLElement && item.dataset.sectionId) {
            sectionIds.push(item.dataset.sectionId);
        }
    });
    
    // Find a non-gift item in the cart to use as parent
    if (cartData && cartData.items && cartData.items.length > 0) {
        // Find the first item that's not a free gift
        const mainCartItem = cartData.items.find(item => 
            !item.properties || 
            (item.properties._type !== 'Free Gift' && !item.properties._type)
        );
        
        // Use the main product's variant ID if found, otherwise use the first item
        mainVariantId = mainCartItem ? mainCartItem.variant_id : cartData.items[0]?.variant_id;
        
        // Add properties to identify it as a free gift
        if (mainVariantId) {
            formData.append('properties[_parentProduct]', mainVariantId.toString());
        }
        formData.append('properties[_type]', 'Free Gift');
        formData.append('properties[_giftProductId]', freeGiftData.id.toString());
        formData.append('properties[_giftHandle]', freeGiftData.handle);
        
        // Add sections if available
        if (sectionIds.length > 0) {
            formData.append('sections', sectionIds.join(','));
        }

        // Now make the add request
        const fetchCfg = fetchConfig('javascript', { body: formData });
        
        return fetch('/cart/add.js', {
            ...fetchCfg,
            headers: {
                ...fetchCfg.headers,
                Accept: 'text/html',
            },
        })
        .then(response => response.json())
        .then(updatedCart => {
            document.dispatchEvent(
                new CustomEvent(ThemeEvents.cartUpdate, {
                    detail: {
                        sourceId: 'free-gift-adder',
                        data: updatedCart
                    }
                })
            );
            
            return updatedCart;
        });
    } else {
        // Fallback if we can't find cart data or items
        formData.append('properties[_type]', 'Free Gift');
        formData.append('properties[_giftProductId]', freeGiftData.id.toString());
        formData.append('properties[_giftHandle]', freeGiftData.handle);
        
        const fetchCfg = fetchConfig('javascript', { body: formData });
        
        return fetch('/cart/add.js', {
            ...fetchCfg,
            headers: {
                ...fetchCfg.headers,
                Accept: 'text/html',
            },
        })
        .then(response => response.json())
        .then(updatedCart => {
            document.dispatchEvent(
                new CustomEvent(ThemeEvents.cartUpdate, {
                    detail: {
                        sourceId: 'free-gift-adder',
                        data: updatedCart
                    }
                })
            );
            
            return updatedCart;
        });
    }
}

function removeAllFreeGifts(cartData, freeGiftItems) {
    // Remove all free gifts in the cart
    const removePromises = freeGiftItems.map((item) => {
        const itemIndex = cartData.items.indexOf(item);
        if (itemIndex !== -1) {
            return removeItemByLine(itemIndex + 1);
        }
        return Promise.resolve();
    });
    
    return Promise.all(removePromises);
}

function removeExcessFreeGifts(cartData, freeGiftItems) {
    // Keep only the first free gift, remove the rest
    const giftsToRemove = freeGiftItems.slice(1); // All except the first
    
    const removePromises = giftsToRemove.map((item) => {
        const itemIndex = cartData.items.indexOf(item);
        if (itemIndex !== -1) {
            return removeItemByLine(itemIndex + 1);
        }
        return Promise.resolve();
    });
    
    return Promise.all(removePromises);
}

function removeItemByLine(lineNumber) {
    const formData = new FormData();
    
    // For /cart/update.js, use line numbers and updates[]
    formData.append('updates[]', 0); // Quantity 0 removes the item
    formData.append('line', lineNumber.toString()); // Line number (1-indexed)
    
    // Get sections to update
    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    let sectionIds = [];
    cartItemsComponents.forEach((item) => {
        if (item instanceof HTMLElement && item.dataset.sectionId) {
            sectionIds.push(item.dataset.sectionId);
        }
    });
    
    if (sectionIds.length > 0) {
        formData.append('sections', sectionIds.join(','));
    }
    
    const fetchCfg = fetchConfig('javascript', { body: formData });
    
    return fetch('/cart/update.js', {
        ...fetchCfg,
        headers: {
            ...fetchCfg.headers,
            Accept: 'text/html',
        },
    })
    .then(response => response.json())
    .then(updatedCart => {
        document.dispatchEvent(
            new CustomEvent(ThemeEvents.cartUpdate, {
                detail: {
                    sourceId: 'free-gift-adder',
                    data: updatedCart
                }
            })
        );
        return updatedCart;
    })
    .catch(error => {
        // Silently handle errors
        throw error;
    });
}

// Initialize the event listener
document.addEventListener(ThemeEvents.cartUpdate, cartListener);

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


function calculateHeaderGroupHeight() {
  const headerGroup = document.querySelector('#header-group');
  if (!headerGroup) return 0;

  let totalHeight = 0;
  
  // Get all .shopify-section-group-header-group elements inside #header-group
  const headerSections = headerGroup.querySelectorAll('.shopify-section-group-header-group');
  
  if (headerSections.length === 0) return 0;

  // Check if ANY section has [data-sticky-state="inactive"]
  const hasInactiveElements = Array.from(headerSections).some(section => 
    section.querySelector('[data-sticky-state="inactive"]')
  );

  if (hasInactiveElements) {
    // Sum the heights of all .shopify-section-group-header-group sections
    headerSections.forEach(section => {
      if (section instanceof HTMLElement) {
        const style = window.getComputedStyle(section);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          totalHeight += section.offsetHeight;
        }
      }
    });
  } else {
    // Only get header-component height
    const header = document.querySelector('header-component');
    if (header instanceof HTMLElement) {
      totalHeight += header.offsetHeight;
    }
  }

  return totalHeight;
}

function updateHeaderHeight() {
  const headerHeight = calculateHeaderGroupHeight();
  
  // Update CSS variables
  document.body.style.setProperty('--header-static-height', `${headerHeight}px`);
  document.body.style.setProperty('--header-total-height', `${headerHeight}px`);
}

// Simple debounce
function debounce(func, wait) {
  let timeout;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(func, wait);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const headerGroup = document.querySelector('#header-group');
  if (!headerGroup) return;

  // Initial calculation
  updateHeaderHeight();

  // Create ResizeObserver
  const resizeObserver = new ResizeObserver(debounce(() => {
    updateHeaderHeight();
  }, 100));

  // Observe #header-group and all .shopify-section-group-header-group sections
  resizeObserver.observe(headerGroup);
  
  const headerSections = headerGroup.querySelectorAll('.shopify-section-group-header-group');
  headerSections.forEach(section => {
    if (section instanceof HTMLElement) {
      resizeObserver.observe(section);
    }
  });

  // Also observe header-component specifically
  const header = document.querySelector('header-component');
  if (header instanceof HTMLElement) {
    resizeObserver.observe(header);
  }

  // Handle scroll and resize
  const handleUpdate = debounce(updateHeaderHeight, 100);
  window.addEventListener('scroll', handleUpdate, { passive: true });
  window.addEventListener('resize', handleUpdate);

  // Watch for attribute changes on the sections and header-component
  const mutationObserver = new MutationObserver(() => {
    updateHeaderHeight();
  });

  // Observe header sections for changes
  headerSections.forEach(section => {
    mutationObserver.observe(section, { 
      attributes: true, 
      childList: true,
      subtree: true 
    });
  });

  // Also observe header-component for data-sticky-state changes
  if (header instanceof HTMLElement) {
    mutationObserver.observe(header, { 
      attributes: true,
      attributeFilter: ['data-sticky-state', 'style', 'class']
    });
  }

  // Observe the #header-group container itself
  mutationObserver.observe(headerGroup, { 
    attributes: true, 
    childList: true,
    subtree: true 
  });
});

// Export for manual triggering if needed
window.updateHeaderHeight = updateHeaderHeight;
window.calculateHeaderGroupHeight = calculateHeaderGroupHeight;


class VideoMedia extends HTMLElement {
    constructor() {
      super();
      this.init();
    }
  
    init() {
      if (this.getAttribute('loaded')) return;

      new IntersectionObserver(([entry], observer) => {
        if (!entry.isIntersecting) return;
        
        this.loadContent();
        observer.disconnect();
      }, { threshold: 0.1, once: true }).observe(this);
    }

    loadContent() {
      this.setAttribute('loaded', true);
      this.querySelector('img')?.remove();
  
      // Extract content from <noscript> and parse it
      const templateString = this.querySelector('noscript')?.textContent.trim();
      if (!templateString) return;
  
      const parser = new DOMParser();
      const doc = parser.parseFromString(templateString, 'text/html');
      const video = doc.querySelector('video');
  
      if (video) {
        this.appendChild(video);
        video.play().catch(err => console.warn("Autoplay failed:", err));
      }
    }
}
  
customElements.define('video-media', VideoMedia);


function scrollToActiveNavButton(containerSelector = '.navigation--buttons') {
  const nav = document.querySelector(containerSelector);
  if (!nav) return;

  const activeBtn = nav.querySelector('a.active');
  if (!activeBtn) return;

  nav.scrollLeft =
    activeBtn.offsetLeft -
    (nav.clientWidth / 2) +
    (activeBtn.offsetWidth / 2);
}

// call
scrollToActiveNavButton();

