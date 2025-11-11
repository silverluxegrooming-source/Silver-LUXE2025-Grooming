// --- 
// SUPABASE CONFIGURATION
// ---
const supabaseUrl = 'https://mteuoedrcxzyfhjccwwc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10ZXVvZWRyY3h6eWZoamNjd3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTE2ODAsImV4cCI6MjA3NzkyNzY4MH0.CcSpUMX3jRk0UcmAyZ_INOYTx6ugawLGOHzSBOrG7Zc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);


// ---
// MAIN APP LISTENER
// ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- GLOBAL FUNCTIONS (Run on every page) ---
    checkAuthState(); 
    initHeaderScroll();
    initFadeIn();
    initMobileMenu();
    initCartSystem();
    initPlanSelection(); 
    
    // --- PAGE-SPECIFIC FUNCTIONS ---
    initBaSlider();
    initGalleryVideos();
    initPodcastVideos(); 
    handleAnchorLinks(); 
    initContactForm(); 
    initAuth(); 
    initPersonalizeSetupForm(); 
    initPersonalizeEditForm(); 
    initBookingForm(); 
    initConfirmationPage(); 
    initAccountPage(); 
    initScheduleForm(); 
    initPaymentPage(); 
});

/* ---
   FUNCTION: Saves selected plan to memory
--- */
function initPlanSelection() {
    const planButtons = document.querySelectorAll('.select-plan-btn');
    planButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const planId = btn.dataset.planId;
            if (planId) {
                localStorage.setItem('selectedPlan', planId);
            }
        });
    });
}

/* ---
   UPDATED FUNCTION: Payment Page (Calls Edge Function)
--- */
async function initPaymentPage() {
    const payButton = document.getElementById('pay-with-card-btn');
    if (!payButton) { return; } 

    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    const orderSummaryContainer = document.querySelector('.order-summary-items');
    const orderSubtotalEl = document.getElementById('summary-subtotal-price');

    let paymentPayload = {};

    if (bookingId) {
        // --- THIS IS A ONE-OFF BOOKING ---
        const cart = JSON.parse(localStorage.getItem('silverLuxeCart')) || {};
        const userEmail = localStorage.getItem('oneOffEmail') || ''; 

        if (Object.keys(cart).length === 0 || !userEmail) {
            orderSummaryContainer.innerHTML = '<p>Your booking session has expired. <a href="services.html" style="text-decoration: underline;">Please try again</a>.</p>';
            payButton.disabled = true;
            return;
        }
        
        let subtotal = 0;
        orderSummaryContainer.innerHTML = ''; // Clear "loading"
        Object.values(cart).forEach((item) => {
            subtotal += item.price * item.qty;
            orderSummaryContainer.innerHTML += `
                <div class="order-summary-item">
                    <span class="item-info">${item.name} (x${item.qty})</span>
                    <span class="item-price">₦${new Intl.NumberFormat('en-NG').format(item.price * item.qty)}</span>
                </div>
            `;
        });
        orderSubtotalEl.innerText = '₦' + new Intl.NumberFormat('en-NG').format(subtotal);

        // This is what we send to the Edge Function
        paymentPayload = { 
            bookingData: {
                id: bookingId,
                email: userEmail,
                order_items: cart
            }
        };

    } else {
        // --- THIS IS A MEMBERSHIP PAYMENT ---
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert("You must be signed in to pay. Redirecting...");
            window.location.href = 'signin.html';
            return;
        }

        const planId = localStorage.getItem('selectedPlan');
        if (!planId) {
            orderSummaryContainer.innerHTML = '<p>No membership plan selected. <a href="membership.html" style="text-decoration: underline;">Please select a plan</a>.</p>';
            payButton.disabled = true;
            return;
        }

        const plans = {
            "classic-plan": { name: "Classic Plan", price: 300000 },
            "executive-plan": { name: "Executive Plan", price: 525000 },
            "prestige-plan": { name: "Prestige Plan", price: 750000 },
            "black-card": { name: "Black Card", price: 20000000 }
        };
        const plan = plans[planId];
        orderSummaryContainer.innerHTML = `
            <div class="order-summary-item">
                <span class="item-info">${plan.name}</span>
                <span class="item-price">₦${new Intl.NumberFormat('en-NG').format(plan.price)}</span>
            </div>
        `;
        orderSubtotalEl.innerText = '₦' + new Intl.NumberFormat('en-NG').format(plan.price);

        paymentPayload = { 
            planId: planId, 
            email: user.email
        };
    }
        
    // Add the click listener for payment
    payButton.addEventListener('click', async () => {
        payButton.disabled = true;
        payButton.innerText = "Processing...";
        try {
            // Call our secure Edge Function
            const { data, error } = await supabaseClient.functions.invoke('create-payment-link', {
                body: JSON.stringify(paymentPayload)
            });
            if (error) throw error;
            window.location.href = data.authorization_url;
        } catch (error) {
            console.error("Error creating payment link: ", error);
            alert("Error: " + error.message);
            payButton.disabled = false;
            payButton.innerText = "Pay Now with Card";
        }
    });
}


