let currentData = null;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const submitBtn = document.getElementById('submit-btn');
    const searchBox = document.getElementById('search-box');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const requestBody = {
            name: formData.get('name'),
            email: formData.get('email'),
            handle: formData.get('handle'),
            specific_handles: {
                github: formData.get('gh'),
                stackoverflow: formData.get('so'),
                devto: formData.get('devto'),
                hackernews: formData.get('hn')
            }
        };

        // Clean up empty strings
        for (const key in requestBody.specific_handles) {
            if (!requestBody.specific_handles[key]) {
                delete requestBody.specific_handles[key];
            }
        }

        await fetchProfiles(requestBody);
    });

    searchBox.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        renderData(searchTerm);
    });
});

async function fetchProfiles(requestBody) {
    const submitBtn = document.getElementById('submit-btn');
    const errorBanner = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultsContainer = document.getElementById('results-container');
    
    submitBtn.disabled = true;
    errorBanner.style.display = 'none';
    resultsContainer.style.opacity = '0.3';
    loadingSpinner.style.display = 'flex';

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Server error: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // Cache data globally for the sub-text search highlighting
        currentData = responseData;
        
        // Reset sub-text search box
        document.getElementById('search-box').value = '';
        renderData('');
        
    } catch (err) {
        console.error(err);
        errorBanner.textContent = err.message;
        errorBanner.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        loadingSpinner.style.display = 'none';
        resultsContainer.style.opacity = '1';
    }
}

function renderData(searchTerm) {
    if (!currentData || !currentData.data) return;

    // Helper to safely format JSON and highlight search term
    const formatAndHighlight = (obj, term) => {
        if (!obj || (Array.isArray(obj) && obj.length === 0) || (typeof obj === 'object' && Object.keys(obj).length === 0)) {
            return 'No data found.';
        }
        
        let str = JSON.stringify(obj, null, 2);
        
        // Escape HTML
        str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Highlight term
        if (term) {
            const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${safeTerm})`, 'gi');
            str = str.replace(regex, '<span class="highlight">$1</span>');
        }
        return str;
    };

    // Render each platform card data
    document.getElementById('gh-data').innerHTML = formatAndHighlight(currentData.data.github, searchTerm);
    document.getElementById('so-data').innerHTML = formatAndHighlight(currentData.data.stackoverflow, searchTerm);
    document.getElementById('devto-data').innerHTML = formatAndHighlight(currentData.data.devto, searchTerm);
    document.getElementById('hn-data').innerHTML = formatAndHighlight(currentData.data.hackernews, searchTerm);
    
    // Render discovery metadata
    document.getElementById('meta-data').innerHTML = formatAndHighlight(currentData.metadata, searchTerm);
}
