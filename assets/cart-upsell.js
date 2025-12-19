import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

export class CartUpsell extends Component {
  constructor() {
    super();
    document.addEventListener(ThemeEvents.cartUpdate, this.handleCartUpdate.bind(this));
  }

  handleCartUpdate(event) {
    console.log('Cart update event received:', event);
    console.log('Event detail:', event.detail);
    
    // Get the HTML for the cart-upsell section from the event
    const sections = event.detail?.data?.sections;
    if (!sections) return;
    
    // Find the cart-upsell element
    const cartUpsellElement = document.querySelector('cart-upsell');
    
    // Look for cart-upsell HTML in each section
    for (const sectionId in sections) {
      const sectionHtml = sections[sectionId];
      
      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sectionHtml;

      // Check if this section contains cart-upsell
      const newCartUpsell = tempDiv.querySelector('cart-upsell');
      
      if (newCartUpsell && cartUpsellElement) {
        console.log('Found new cart-upsell in section:', sectionId);
        
        // Replace the entire cart-upsell element
        cartUpsellElement.replaceWith(newCartUpsell);
        
        // Reinitialize the new element if needed
        this.reinitializeCartUpsell(newCartUpsell);
        break;
      }
    }
  }
  
  reinitializeCartUpsell(element) {
    // If your cart-upsell needs reinitialization after being replaced
    // Add any reinitialization logic here
    console.log('Cart-upsell replaced and reinitialized');
  }
}

customElements.define('cart-upsell', CartUpsell);