/* ---
   FUNCTION: Check Auth State (Supabase)
--- */
async function checkAuthState() {
    const navAccount = document.querySelector('.nav-account');
    const navSignin = document.querySelector('.nav-signin');
    const navSignout = document.querySelector('.nav-signout');
    const desktopBookBtn = document.querySelector('.desktop-book-btn');
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        if (navAccount) navAccount.style.display = 'block';
        if (navSignin) navSignin.style.display = 'none';
        if (navSignout) navSignout.style.display = 'block';
        if (desktopBookBtn) {
            desktopBookBtn.innerHTML = 'Schedule Now';
            desktopBookBtn.href = 'schedule.html';
        }
        if (navSignout) {
            navSignout.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabaseClient.auth.signOut();
                window.location.href = 'index.html';
            });
        }
    } else {
        if (navAccount) navAccount.style.display = 'none';
        if (navSignin) navSignin.style.display = 'block';
        if (navSignout) navSignout.style.display = 'none';
        if (desktopBookBtn) {
            desktopBookBtn.innerHTML = 'Book Now';
            desktopBookBtn.href = 'bookings.html';
        }
    }
}


/* ---
   FUNCTION: Header Scroll
--- */
function initHeaderScroll() {
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        });
    }
}

/* ---
   FUNCTION: Fade-In Sections
--- */
function initFadeIn() {
    const sections = document.querySelectorAll('.section');
    if (sections.length > 0) {
        const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        sections.forEach(section => {
            observer.observe(section);
        });
    }
}

