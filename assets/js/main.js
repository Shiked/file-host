document.addEventListener('DOMContentLoaded', () => {
  // --- Globals / Configuration ---
  const partialsBaseUrl = '/_includes/'; 
  const filesManifestUrl = '/files.json'; 
  let allFilesData = []; 
  let lightGalleryInstances = {}; 
  let resultsContainerElement; // Store reference to results container

  // --- Initial Theme Application ---
  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }

  // --- Client-Side Includes for Partials ---
  async function loadPartial(elementId, filePath, callback) {
    const placeholder = document.getElementById(elementId);
    if (placeholder) {
      try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
        const html = await response.text();
        placeholder.innerHTML = html;
        if (callback) callback();
      } catch (error) {
        console.error('Error loading partial:', error);
        placeholder.innerHTML = `<p style="color:red;">Error loading content for ${elementId}.</p>`;
      }
    }
  }

  // --- Load Files Manifest & Display Featured Items ---
  async function loadFilesManifestAndDisplayFeatured() {
    resultsContainerElement = document.getElementById('results-container'); // Get results container once
    if (!resultsContainerElement) {
        console.warn('Results container (#results-container) not found on this page. Cannot display files.');
        return;
    }

    try {
      const response = await fetch(filesManifestUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      allFilesData = await response.json();
      console.log('Files manifest loaded:', allFilesData.length, 'files');

      // ** NEW: Filter for featured items and render them **
      const featuredItems = allFilesData.filter(file => file.display === true);
      if (featuredItems.length > 0) {
        renderResults(featuredItems, resultsContainerElement, "Featured Items");
      } else {
        resultsContainerElement.innerHTML = "<p>No featured items to display. Use the search bar to find files.</p>";
      }
    } catch (error) {
      console.error("Could not load files manifest:", error);
      if (resultsContainerElement) {
        resultsContainerElement.innerHTML = '<p style="color:red;">Error: Could not load file data. Please try again later.</p>';
      }
    }
  }

  // --- Initialize Search Functionality ---
  function initSearch() {
    const searchInput = document.getElementById('searchInput'); 
    // resultsContainerElement is already defined globally by loadFilesManifestAndDisplayFeatured

    if (!searchInput) {
      console.warn('Search input not found.');
      return;
    }
    if (!resultsContainerElement) {
        // This case should ideally be handled if a page doesn't have a results container
        // but has a search input.
        console.warn('Search input found, but no results container. Search will not display results.');
        return; 
    }

    searchInput.addEventListener('input', (event) => {
      const query = event.target.value.toLowerCase().trim();
      
      if (allFilesData.length === 0 && query.length > 0) {
        resultsContainerElement.innerHTML = '<p>Searching... (File data still loading or unavailable)</p>';
        return;
      }
      
      if (query.length === 0) {
        // ** MODIFIED: When search is cleared, re-display featured items **
        const featuredItems = allFilesData.filter(file => file.display === true);
        if (featuredItems.length > 0) {
            renderResults(featuredItems, resultsContainerElement, "Featured Items");
        } else {
            resultsContainerElement.innerHTML = '<p>Type in the search box to find files.</p>';
        }
        return;
      }

      if (query.length < 2 && query.length > 0) { 
        resultsContainerElement.innerHTML = '<p>Please enter at least 2 characters to search.</p>';
        return;
      }

      const filteredFiles = allFilesData.filter(file => {
        const nameMatch = file.name.toLowerCase().includes(query);
        const tagsMatch = file.tags.some(tag => tag.toLowerCase().includes(query));
        const pathMatch = file.path.toLowerCase().includes(query);
        const descriptionMatch = file.description ? file.description.toLowerCase().includes(query) : false;
        return nameMatch || tagsMatch || pathMatch || descriptionMatch;
      });
      renderResults(filteredFiles, resultsContainerElement, `Search Results for "${query}"`);
    });
  }

  // --- Render Results (Featured or Search) ---
  // Added an optional title parameter for the results section
  function renderResults(filesToRender, containerElement, resultsTitle = "Results") {
    if (!containerElement) {
        console.error("Render target container not found!");
        return;
    }
    containerElement.innerHTML = ''; // Clear previous results

    const titleElement = document.createElement('h2');
    titleElement.className = 'results-title'; // For potential styling
    titleElement.textContent = resultsTitle;
    containerElement.appendChild(titleElement);

    if (filesToRender.length === 0) {
      const noResultsMessage = document.createElement('p');
      noResultsMessage.textContent = resultsTitle.startsWith("Search Results") ? 'No files found matching your criteria.' : 'No items to display.';
      containerElement.appendChild(noResultsMessage);
      return;
    }

    const galleryDiv = document.createElement('div');
    galleryDiv.className = 'gallery lightgallery-container'; 
    galleryDiv.id = 'dynamic-gallery-' + Date.now(); 

    filesToRender.forEach(file => {
      const card = document.createElement('div');
      card.className = 'card';

      let mediaElementHtml = '';
      const siteBaseUrl = 'https://file.shikes.space'; 
      const fileFullUrl = siteBaseUrl + '/' + file.path;
      const fileRelativeUrl = '/' + file.path;

      if (file.type === 'image') {
        mediaElementHtml = `
          <a href="${fileRelativeUrl}" class="gallery-item" data-lg-id="${file.id}" data-src="${fileRelativeUrl}" data-sub-html="<h4>${file.name}</h4><p>${file.description || ''}</p>">
            <div class="image-container">
              <img src="${fileRelativeUrl}" alt="${file.description || file.name}" loading="lazy">
            </div>
          </a>`;
      } else if (file.type === 'sound') {
        mediaElementHtml = `
          <audio controls preload="metadata">
            <source src="${fileRelativeUrl}" type="audio/${file.format === 'mp3' ? 'mpeg' : file.format}">
            Your browser does not support the audio element.
          </audio>`;
      } else if (file.type === 'video') {
        mediaElementHtml = `
          <video controls preload="metadata">
            <source src="${fileRelativeUrl}" type="video/${file.format}">
            Your browser does not support the video tag.
          </video>`;
      }

      card.innerHTML = `
        ${mediaElementHtml}
        <div class="filename">${file.name}</div>
        <button class="copy-btn" data-url="${fileFullUrl}" onclick="copyLink(event, this)">🔗 Copy link</button>
      `;
      galleryDiv.appendChild(card);
    });

    containerElement.appendChild(galleryDiv);

    if (typeof lightGallery === 'function' && galleryDiv.querySelectorAll('.gallery-item').length > 0) {
        if (lightGalleryInstances[galleryDiv.id]) {
            lightGalleryInstances[galleryDiv.id].destroy(); 
        }
        lightGalleryInstances[galleryDiv.id] = lightGallery(galleryDiv, {
            plugins: (typeof lgZoom !== 'undefined' && typeof lgThumbnail !== 'undefined') ? [lgZoom, lgThumbnail] : [],
            selector: '.gallery-item', 
            licenseKey: '0000-0000-000-0000', 
            mobileSettings: { controls: true, showCloseIcon: true, download: true },
            download: true
        });
    }
  }

  // --- Load Header and then initialize dependent functionalities ---
  loadPartial('page-header-placeholder', partialsBaseUrl + '_header.html', () => {
    const pageTitleH1 = document.getElementById('pageTitleH1');
    const pageTitleFromBody = document.body.dataset.pageTitle;
    if (pageTitleH1 && pageTitleFromBody) pageTitleH1.textContent = pageTitleFromBody;
    
    populateBreadcrumbs();
    
    const loadedToggleThemeButton = document.getElementById('toggleTheme');
    if (loadedToggleThemeButton) {
      if (document.body.classList.contains('dark-theme')) loadedToggleThemeButton.textContent = '☀️';
      else loadedToggleThemeButton.textContent = '🌓';
      loadedToggleThemeButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        let theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        loadedToggleThemeButton.textContent = theme === 'dark' ? '☀️' : '🌓';
        localStorage.setItem('theme', theme);
      });
    }
    // Initialize search after header (containing search input) is loaded
    initSearch(); 
  });

  // --- Load Other Partials ---
  loadPartial('main-nav-placeholder', partialsBaseUrl + '_nav.html');
  loadPartial('sitetree-placeholder', partialsBaseUrl + '_sitetree.html', () => {
    initTree('fileTree'); 
  });

  // --- Breadcrumbs Population ---
  function populateBreadcrumbs() {
    const breadcrumbsContainer = document.getElementById('breadcrumbs');
    const breadcrumbsDataAttr = document.body.dataset.breadcrumbs;
    if (breadcrumbsContainer && breadcrumbsDataAttr) {
      try {
        const breadcrumbsArray = JSON.parse(breadcrumbsDataAttr);
        breadcrumbsContainer.innerHTML = breadcrumbsArray.map((crumb, index) => 
          index === breadcrumbsArray.length - 1 
          ? `<li class="breadcrumb-item active" aria-current="page">${crumb.name}</li>`
          : `<li class="breadcrumb-item"><a href="${crumb.url}">${crumb.name}</a></li>`
        ).join('');
      } catch (e) { console.error("Error parsing breadcrumbs data:", e); }
    }
  }
  
  // --- Site Tree Functionality ---
  function initTree(treeId) {
    const tree = document.getElementById(treeId);
    if (!tree) return;
    tree.querySelectorAll('li.folder').forEach(folderLi => {
      const ulSubMenu = folderLi.querySelector('ul');
      if (ulSubMenu) {
        ulSubMenu.style.display = 'none'; 
        folderLi.style.cursor = 'pointer';
        folderLi.addEventListener('click', function(event) {
          if (event.target.tagName === 'A' || event.target.closest('a')) return;
          event.stopPropagation(); 
          ulSubMenu.style.display = ulSubMenu.style.display === 'block' ? 'none' : 'block';
        });
      }
    });
  }
  
  // --- Copy Link Functionality ---
  window.copyLink = function(event, buttonElement) {
    event.preventDefault(); event.stopPropagation(); 
    const urlToCopy = buttonElement.dataset.url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(urlToCopy).then(() => {
        const originalText = buttonElement.textContent;
        buttonElement.textContent = 'Copied!';
        setTimeout(() => { buttonElement.textContent = originalText; }, 2000);
      }).catch(err => fallbackCopyTextToClipboard(urlToCopy, buttonElement));
    } else {
      fallbackCopyTextToClipboard(urlToCopy, buttonElement);
    }
  };
  function fallbackCopyTextToClipboard(text, buttonElement) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    Object.assign(textArea.style, { position: "fixed", opacity: 0 });
    document.body.appendChild(textArea);
    textArea.focus(); textArea.select();
    try {
      const successful = document.execCommand('copy');
      const originalText = buttonElement.textContent;
      buttonElement.textContent = successful ? 'Copied!' : 'Copy Failed';
      setTimeout(() => { buttonElement.textContent = originalText; }, 2000);
    } catch (err) { /* Handle error */ }
    document.body.removeChild(textArea);
  }

  // --- Load the files manifest and display featured items ---
  loadFilesManifestAndDisplayFeatured(); 

}); // End DOMContentLoaded