const imgElement = document.getElementById('display-image');
const btnElement = document.getElementById('refresh-btn');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const copyBtn = document.getElementById('copy-btn');
const scaleBtn = document.getElementById('scale-btn');

// Stats elements
const counterElement = document.getElementById('counter');
const statsBtn = document.getElementById('stats-btn');
const statsPanel = document.getElementById('stats-panel');
const statReq = document.getElementById('stat-req');
const statDead = document.getElementById('stat-dead');
const statRate = document.getElementById('stat-rate');

// Menu elements
const menuBtn = document.getElementById('menu-btn');
const settingsPanel = document.getElementById('settings-panel');
const serviceBtns = document.querySelectorAll('.pill-btn');
const formatBtns = document.querySelectorAll('.format-btn');
const imgurOptionsGroup = document.getElementById('imgur-options');

let totalImagesFound = parseInt(localStorage.getItem('imgurRouletteCounter')) || 0;
counterElement.textContent = totalImagesFound;
let seenIds = new Set(JSON.parse(localStorage.getItem('imgurRouletteSeen')) || []);

let reqCount = 0;
let deadCount = 0;

let imageHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 10; 
let isScaled = false; 

// Configuration trackers
let currentService = 'imgur';
let useImgur7Char = false;

// --- FRONTEND MAGIC: BACKGROUND BUFFER ---
const BUFFER_SIZE = 3; 
let imageBuffer = [];
let isFetchingBuffer = false;
let currentSessionId = 0; 

// --- PANEL TOGGLES ---
statsBtn.addEventListener('click', () => {
    if (statsPanel.style.display === 'none' || statsPanel.style.display === '') {
        statsPanel.style.display = 'flex';
        statsBtn.classList.add('active');
        settingsPanel.style.display = 'none'; // Lukk menyen hvis den er åpen
        menuBtn.classList.remove('active');
    } else {
        statsPanel.style.display = 'none';
        statsBtn.classList.remove('active');
    }
});

menuBtn.addEventListener('click', () => {
    if (settingsPanel.style.display === 'none' || settingsPanel.style.display === '') {
        settingsPanel.style.display = 'flex';
        menuBtn.classList.add('active');
        statsPanel.style.display = 'none'; // Lukk stats hvis åpen
        statsBtn.classList.remove('active');
    } else {
        settingsPanel.style.display = 'none';
        menuBtn.classList.remove('active');
    }
});

// --- TRIGGER REFRESH FEEDBACK ---
function triggerModeChange() {
    currentSessionId++; 
    imageBuffer = []; 
    isFetchingBuffer = false; 
    
    if (!btnElement.classList.contains('loading')) {
        btnElement.click();
    }
}

// --- MENU SELECTIONS ---
serviceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const selectedService = btn.getAttribute('data-service');
        if (currentService === selectedService) return;

        currentService = selectedService;

        // Visual feedback
        serviceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Dynamically toggle the Imgur format options
        if (currentService === 'imgur') {
            imgurOptionsGroup.style.display = 'flex';
        } else {
            imgurOptionsGroup.style.display = 'none';
        }

        triggerModeChange();
    });
});

formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const selectedFormat = btn.getAttribute('data-format');
        const is7Char = selectedFormat === '7';
        
        if (useImgur7Char === is7Char) return;

        useImgur7Char = is7Char;

        // Visual feedback
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        triggerModeChange();
    });
});

function updateStats(isSuccess) {
    reqCount++;
    if (!isSuccess) deadCount++;
    
    statReq.textContent = reqCount;
    statDead.textContent = deadCount;
    
    let rate = ((reqCount - deadCount) / reqCount) * 100;
    statRate.textContent = rate.toFixed(2);
}

function getTargetInfo() {
    let id, targetUrl;
    
    if (currentService === 'catbox') {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        targetUrl = `https://files.catbox.moe/${id}.jpg`;
    } else {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        id = '';
        if (useImgur7Char) {
            const lettersOnly = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            id += lettersOnly.charAt(Math.floor(Math.random() * lettersOnly.length));
            for (let i = 0; i < 6; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } else {
            for (let i = 0; i < 5; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        targetUrl = `https://i.imgur.com/${id}.jpg`;
    }
    return { id, targetUrl };
}

function checkImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            if (img.width === 161 && img.height === 81) {
                resolve(false);
            } else if (img.width === 0 || img.height === 0) {
                resolve(false);
            } else {
                resolve(true); 
            }
        };
        img.onerror = () => resolve(false); 
        img.src = url;
    });
}