/* ---
   FUNCTION: Confirmation Page
--- */
function initConfirmationPage() {
    const countdownEl = document.getElementById('countdown-timer');
    if (!countdownEl) { return; }
    let timeLeft = 900; 
    const timerInterval = setInterval(() => {
        timeLeft--;
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        countdownEl.innerText = `${minutes}:${seconds}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('confirmation-title').innerText = "Confirmation Failed";
            document.getElementById('confirmation-text').innerText = "We could not confirm your payment. Please contact support.";
        }
    }, 1000);
    // SIMULATION
    setTimeout(() => {
        clearInterval(timerInterval); 
        document.querySelector('.loader-spinner').style.display = 'none';
        document.querySelector('.success-tick').style.display = 'flex';
        document.querySelector('.success-tick').classList.add('active');
        document.getElementById('confirmation-title').innerText = "Payment Successful!";
        document.getElementById('confirmation-text').innerText = "Your booking is confirmed. We are redirecting you to your account.";
        countdownEl.style.display = 'none';
        setTimeout(() => {
            window.location.href = 'account.html';
        }, 3000); 
    }, 10000); // 10-second demo
}

/* ---
   FUNCTION: Account Page (Supabase)
--- */
async function initAccountPage() {
    const welcomeName = document.getElementById('welcome-name');
    const profileDetails = document.querySelector('.profile-details');
    const scheduleForm = document.getElementById('schedule-form');
    const signOutBtnDesktop = document.getElementById('sign-out-btn-desktop');
    const bookingList = document.getElementById('booking-list'); 
    if (!welcomeName) { return; } 
    const signOut = async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    };
    if (signOutBtnDesktop) signOutBtnDesktop.addEventListener('click', signOut);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        const { data, error } = await supabaseClient
            .from('users') 
            .select('*')
            .eq('id', user.id)
            .single();
        if (error && error.code !== 'PGRST116') { 
            console.error('Error fetching user profile:', error.message);
            welcomeName.innerText = "Welcome, Member";
            profileDetails.innerHTML = `<p>Error loading profile. <a href="personalize-edit.html" style="text-decoration: underline;">Please try editing.</a>.</p>`;
        } else if (data) {
            welcomeName.innerText = `Welcome, ${data.gender || ''} ${data.name}`;
            profileDetails.innerHTML = `
                <img src="${data.profile_picture_url || 'https://via.placeholder.com/150'}" alt="Profile Picture" id="profile-pic-display">
                <div class="profile-detail-item"><span>Name</span> <span>${data.name || '...'}</span></div>
                <div class="profile-detail-item"><span>Email</span> <span>${data.email || '...'}</span></div>
                <div class="profile-detail-item"><span>Phone</span> <span>${data.phone || '...'}</span></div>
                <div class="profile-detail-item"><span>Beverage</span> <span>${data.fav_beverage || '...'}</span></div>
                <div class="profile-detail-item"><span>Artist</span> <span>${data.fav_artist || '...'}</span></div>
            `;
            if(scheduleForm) {
                scheduleForm.querySelector('#barber').value = data.preferred_barber || 'No Preference';
            }
        } else {
            welcomeName.innerText = "Welcome, Client";
            profileDetails.innerHTML = `<p>You have no profile data. <a href="personalize-setup.html" style="text-decoration: underline;">Complete your profile</a>.</p>`;
        }
        const { data: schedules, error: scheduleError } = await supabaseClient
            .from('schedules')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });
        if (scheduleError) {
            console.error("Error getting schedules: ", scheduleError.message);
        } else if (schedules && schedules.length > 0) {
            bookingList.innerHTML = ''; 
            schedules.forEach(booking => {
                const scheduleHtml = `
                    <div class="profile-detail-item">
                        <span>${booking.date} at ${booking.time}</span>
                        <span style="color: var(--color-gold);">${booking.status}</span>
                    </div>
                `;
                bookingList.innerHTML += scheduleHtml;
            });
        } else {
            bookingList.innerHTML = `<p>You have no upcoming sessions scheduled.</p>`;
        }
    } else {
        window.location.href = 'signin.html';
    }
}

/* ---
   FUNCTION: Schedule Form (Supabase)
--- */
async function initScheduleForm() {
    const scheduleForm = document.getElementById('schedule-form');
    if (!scheduleForm) { return; }
    scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = scheduleForm.querySelector('button[type="submit"]');
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert("You must be signed in to schedule.");
            return;
        }
        const formData = {
            date: scheduleForm.querySelector('#date').value,
            time: scheduleForm.querySelector('#time').value,
            notes: scheduleForm.querySelector('#requests') ? scheduleForm.querySelector('#requests').value : '',
            location: scheduleForm.querySelector('#location') ? scheduleForm.querySelector('#location').value : 'On File',
            user_id: user.id, 
            status: "Confirmed", 
        };
        submitButton.disabled = true;
        submitButton.innerText = 'Scheduling...';
        const { error } = await supabaseClient.from('schedules').insert(formData);
        if (error) {
            alert("Error: " + error.message);
            submitButton.disabled = false;
            submitButton.innerText = 'Schedule Session';
        } else {
            alert("Your session is scheduled!");
            submitButton.disabled = false;
            submitButton.innerText = 'Schedule Session';
            scheduleForm.reset();
            if(document.getElementById('booking-list')) {
                document.getElementById('booking-list').innerHTML = '<p>Your new session is saved. Refreshing...</p>';
                setTimeout(() => window.location.reload(), 1000);
            }
        }
    });
}

/* ---
   FUNCTION: ONE-OFF BOOKING FORM (Supabase)
--- */
async function initBookingForm() {
    const bookingForm = document.querySelector('.booking-form[action="payment.html"]'); 
    if (!bookingForm) { return; }
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = bookingForm.querySelector('button[type="submit"]');
        const cart = JSON.parse(localStorage.getItem('silverLuxeCart')) || {};
        if (Object.keys(cart).length === 0) {
            alert("Your cart is empty! Please add a service first.");
            return;
        }
        const formData = {
            name: bookingForm.querySelector('#name').value,
            phone: bookingForm.querySelector('#phone').value,
            email: bookingForm.querySelector('#email').value,
            gender: bookingForm.querySelector('#gender').value,
            location_type: bookingForm.querySelector('#location-type').value,
            address: bookingForm.querySelector('#location').value,
            date: bookingForm.querySelector('#date').value,
            time: bookingForm.querySelector('#time').value,
            notes: bookingForm.querySelector('#requests').value,
            order_items: cart, 
            status: "Pending Payment" 
        };

        // <-- FIX: Save the email for the payment page
        localStorage.setItem('oneOffEmail', formData.email); 

        submitButton.disabled = true;
        submitButton.innerText = 'Saving Booking...';
        const { data, error } = await supabaseClient.from('bookings').insert(formData).select().single();
        if (error) {
            console.error("Error saving booking: ", error);
            alert("Error: " + error.message);
            submitButton.disabled = false;
            submitButton.innerText = 'Confirm & Request Booking';
        } else {
            // We pass the new booking ID to the payment page
            window.location.href = `payment.html?bookingId=${data.id}`;
        }
    });
}


/* ---
   FUNCTION: PERSONALIZE SETUP (Supabase)
--- */
async function initPersonalizeSetupForm() {
    const personalizeForm = document.getElementById('personalize-form'); 
    if (!personalizeForm || window.location.pathname.includes('personalize-edit.html')) {
        return; // Only run on personalize-setup.html
    }
    const { data: { user } } = await supabaseClient.auth.getUser();
    const submitButton = personalizeForm.querySelector('button[type="submit"]');
    if (!user) {
        window.location.href = 'signin.html';
        return;
    }
    personalizeForm.querySelector('#name').value = user.user_metadata?.name || '';
    personalizeForm.querySelector('#email').value = user.email || '';
    submitButton.innerText = 'Save & Proceed to Payment'; 
    personalizeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            id: user.id, 
            name: personalizeForm.querySelector('#name').value,
            phone: personalizeForm.querySelector('#phone').value,
            email: personalizeForm.querySelector('#email').value, 
            gender: personalizeForm.querySelector('#gender').value,
            default_location_type: personalizeForm.querySelector('#location-type').value,
            default_address: personalizeForm.querySelector('#location').value,
            preferred_barber: personalizeForm.querySelector('#barber').value,
            fav_artist: personalizeForm.querySelector('#artist').value,
            fav_show: personalizeForm.querySelector('#tv-show').value,
            fav_beverage: personalizeForm.querySelector('#beverage').value,
            notes: personalizeForm.querySelector('#requests').value,
            created_at: new Date()
        };
        submitButton.disabled = true;
        submitButton.innerText = 'Saving...';
        const { error } = await supabaseClient.from('users').upsert(formData);
        if (error) {
            console.error("Error saving profile: ", error);
            alert("Error: " + error.message);
            submitButton.disabled = false;
            submitButton.innerText = 'Save & Proceed to Payment';
        } else {
            window.location.href = 'payment.html'; 
        }
    });
}

/* ---
   FUNCTION: PERSONALIZE EDIT (Supabase)
--- */
async function initPersonalizeEditForm() {
    const personalizeForm = document.getElementById('personalize-edit-form'); 
    if (!personalizeForm) { return; } 
    const { data: { user } } = await supabaseClient.auth.getUser();
    const submitButton = personalizeForm.querySelector('button[type="submit"]');
    const fileUpload = document.getElementById('profile-pic-upload');
    const picPreview = document.getElementById('profile-pic-preview');
    let fileToUpload = null;
    if (!user) {
        window.location.href = 'signin.html';
        return;
    }
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    if (data) {
        personalizeForm.querySelector('#name').value = data.name || '';
        personalizeForm.querySelector('#gender').value = data.gender || 'Mr.';
        personalizeForm.querySelector('#phone').value = data.phone || '';
        personalizeForm.querySelector('#email').value = data.email || user.email; 
        personalizeForm.querySelector('#location-type').value = data.default_location_type || 'home';
        personalizeForm.querySelector('#location').value = data.default_address || '';
        personalizeForm.querySelector('#barber').value = data.preferred_barber || 'any';
        personalizeForm.querySelector('#artist').value = data.fav_artist || '';
        personalizeForm.querySelector('#tv-show').value = data.fav_show || '';
        personalizeForm.querySelector('#beverage').value = data.fav_beverage || 'water';
        personalizeForm.querySelector('#requests').value = data.notes || '';
        if (data.profile_picture_url) {
            picPreview.src = data.profile_picture_url;
        }
    } else {
        personalizeForm.querySelector('#name').value = user.user_metadata?.name || '';
        personalizeForm.querySelector('#email').value = user.email || '';
    }
    fileUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            fileToUpload = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                picPreview.src = event.target.result;
            }
            reader.readAsDataURL(fileToUpload);
        }
    });
    personalizeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.innerText = 'Saving...';
        let profilePictureUrl = data?.profile_picture_url; 
        if (fileToUpload) {
            submitButton.innerText = 'Uploading Image...';
            const filePath = `profile-images/${user.id}/${fileToUpload.name}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('avatars') 
                .upload(filePath, fileToUpload, { upsert: true });
            if (uploadError) {
                console.error("Upload failed: ", uploadError);
                alert("Error uploading image: " + uploadError.message);
                submitButton.disabled = false;
                submitButton.innerText = 'Save Changes';
                return;
            }
            const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
            profilePictureUrl = urlData.publicUrl;
        }
        const formData = {
            id: user.id,
            name: personalizeForm.querySelector('#name').value,
            phone: personalizeForm.querySelector('#phone').value,
            email: personalizeForm.querySelector('#email').value, 
            gender: personalizeForm.querySelector('#gender').value,
            default_location_type: personalizeForm.querySelector('#location-type').value,
            default_address: personalizeForm.querySelector('#location').value,
            preferred_barber: personalizeForm.querySelector('#barber').value,
            fav_artist: personalizeForm.querySelector('#artist').value,
            fav_show: personalizeForm.querySelector('#tv-show').value,
            fav_beverage: personalizeForm.querySelector('#beverage').value,
            notes: personalizeForm.querySelector('#requests').value,
            profile_picture_url: profilePictureUrl,
            updated_at: new Date()
        };
        const { error: updateError } = await supabaseClient.from('users').upsert(formData);
        if (updateError) {
            alert("Error: " + updateError.message);
            submitButton.disabled = false;
            submitButton.innerText = 'Save Changes';
        } else {
            window.location.href = 'account.html'; // Go back to account
        }
    });
}


