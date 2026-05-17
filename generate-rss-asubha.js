const fs = require('fs');

const HISTORY_FILE = 'history-asubha.json';
const RSS_FILE = 'asubha.xml';
const CYCLE_FILE = 'cycle-state-asubha.json';
const CYCLE_IMAGE_FILE = 'cycle-image-asubha.json'; // New state file for images
const MAX_ITEMS = 10;

// ==================== 0. IMAGE CONFIGURATION ====================
const TOTAL_IMAGES = 1429;
const IMAGE_FOLDER = 'https://chuaphucminh.com/file/asubha';

// ==================== 1. LOAD QUOTES ====================
const { ASUBHA_DATA } = require('./asubha.js');

const allQuotes = ASUBHA_DATA
    .map(item => ({
        text: (item && item.text ? item.text : '').trim(),
        ref:  (item && item.ref)  || '',
        url:  (item && item.url)  || ''
    }))
    .filter(q => q.text.length > 0);

console.log(`✅ Loaded ${allQuotes.length} asubha quotes successfully.`);

// ==================== 2. MANAGE QUOTE CYCLE STATE ====================
let availableIndices = [];
if (fs.existsSync(CYCLE_FILE)) {
    try {
        availableIndices = JSON.parse(fs.readFileSync(CYCLE_FILE, 'utf8'));
    } catch (e) {
        availableIndices = [];
    }
}

// Refill & shuffle when quote cycle is exhausted
if (availableIndices.length === 0) {
    console.log("🔄 Starting a new, freshly shuffled cycle of all quotes!");
    availableIndices = allQuotes.map((_, index) => index);
    
    // Fisher-Yates shuffle
    for (let i = availableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }
}

// Pick next quote and save remaining cycle
const selectedIndex = availableIndices.pop();
fs.writeFileSync(CYCLE_FILE, JSON.stringify(availableIndices, null, 2));

const selectedQuote = allQuotes[selectedIndex];
const randomQuote = selectedQuote.text;

// ==================== 2b. MANAGE IMAGE CYCLE STATE ====================
let availableImgIndices = [];
if (fs.existsSync(CYCLE_IMAGE_FILE)) {
    try {
        availableImgIndices = JSON.parse(fs.readFileSync(CYCLE_IMAGE_FILE, 'utf8'));
    } catch (e) {
        availableImgIndices = [];
    }
}

// Refill & shuffle when image cycle is exhausted
if (availableImgIndices.length === 0) {
    console.log("🔄 Starting a new, freshly shuffled cycle of all images!");
    availableImgIndices = Array.from({ length: TOTAL_IMAGES }, (_, index) => index);
    
    // Fisher-Yates shuffle
    for (let i = availableImgIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableImgIndices[i], availableImgIndices[j]] = [availableImgIndices[j], availableImgIndices[i]];
    }
}

// Pick next image index and save remaining cycle
const selectedImgIndex = availableImgIndices.pop();
fs.writeFileSync(CYCLE_IMAGE_FILE, JSON.stringify(availableImgIndices, null, 2));

// Format filename matching index.html logic (e.g., 0001.jpg)
const imgFileName = String(selectedImgIndex + 1).padStart(4, '0') + '.jpg';
const randomImageUrl = `${IMAGE_FOLDER}/${imgFileName}`;

// ==================== 3. GENERATE TITLE & METADATA ====================
let cleanText = randomQuote.replace(/<\/?[^>]+(>|$)/g, " ");
cleanText = cleanText.replace(/\s+/g, ' ').trim();
const words = cleanText.split(' ');
const titleText = words.slice(0, 25).join(' ') + (words.length > 25 ? '…' : '');

const newItem = {
    title:   titleText,
    content: randomQuote,
    ref:     selectedQuote.ref,
    url:     selectedQuote.url,
    image:   randomImageUrl, // Saved cyclic image URL
    pubDate: new Date().toUTCString(),
    guid:    Date.now().toString()
};

// ==================== 4. MANAGE HISTORY ====================
let history = [];
if (fs.existsSync(HISTORY_FILE)) {
    try {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
        history = [];
    }
}

history.unshift(newItem);           // newest on top
history = history.slice(0, MAX_ITEMS);

fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

// ==================== 5. BUILD RSS XML ====================
const itemsXml = history.map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.url || 'https://meormine.github.io/quanbattinh'}</link>
      <description><![CDATA[
        ${item.image ? `<img src="${item.image}" alt="Ảnh Bất Tịnh" style="max-width: 100%; height: auto; margin-bottom: 15px;" /><br>` : ''}
        ${item.content}
        <br><br>
        <strong>From:</strong> ${item.ref}
        ${item.url ? `<br><a href="${item.url}">📖 Đọc Kinh này</a>` : ''}
      ]]></description>
      ${item.image ? `<enclosure url="${item.image}" type="image/jpeg" length="0" />` : ''}
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${item.guid}</guid>
    </item>`).join('\n');

const pubDate = new Date().toUTCString();
const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Quán Bất Tịnh</title>
    <link>https://meormine.github.io/quanbattinh</link>
    <description>Quán Bất Tịnh</description>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <image>
      <url>https://meormine.github.io/quanbattinh/favicon.ico</url>
      <title>Quán Bất Tịnh</title>
      <link>https://meormine.github.io/quanbattinh/favicon.ico</link>
    </image>
    ${itemsXml}
  </channel>
</rss>`;

fs.writeFileSync(RSS_FILE, rssXml);

console.log(`\n✅ RSS generated successfully!`);
console.log(`   • Items in feed        : ${history.length}`);
console.log(`   • Quotes left in cycle : ${availableIndices.length}`);
console.log(`   • Images left in cycle : ${availableImgIndices.length}`);
console.log(`   • Latest title         : ${titleText.substring(0, 80)}${titleText.length > 80 ? '...' : ''}`);
console.log(`   • Latest image         : ${randomImageUrl}`);