// THE BACKGROUND WORKER
async function fillBuffer() {
    if (isFetchingBuffer) return;
    isFetchingBuffer = true;
    
    let localSessionId = currentSessionId;

    while (imageBuffer.length < BUFFER_SIZE && localSessionId === currentSessionId) {
        const { id, targetUrl } = getTargetInfo();
        
        if (seenIds.has(id)) continue;

        const isValid = await checkImage(targetUrl);
        updateStats(isValid);

        if (isValid && localSessionId === currentSessionId) {
            seenIds.add(id);
            if (seenIds.size > 5000) {
                seenIds = new Set(Array.from(seenIds).slice(-2500));
            }
            localStorage.setItem('imgurRouletteSeen', JSON.stringify([...seenIds]));
            
            imageBuffer.push(targetUrl);
        }
        
        await new Promise(r => setTimeout(r, 5));
    }
    
    isFetchingBuffer = false;
}

function updateDisplay(url) {
    imgElement.src = url;
    imgElement.style.display = 'block';
    imgElement.style.opacity = '1';

    if (historyIndex <= 0) {
        backBtn.classList.add('disabled');
    } else {
        backBtn.classList.remove('disabled');
    }

    if (historyIndex >= imageHistory.length - 1) {
        forwardBtn.classList.add('disabled');
    } else {
        forwardBtn.classList.remove('disabled');
    }
}

async function fetchRandomImage() {
    let targetUrl;

    if (imageBuffer.length > 0) {
        // Instant load from buffer
        targetUrl = imageBuffer.shift();
        fillBuffer(); 
    } else {
        let validImageFound = false;
        let localSessionId = currentSessionId;

        while (!validImageFound && localSessionId === currentSessionId) {
            const { id, targetUrl: url } = getTargetInfo();
            if (seenIds.has(id)) continue;

            const isValid = await checkImage(url);
            updateStats(isValid);

            if (isValid && localSessionId === currentSessionId) {
                seenIds.add(id);
                if (seenIds.size > 5000) {
                    seenIds = new Set(Array.from(seenIds).slice(-2500));
                }
                localStorage.setItem('imgurRouletteSeen', JSON.stringify([...seenIds]));
                targetUrl = url;
                validImageFound = true;
            }
            await new Promise(r => setTimeout(r, 5));
        }
        fillBuffer(); 
    }

    if (targetUrl) {
        totalImagesFound++;
        counterElement.textContent = totalImagesFound;
        localStorage.setItem('imgurRouletteCounter', totalImagesFound);

        imageHistory = imageHistory.slice(0, historyIndex + 1);
        imageHistory.push(targetUrl);
        if (imageHistory.length > MAX_HISTORY) {
            imageHistory.shift(); 
        }
        historyIndex = imageHistory.length - 1;

        updateDisplay(targetUrl);
    }
}

// --- NAVIGATION & INTERACTION --- //

btnElement.addEventListener('click', async () => {
    if (btnElement.classList.contains('loading')) return;

    if (imageBuffer.length === 0) {
        btnElement.classList.add('loading');
        imgElement.style.opacity = '0.4';
    }
    
    setTimeout(async () => {
        await fetchRandomImage();
        btnElement.classList.remove('loading');
    }, 10);
});

backBtn.addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        updateDisplay(imageHistory[historyIndex]);
    }
});

forwardBtn.addEventListener('click', () => {
    if (historyIndex < imageHistory.length - 1) {
        historyIndex++;
        updateDisplay(imageHistory[historyIndex]);
    }
});

function toggleScale() {
    isScaled = !isScaled;
    if (isScaled) {
        imgElement.classList.add('framed-mode');
        document.getElementById('scale-expand').style.display = 'none';
        document.getElementById('scale-contract').style.display = 'block';
    } else {
        imgElement.classList.remove('framed-mode');
        document.getElementById('scale-expand').style.display = 'block';
        document.getElementById('scale-contract').style.display = 'none';
    }
}
scaleBtn.addEventListener('click', toggleScale);

copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(imgElement.src);
        document.getElementById('copy-default').style.display = 'none';
        const successIcon = document.getElementById('copy-success');
        successIcon.style.display = 'block';
        successIcon.style.fill = '#ffffff'; 

        setTimeout(() => {
            document.getElementById('copy-default').style.display = 'block';
            successIcon.style.display = 'none';
        }, 1500);
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
});

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft') {
        backBtn.click();
    } else if (event.code === 'ArrowRight') {
        if (historyIndex < imageHistory.length - 1) {
            forwardBtn.click();
        } else {
            if (!btnElement.classList.contains('loading')) btnElement.click();
        }
    } else if (event.code === 'Space') {
        event.preventDefault(); 
        if (!btnElement.classList.contains('loading')) btnElement.click();
    } else if (event.code === 'KeyF') {
        toggleScale();
    }
});

window.onload = async () => {
    btnElement.classList.add('loading');
    await fetchRandomImage();
    btnElement.classList.remove('loading');
    fillBuffer(); 
};