/* ---
   UPDATED FUNCTION: AUTH (Sign In Page) - Supabase
--- */
async function initAuth() {
    const authContainer = document.querySelector('.auth-container');
    if (!authContainer) { return; }
    const authForm = document.querySelector('.auth-form');
    const googleBtn = document.querySelector('.social-btn.google');
    const appleBtn = document.querySelector('.social-btn.apple');
    const facebookBtn = document.querySelector('.social-btn.facebook');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');
    const submitButton = authForm.querySelector('button[type="submit"]');
    showSignupLink.addEventListener('click', () => {
        authContainer.dataset.mode = 'signup';
        loginView.style.display = 'none';
        signupView.style.display = 'block';
        showSignupLink.style.display = 'none';
        showLoginLink.style.display = 'block';
        submitButton.innerText = 'Create Account';
    });
    showLoginLink.addEventListener('click', () => {
        authContainer.dataset.mode = 'login';
        loginView.style.display = 'block';
        signupView.style.display = 'none';
        showSignupLink.style.display = 'block';
        showLoginLink.style.display = 'none';
        submitButton.innerText = 'Login';
    });
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authForm.querySelector('#email').value;
        const password = authForm.querySelector('#password').value;
        const mode = authContainer.dataset.mode;
        submitButton.disabled = true;
        submitButton.innerText = 'Processing...';
        if (mode === 'signup') {
            const { error } = await supabaseClient.auth.signUp({ email, password });
            if (error) {
                alert(error.message);
                submitButton.disabled = false;
                submitButton.innerText = 'Create Account';
            } else {
                const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (signInError) {
                    alert(signInError.message);
                } else {
                    window.location.href = 'personalize-setup.html'; 
                }
            }
        } else {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                alert(error.message);
                submitButton.disabled = false;
                submitButton.innerText = 'Login';
            } else {
                const { data: { user } } = await supabaseClient.auth.getUser();
                const { data, error: profileError } = await supabaseClient.from('users').select('*').eq('id', user.id).single();
                if (data) {
                    window.location.href = 'account.html'; 
                } else {
                    window.location.href = 'personalize-setup.html'; 
                }
            }
        }
    });
    
    // Social Logins
    const handleSocialLogin = async (provider) => {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                // <-- FIX: Send new social users to setup
                redirectTo: `${window.location.origin}/personalize-setup.html`
            }
        });
        if (error) {
            alert("Error: " + error.message);
        }
    };

    if (googleBtn) {
        googleBtn.addEventListener('click', () => handleSocialLogin('google'));
    }
    if (appleBtn) {
        appleBtn.addEventListener('click', () => handleSocialLogin('apple'));
    }
    if (facebookBtn) {
        facebookBtn.addEventListener('click', () => handleSocialLogin('facebook'));
    }
}


