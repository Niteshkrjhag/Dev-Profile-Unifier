let currentData = null;

document.addEventListener('DOMContentLoaded', () => {
    // Load default data on start
    loadData('data_nitesh_only.json');

    // Add event listener for search box
    const searchBox = document.getElementById('search-box');
    searchBox.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        renderData(searchTerm);
    });
});

async function loadData(filename) {
    // Update button states
    document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
    
    if (filename === 'data_nitesh_only.json') {
        document.getElementById('btn-nitesh-only').classList.add('active');
    } else if (filename === 'data_nitesh_handle.json') {
        document.getElementById('btn-nitesh-handle').classList.add('active');
    } else {
        document.getElementById('btn-specific-handles').classList.add('active');
    }

    const errorBanner = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultsContainer = document.getElementById('results-container');
    
    errorBanner.style.display = 'none';
    resultsContainer.style.opacity = '0.3';
    loadingSpinner.style.display = 'flex';

    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}: ${response.statusText}`);
        }
        
        currentData = await response.json();
        
        // Reset search box
        document.getElementById('search-box').value = '';
        renderData('');
        
    } catch (err) {
        console.error(err);
        errorBanner.textContent = `Error loading data. Make sure you are running a local server (e.g. python3 -m http.server). Details: ${err.message}`;
        errorBanner.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
        resultsContainer.style.opacity = '1';
    }
}

function renderData(searchTerm) {
    if (!currentData) return;

    // Helper to safely format JSON and highlight search term
    const formatAndHighlight = (obj, term) => {
        if (!obj) return 'No data';
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

    // GitHub
    const ghName = currentData.github?.search_by_name;
    const ghHandle = currentData.github?.fetch_by_handle;
    document.getElementById('gh-name').innerHTML = formatAndHighlight(ghName, searchTerm);
    document.getElementById('gh-handle').innerHTML = formatAndHighlight(ghHandle, searchTerm);
    
    // Stack Overflow
    const soName = currentData.stackexchange?.search_by_name;
    const soHandle = currentData.stackexchange?.search_by_handle;
    document.getElementById('so-name').innerHTML = formatAndHighlight(soName, searchTerm);
    document.getElementById('so-handle').innerHTML = formatAndHighlight(soHandle, searchTerm);
    
    // dev.to
    const devtoHandle = currentData.devto?.fetch_by_handle;
    document.getElementById('devto-handle').innerHTML = formatAndHighlight(devtoHandle, searchTerm);
    
    // Hacker News
    const hnHandle = currentData.hackernews?.fetch_by_handle;
    document.getElementById('hn-handle').innerHTML = formatAndHighlight(hnHandle, searchTerm);
}
