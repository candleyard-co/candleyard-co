
    (function() {
        // Immediately set the loaded flag to prevent duplicate execution
        if (window.avidaiWidgetsLoaded) {
            console.log("AvidAI Widgets Script already loaded, skipping execution");
            return;
        }
        
        // Mark as loaded immediately to prevent race conditions
        window.avidaiWidgetsLoaded = true;
        
        // Additional check: Look for existing script tags (excluding the current one)
        const existingScripts = document.querySelectorAll('script[src*="avidai-widgets.js"]');
        if (existingScripts.length > 1) {
            console.log("Multiple AvidAI Widgets script tags detected, skipping execution");
            return;
        }
        
        console.log("AvidAI Widgets Script loading...");
        
        activateAvid();
        console.log("AvidAI Widgets Script Tag Loaded!");
    })();

    function activateAvid(){
        const script = document.createElement("script");
        script.src = 'https://code.jquery.com/jquery-3.7.0.min.js';
        script.type = 'text/javascript';
        script.addEventListener('load', () => {
            console.log(`jQuery ${$.fn.jquery} has been loaded successfully!`);
            countryCodesJS()
            loadCookiesJS()
        });
        document.head.appendChild(script);
    }

    function countryCodesJS(){
        const script = document.createElement("script");
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/intlTelInput.min.js';
        script.type = 'text/javascript';
        script.addEventListener('load', () => {
        });
        document.head.appendChild(script);
    }

    function checkIfHomepage(){
        // Commented Home Page Check Because We need to Display Widget on All Pages
        // return window.location.pathname === "/"
        return true;
    }

    function loadCookiesJS(){
        const script = document.createElement("script");
        script.src = 'https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/dist/js.cookie.min.js';
        script.type = 'text/javascript';
        script.addEventListener('load', () => {
            if(checkIfHomepage() && (typeof Cookies.get('avid_form_submitted') === "undefined") && (typeof Cookies.get('avid_site_mismatch') === "undefined" || (typeof Cookies.get('avid_site_mismatch') !== "undefined" && Cookies.get('avid_site_mismatch') == 'false'))) {
                loadWidget();
            }
            showDiscountOnCardSlider();

        });
        document.head.appendChild(script);
    }

    function loadWidget(){
        var bearerToken = "c978e5b0-9443-45fe-be62-5b9fd41c4fab";
        $.ajax({
            url: 'https://app.getavid.ai/api/v1/widget',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + bearerToken
            },
            data: {
                store_url: "b70226-09.myshopify.com",
                widget_id: Cookies.get('loaded_widget_id'),
                site_url: $(location).attr('href')
            },
            success: function(response) {
                $('body').append(response);
                Cookies.set('loaded_widget_id', $('.widget-loaded').data('widget-id'), { expires: 100 });
                if ((typeof response.data !== "undefined") && response.data.hasOwnProperty('avid_site_mismatch')) {
                    Cookies.set('avid_site_mismatch', response.data.avid_site_mismatch, { expires: 100 });
                }
                // loadCountryFlags();
            },
            error: function(error) {
                console.error("Error:", error);
            }
        });
    }

    function showDiscountOnCardSlider(){
        var discountCode = Cookies.get('discount_code');
        var discountAmount = Cookies.get('discount_amount');
        if(discountCode && discountAmount){
            var avidAmountFormatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });


            var discountText = "<p class=\"avid-discount-code\">Discount applied at checkout: "+avidAmountFormatter.format(discountAmount)+"</p>";

            $(".cart-drawer__footer").append(discountText);
            $(".cart-notification__links").prepend(discountText);
            $(".cart__blocks").prepend(discountText);
        }
    }

    function loadCountryFlags() {
      var input = document.querySelector("#phone-number");
      var iti = intlTelInput(input, {
        initialCountry: "auto",
        preferredCountries: ['us', 'gb', 'ca', 'in'],
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
        geoIpLookup: function(callback) {
          $.get("https://ipapi.co/json", function(data) {
            callback(data.country_code);
          }).fail(function() {
            callback("us");
          });
        },
        loadUtils: function() {
          return import("/intl-tel-input/js/utils.js?1733756310855");
        }
      });

      $("#phone-number").on("countrychange", function(e, countryDetails) {
        var phoneNumber = iti.getNumber();
        var isValid = iti.isValidNumber();
        var countryData = iti.getSelectedCountryData();
        var countryCode = countryData.dialCode;
        var countryISOCode = countryData.iso2;

        $('#country-code-txt').val('+'+ countryCode);
        $('#country-iso-code-txt').val(countryISOCode);
      });
    }