/* ---
   FUNCTION: Handle Anchor Links on Load (FIX FOR SCROLLING)
--- */
function handleAnchorLinks() {
    if (window.location.hash) {
        const elementId = window.location.hash;
        try {
            const element = document.querySelector(elementId);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 100); 
            }
        } catch (e) {
            console.error("Could not scroll to anchor: " + e);
        }
    }
}


/* ---
   FUNCTION: Before/After Slider
--- */
function initBaSlider() {
    const slider = document.querySelector('.ba-slider');
    if (!slider) { return; }
    const range = slider.querySelector('.ba-slider-range');
    const imageBefore = slider.querySelector('.ba-image-before');
    const handle = slider.querySelector('.ba-slider-handle');
    if (range && imageBefore && handle) {
        range.addEventListener('input', (e) => {
            let value = e.target.value;
            imageBefore.style.width = value + '%';
            handle.style.left = value + '%';
        });
    }
}

/* ---
   FUNCTION: Gallery Video Hover
--- */
function initGalleryVideos() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    if (galleryItems.length === 0) { return; }
    galleryItems.forEach(item => {
        const video = item.querySelector('video');
        if (video) {
            item.addEventListener('mouseenter', () => {
                video.play();
            });
            item.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });
        }
    });
}

/* ---
   FUNCTION: MOBILE MENU TOGGLE
--- */
function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navUL = document.querySelector('.slide-out-menu');
    const closeBtn = document.querySelector('.nav-close-btn');
    if (menuToggle && navUL && closeBtn) {
        menuToggle.addEventListener('click', () => {
            navUL.classList.add('nav-active');
        });
        closeBtn.addEventListener('click', () => {
            navUL.classList.remove('nav-active');
        });
    }
}

