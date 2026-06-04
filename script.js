const imgElement = document.getElementById('display-image');
const btnElement = document.getElementById('refresh-btn');
const backBtn = document.getElementById('back-btn');
const copyBtn = document.getElementById('copy-btn');

let imageHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 4; 

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
}

async function fetchRandomImage() {
    let validImageFound = false;

    while (!validImageFound) {
        const id = generateImgurId();
        const targetUrl = `https://i.imgur.com/${id}.jpg`;

        const isValid = await checkImage(targetUrl);

        if (isValid) {
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

// --- KNAPPELOGIKK --- //

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
        console.error('Kunne ikke kopiere lenken: ', err);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft') {
        backBtn.click();
    } else if (event.code === 'ArrowRight' || event.code === 'Space') {
        event.preventDefault(); 
        if (!btnElement.classList.contains('loading')) {
            btnElement.click();
        }
    }
});

window.onload = async () => {
    btnElement.classList.add('loading');
    await fetchRandomImage();
    btnElement.classList.remove('loading');
};