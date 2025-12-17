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
                const storedDataStr = localStorage.getItem('free-gift-selection');
                
                if (storedDataStr) {
                    const storedData = JSON.parse(storedDataStr);
                    
                    if (storedData?.freeGift?.variantId) {
                        const freeGiftVariantId = Number(storedData.freeGift.variantId);
                        const filteredItems = cartData.items.filter(item => 
                            Number(item.variant_id) === freeGiftVariantId
                        );

                        // Remove free gift if cart total is $0
                        if (filteredItems.length > 0 && cartData.total_price === 0) {
                            console.log('Cart total is $0. Removing free gift...');
                            removeItemFromCart(filteredItems[0].key);
                        }
                        // Add free gift if cart has paid items (> $0) and gift not present
                        else if (filteredItems.length === 0 && cartData.total_price > 0) {
                            console.log('Cart has paid items but no free gift. Adding free gift...');
                            addFreeGiftToCart(storedData.freeGift);
                        }
                    }
                }
            } catch (error) {
                console.error('Cart data parsing error:', error);
            }
        }
    }
}

function addFreeGiftToCart(freeGiftData) {
    const formData = new FormData();
    
    // Add the free gift variant
    formData.append('id', freeGiftData.variantId);
    formData.append('quantity', 1);
    
    // Find the main product variant ID from the cart to use as parent
    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    let sectionIds = [];
    let mainVariantId = null;
    
    // First get the cart sections and try to find a main product
    cartItemsComponents.forEach((item) => {
        if (item instanceof HTMLElement && item.dataset.sectionId) {
            sectionIds.push(item.dataset.sectionId);
        }
    });
    
    // Try to find a non-gift item in the cart to use as parent
    // You might want to adjust this logic based on how you identify the main product
    if (sectionIds.length > 0) {
        formData.append('sections', sectionIds.join(','));
        
        // Fetch current cart to find the main product
        return fetch('/cart.js')
            .then(response => response.json())
            .then(cart => {
                // Find the first item that's not a free gift (you might need to adjust this logic)
                const mainCartItem = cart.items.find(item => 
                    !item.properties || 
                    (item.properties._type !== 'Free Gift' && !item.properties._type)
                );
                
                // Use the main product's variant ID if found, otherwise use the first item
                mainVariantId = mainCartItem ? mainCartItem.variant_id : cart.items[0]?.variant_id;
                
                // Add properties to identify it as a free gift
                if (mainVariantId) {
                    formData.append('properties[_parentProduct]', mainVariantId.toString());
                }
                formData.append('properties[_type]', 'Free Gift');
                formData.append('properties[_giftProductId]', freeGiftData.id.toString());
                formData.append('properties[_giftHandle]', freeGiftData.handle);
                
                console.log('Adding free gift to cart with properties:', {
                    variantId: freeGiftData.variantId,
                    parentProduct: mainVariantId,
                    type: 'Free Gift',
                    giftProductId: freeGiftData.id,
                    handle: freeGiftData.handle
                });
                
                // Now make the add request
                const fetchCfg = fetchConfig('javascript', { body: formData });
                
                return fetch('/cart/add.js', {
                    ...fetchCfg,
                    headers: {
                        ...fetchCfg.headers,
                        Accept: 'text/html',
                    },
                });
            })
            .then(response => response.json())
            .then(updatedCart => {
                console.log('Free gift added successfully.');
                
                document.dispatchEvent(
                    new CustomEvent(ThemeEvents.cartUpdate, {
                        detail: {
                            sourceId: 'free-gift-adder',
                            data: updatedCart,
                            sections: updatedCart.sections || {}
                        }
                    })
                );
                
                return updatedCart;
            });
    } else {
        // Fallback if we can't find sections (shouldn't happen normally)
        formData.append('properties[_type]', 'Free Gift');
        formData.append('properties[_giftProductId]', freeGiftData.id.toString());
        formData.append('properties[_giftHandle]', freeGiftData.handle);
        
        const fetchCfg = fetchConfig('javascript', { body: formData });
        
        console.log('Adding free gift without parent product reference');
        
        return fetch('/cart/add.js', {
            ...fetchCfg,
            headers: {
                ...fetchCfg.headers,
                Accept: 'text/html',
            },
        })
        .then(response => response.json())
        .then(updatedCart => {
            console.log('Free gift added successfully (no parent reference).');
            
            document.dispatchEvent(
                new CustomEvent(ThemeEvents.cartUpdate, {
                    detail: {
                        sourceId: 'free-gift-adder',
                        data: updatedCart,
                        sections: updatedCart.sections || {}
                    }
                })
            );
            
            return updatedCart;
        });
    }
}