/* ---
   FUNCTION: Cart System
--- */
function initCartSystem() {
    const isAccountPage = document.getElementById('account-hero');
    if (isAccountPage) {
        return; // Do not run the cart system on the account page
    }
    const cartIcon = document.querySelector('.cart-icon');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    const cartCloseBtn = document.querySelector('.cart-close-btn');
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartSubtotalEl = document.getElementById('cart-subtotal-price');
    const cartCountEl = document.querySelector('.cart-count');
    const checkoutBtn = document.getElementById('checkout-btn');
    const orderSummaryContainer = document.querySelector('.order-summary-items');
    const orderSubtotalEl = document.getElementById('summary-subtotal-price');
    if (!cartIcon && !orderSummaryContainer) { return; }
    let cart = JSON.parse(localStorage.getItem('silverLuxeCart')) || {};
    function saveCart() {
        localStorage.setItem('silverLuxeCart', JSON.stringify(cart));
    }
    function formatPrice(price) {
        return '₦' + new Intl.NumberFormat('en-NG').format(price);
    }
    function updateCartUI() {
        if (Object.keys(cart).length === 0) {
            if (cartItemsContainer) {
                cartItemsContainer.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
            }
            if (orderSummaryContainer) {
                orderSummaryContainer.innerHTML = '<p class="cart-empty">Your cart is empty. <a href="services.html" style="text-decoration: underline;">Add services</a>.</p>';
            }
        } else {
            if (cartItemsContainer) {
                cartItemsContainer.innerHTML = '';
            }
            if (orderSummaryContainer) {
                orderSummaryContainer.innerHTML = '';
            }
            Object.values(cart).forEach(item => {
                const itemTotalPrice = item.price * item.qty;
                if (cartItemsContainer) {
                    const cartItemHTML = `
                        <div class="cart-item" data-id="${item.id}">
                            <div class="cart-item-info">
                                <h4>${item.name}</h4>
                                <span class="item-price">${formatPrice(item.price)}</span>
                            </div>
                            <div class="cart-item-quantity">
                                <button class="qty-btn" data-action="decrease">-</button>
                                <span>${item.qty}</span>
                                <button class="qty-btn" data-action="increase">+</button>
                            </div>
                            <div class="cart-item-remove">
                                <button class="remove-btn"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                    cartItemsContainer.innerHTML += cartItemHTML;
                }
                if (orderSummaryContainer) {
                    const summaryItemHTML = `
                        <div class="order-summary-item">
                            <span class="item-info">${item.name} <span class="item-qty">(x${item.qty})</span></span>
                            <span class="item-price">${formatPrice(itemTotalPrice)}</span>
                        </div>
                    `;
                    orderSummaryContainer.innerHTML += summaryItemHTML;
                }
            });
        }
        let subtotal = 0;
        let totalItems = 0;
        Object.values(cart).forEach(item => {
            subtotal += item.price * item.qty;
            totalItems += item.qty;
        });
        if(cartSubtotalEl) {
            cartSubtotalEl.innerText = formatPrice(subtotal);
        }
        if(cartCountEl) {
            cartCountEl.innerText = totalItems;
        }
        if (orderSubtotalEl) {
            orderSubtotalEl.innerText = formatPrice(subtotal);
        }
        saveCart();
    }
    function toggleCart() {
        if(cartSidebar) {
            cartSidebar.classList.toggle('cart-active');
            cartOverlay.classList.toggle('cart-active');
        }
    }
    if(cartIcon) {
        cartIcon.addEventListener('click', toggleCart);
    }
    if(cartOverlay) {
        cartOverlay.addEventListener('click', toggleCart);
    }
    if(cartCloseBtn) {
        cartCloseBtn.addEventListener('click', toggleCart);
    }
    if(checkoutBtn) {
        checkoutBtn.addEventListener('click', (e) => {
            if (Object.keys(cart).length === 0) {
                e.preventDefault();
                alert("Your cart is empty. Please add a service first.");
            } else {
                e.preventDefault(); 
                window.location.href = 'bookings.html#booking-form-section'; 
            }
        });
    }
    addToCartButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.booking-service-item');
            const id = item.dataset.id;
            const name = item.dataset.name;
            const price = Number(item.dataset.price);
            if (cart[id]) {
                cart[id].qty++;
            } else {
                cart[id] = { id, name, price, qty: 1 };
            }
            updateCartUI();
        });
    });
    if(cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            const itemEl = target.closest('.cart-item');
            if (!itemEl) return;
            const id = itemEl.dataset.id;
            if (target.classList.contains('qty-btn')) {
                const action = target.dataset.action;
                if (action === 'increase') {
                    cart[id].qty++;
                } else if (action === 'decrease') {
                    cart[M.D].qty--;
                    if (cart[id].qty === 0) {
                        delete cart[id];
                    }
                }
            }
            if (target.closest('.remove-btn')) {
                delete cart[id];
            }
            updateCartUI();
        });
    }
    updateCartUI(); 
}

/* ---
   PAGE: PODCAST (Video Grid)
--- */
function initPodcastVideos() {
    const podcastItems = document.querySelectorAll('.podcast-item');
    if (podcastItems.length === 0) { return; }
    podcastItems.forEach(item => {
        const video = item.querySelector('video');
        if (video) {
            item.addEventListener('mouseenter', () => {
                video.play();
            });
            item.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0; 
            });
        }
    });
}

/* ---
   FUNCTION: CONTACT FORM (Supabase)
--- */
async function initContactForm() {
    const contactForm = document.querySelector('.contact-form');
    if (!contactForm) { return; }
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const name = contactForm.querySelector('#name').value;
        const email = contactForm.querySelector('#email').value;
        const phone = contactForm.querySelector('#phone').value;
        const subject = contactForm.querySelector('#subject').value;
        const message = contactForm.querySelector('#message').value;
        const submitButton = contactForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerText = 'Sending...';

        // Save to Supabase!
        const { error } = await supabaseClient.from('messages').insert({
            name: name,
            email: email,
            phone: phone,
            subject: subject,
            message: message
        });

        if (error) {
            console.error("Error adding document: ", error);
            alert('Error: ' + error.message);
            submitButton.disabled = false;
            submitButton.innerText = 'Send Message';
        } else {
            contactForm.innerHTML = `<h3 style="color: var(--color-gold); text-align: center;">Thank You!</h3><p style="text-align: center;">Your message has been sent. Our team will contact you shortly.</p>`;
        }
    });
}