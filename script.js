const imgElement = document.getElementById('display-image');
const btnElement = document.getElementById('refresh-btn');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const copyBtn = document.getElementById('copy-btn');
const scaleBtn = document.getElementById('scale-btn');

// Stats elementer
const counterElement = document.getElementById('counter');
const statsBtn = document.getElementById('stats-btn');
const statsPanel = document.getElementById('stats-panel');
const statReq = document.getElementById('stat-req');
const statDead = document.getElementById('stat-dead');
const statRate = document.getElementById('stat-rate');

let totalImagesFound = parseInt(localStorage.getItem('imgurRouletteCounter')) || 0;
counterElement.textContent = totalImagesFound;
let seenIds = new Set(JSON.parse(localStorage.getItem('imgurRouletteSeen')) || []);

let reqCount = 0;
let deadCount = 0;

let imageHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 10; // Husker de siste 10 bildene bakover
let isScaled = false; 

// --- STATS TOGGLE ---
statsBtn.addEventListener('click', () => {
    if (statsPanel.style.display === 'none' || statsPanel.style.display === '') {
        statsPanel.style.display = 'flex';
        statsBtn.classList.add('active');
    } else {
        statsPanel.style.display = 'none';
        statsBtn.classList.remove('active');
    }
});

function updateStats(isSuccess) {
    reqCount++;
    if (!isSuccess) deadCount++;
    
    statReq.textContent = reqCount;
    statDead.textContent = deadCount;
    
    let rate = ((reqCount - deadCount) / reqCount) * 100;
    statRate.textContent = rate.toFixed(2);
}

function generateImgurId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
    let validImageFound = false;

    while (!validImageFound) {
        const id = generateImgurId();
        
        if (seenIds.has(id)) continue;

        const targetUrl = `https://i.imgur.com/${id}.jpg`;
        const isValid = await checkImage(targetUrl);

        updateStats(isValid);

        if (isValid) {
            seenIds.add(id);
            if (seenIds.size > 5000) {
                seenIds = new Set(Array.from(seenIds).slice(-2500));
            }
            localStorage.setItem('imgurRouletteSeen', JSON.stringify([...seenIds]));

            totalImagesFound++;
            counterElement.textContent = totalImagesFound;
            localStorage.setItem('imgurRouletteCounter', totalImagesFound);

            // Kutter fremtiden ved ny re-roll i fortiden (klassisk nettleser-historikk)
            imageHistory = imageHistory.slice(0, historyIndex + 1);
            imageHistory.push(targetUrl);
            if (imageHistory.length > MAX_HISTORY) {
                imageHistory.shift(); 
            }
            historyIndex = imageHistory.length - 1;

            updateDisplay(targetUrl);
            validImageFound = true;
        }
    }
}

// --- NAVIGASJON OG HANDLING --- //

btnElement.addEventListener('click', async () => {
    btnElement.classList.add('loading');
    imgElement.style.opacity = '0.4';
    
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
        successIcon.style.fill = '#4CAF50'; 

        setTimeout(() => {
            document.getElementById('copy-default').style.display = 'block';
            successIcon.style.display = 'none';
        }, 1500);
    } catch (err) {
        console.error('Kunne ikke kopiere: ', err);
    }
});

// TASTATURSNARVEIER
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
};