function removeItemFromCart(itemKey) {
    // First fetch the cart to get current line numbers
    return fetch('/cart.js')
        .then(response => response.json())
        .then(cart => {
            // Find the item by its key to get its line position
            const itemIndex = cart.items.findIndex(item => item.key === itemKey);
            
            if (itemIndex === -1) {
                console.log('Item not found in cart by key:', itemKey);
                // Try finding by properties if key doesn't match
                const giftItem = cart.items.find(item => 
                    item.properties && 
                    item.properties._type === 'Free Gift'
                );
                
                if (!giftItem) {
                    throw new Error('Free gift not found in cart');
                }
                
                // Use the found gift item
                return removeItemByLine(cart.items.indexOf(giftItem) + 1);
            }
            
            // Use the line number (1-indexed)
            return removeItemByLine(itemIndex + 1);
        })
        .catch(error => {
            console.error('Error fetching cart for removal:', error);
            throw error;
        });
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
    
    console.log('Removing item at line:', lineNumber);
    
    return fetch('/cart/update.js', {
        ...fetchCfg,
        headers: {
            ...fetchCfg.headers,
            Accept: 'text/html',
        },
    })
    .then(response => response.json())
    .then(updatedCart => {
        console.log('Item removed successfully via update.js');
        document.dispatchEvent(
            new CustomEvent(ThemeEvents.cartUpdate, {
                detail: {
                    sourceId: 'free-gift-adder',
                    data: updatedCart,
                    sections: updatedCart.sections || {}
                }
            })
        );
        return updatedCart;
    })
    .catch(error => {
        console.error('Cart removal error via update.js:', error);
        throw error;
    });
}

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

  let resizeTimeout;
  
  function calculateAndSetHeight() {
    if (!(header instanceof HTMLElement)) return;
    
    // Get the actual visible height
    const rect = header.getBoundingClientRect();
    const height = rect.height;
    
    // Set the CSS variable without subtracting 1px
    document.body.style.setProperty('--header-static-height', `${height}px`);
    
    // Also set a fallback variable for different calculations
    document.body.style.setProperty('--header-total-height', `${height}px`);
  }

  // Initial calculation
  calculateAndSetHeight();

  // Debounced resize handler
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(calculateAndSetHeight, 100);
  }

  // Use ResizeObserver for layout changes
  const observer = new ResizeObserver((entries) => {
    for (let entry of entries) {
      handleResize();
    }
  });

  // Observe both the header group and the header itself
  observer.observe(headerGroup);
  if (header instanceof HTMLElement) {
    observer.observe(header);
  }

  // Also listen to window resize with debouncing
  window.addEventListener('resize', handleResize);
  
  // Listen for any CSS transitions or animations on the header
  headerGroup.addEventListener('transitionend', handleResize);
  headerGroup.addEventListener('animationend', handleResize);
  
  // If header has a shadow DOM or slotted content, observe those too
  if (header.shadowRoot) {
    const shadowElements = header.shadowRoot.querySelectorAll('*');
    shadowElements.forEach(el => observer.observe(el));
  }
});

if (Zipify) {
  Zipify.OCU.api.customAddToCartButton = '.add-to-pack-button';
//   Zipify.OCU.api.customBuyNowButton = 'desired selector';
}