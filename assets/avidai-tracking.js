
    (function() {
      // Immediately set the loaded flag to prevent duplicate execution
      if (window.avidaiTrackingLoaded) {
        console.log("AvidAI Tracking Script already loaded, skipping execution");
        return;
      }
      
      // Mark as loaded immediately to prevent race conditions
      window.avidaiTrackingLoaded = true;
      
      // Additional check: Look for existing script tags (excluding the current one)
      const existingScripts = document.querySelectorAll('script[src*="avidai-tracking.js"]');
      if (existingScripts.length > 1) {
        console.log("Multiple AvidAI Tracking script tags detected, skipping execution");
        return;
      }
      
      console.log("AvidAI Tracking Script loading...");
      
      activateAvidAi();
    })();

    function activateAvidAi(){
      const script = document.createElement("script");
      script.src = 'https://code.jquery.com/jquery-3.7.0.min.js';
      script.type = 'text/javascript';
      script.addEventListener('load', () => {
        trackPageView();
      });
      document.head.appendChild(script);
    }

    // Track Page Views
    window.onload = function () {
      trackPageView();
    };

    window.addEventListener("load", function () {
      trackPageView();
    });

    document.addEventListener("load", function () {
      trackPageView();
    });

    // Track Page Views 
    document.addEventListener('DOMContentLoaded', () => {
      trackPageView();
      trackSubmissions();
    });

    // Track Page Clicks on Button or Anchor Links or Radio Button or Checkbox
    document.addEventListener('click', (event) => {
      var target = event.target;

      // Match button, anchor, checkbox, or radio input
      if (target.matches('button, a, input[type="checkbox"], input[type="radio"]')) {
        trackEvent('click', {
          element: target.tagName,
          type: target.type || null,
          id: target.id || null,
          name: target.name || null,
          value: target.value || null,
          checked: typeof target.checked !== 'undefined' ? target.checked : null,
          classes: target.className || null,
          text: target.innerText || target.value || null,
          timestamp: Date.now()
        });
      }
    });

    // Track Scroll
    let lastScrollTop = 0;
    let lastTrackTime = 0;
    const scrollDecayRate = 2000;
    window.addEventListener('scroll', () => {
      const now = Date.now();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (Math.abs(scrollTop - lastScrollTop) > 100 && (now - lastTrackTime > scrollDecayRate)) {
        trackEvent('scroll', {
          position: scrollTop,
          timestamp: now
        });
        lastTrackTime = now;
        lastScrollTop = scrollTop;
      }
    });

    // Track Form Submission
    document.querySelectorAll('form').forEach((form) => {
      form.addEventListener('submit', (event) => {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
          data[key] = value;
        });
        trackEvent('form_submit', {
          formId: form.id,
          data: data,
          timestamp: Date.now()
        });
      });
    });

    // Send Tracked Details to
    // function trackEvent(eventType, eventData) {
    //   const payload = {
    //     eventType: eventType,
    //     eventData: eventData,
    //     userId: getUserId(),
    //     sessionId: getSessionId(),
    //     timestamp: eventData.timestamp,
    //     organisationId: '54'
    //   };

    //   console.log("Tracking eventData", eventData);
    //   console.log("Tracking Payload", payload);

    //   // Send data to the server asynchronously with proper content type
    //   navigator.sendBeacon(
    //     'https://app.getavid.ai/api/v1/track-data',
    //     new Blob([JSON.stringify(payload)], {type: 'application/json'})
    //   );
    // }

    function trackEvent(eventType, eventData) {
      console.log("Track It!")
      const payload = {
        eventType: eventType,
        eventData: eventData,
        userId: getUserId(),
        sessionId: getSessionId(),
        timestamp: eventData.timestamp,
        organisationId: '54',
        process_type: 'custom'
      };

      // Use fetch with POST method to send the payload, including credentials
      fetch('https://tracking.getavid.ai/v1/beacon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Specify content type as JSON
        },
        body: JSON.stringify(payload), // Send the payload as JSON
        credentials: 'omit'
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Network response was not ok');
      })
      .then(data => {
      })
      .catch(error => {
        console.error('Error:', error);
      });
    }

    // Check for existing user ID in cookies or localStorage
    function getUserId() {
      let userId = localStorage.getItem('user_id');
      if (!userId) {
        userId = generateUUID();
        localStorage.setItem('user_id', userId);
      }
      return userId;
    }

    // Check for existing session ID in sessionStorage
    function getSessionId() {
      let sessionId = sessionStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = generateUUID();
        sessionStorage.setItem('session_id', sessionId);
      }
      return sessionId;
    }

    // Simple UUID generator
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0,
          v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    // Track Page Views 
    function trackPageView() {
      var paramsObj = {};
      var queryParams = new URLSearchParams(window.location.search);
      queryParams.forEach((value, key) => {
        paramsObj[key] = value;
      });

      trackEvent('page_viewed', {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        queryParams: paramsObj
      });
    }

    // Track Form Submission using Input Type = SUBMIT
    function trackSubmissions() {
      let checkoutButtons = document.querySelectorAll('input[type="submit"]');

      checkoutButtons.forEach(function (btn) {
        btn.addEventListener("click", function (event) {

          var target = event.target;
          var form = target.form;

          // Extract all form data
          var formData = new FormData(form);
          var formFields = {};
          formData.forEach((value, key) => {
            formFields[key] = value;
          });

          var eventData = {
            element: target.tagName,
            type: target.type || null,
            id: target.id || null,
            name: target.name || null,
            value: target.value || null,
            checked: typeof target.checked !== 'undefined' ? target.checked : null,
            classes: target.className || null,
            text: target.innerText || target.value || null,
            page_url: window.location.href,
            user_agent: navigator.userAgent,
            formId: target.form?.id || null,
            data: formFields,
            timestamp: Date.now()
          };

          trackEvent('form_submit', eventData);
        });
      });
    }

