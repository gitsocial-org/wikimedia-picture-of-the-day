#!/usr/bin/env node

const FEED_URL = 'https://commons.wikimedia.org/w/api.php?action=featuredfeed&feed=potd&feedformat=atom&language=en';

function unescapeHtml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function extractImageUrl(html) {
  const match = html.match(/src="([^"]+\.(?:jpg|png|gif|webp)[^"]*)"/i);
  if (!match) return '';
  let url = match[1];
  if (url.includes('/thumb/')) {
    url = url.replace(/\/(\d+)px-([^/]+)$/, '/1920px-$2');
  }
  return url;
}

function extractDescription(html) {
  const descMatch = html.match(/<div[^>]*class="description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  if (!descMatch) return '';
  return descMatch[1]
    .replace(/<a[^>]*>(.*?)<\/a>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractEntry(xml, dateStr) {
  const allEntries = xml.match(/<entry>([\s\S]*?)<\/entry>/g);
  if (!allEntries || allEntries.length === 0) {
    throw new Error('No entry found in feed');
  }
  for (const entry of allEntries) {
    if (entry.includes(`<updated>${dateStr}`)) {
      return entry.replace(/^<entry>/, '').replace(/<\/entry>$/, '');
    }
  }
  return allEntries[0].replace(/^<entry>/, '').replace(/<\/entry>$/, '');
}

function extractField(entry, fieldName) {
  const regex = new RegExp(`<${fieldName}[^>]*>([\\s\\S]*?)<\\/${fieldName}>`);
  const match = entry.match(regex);
  return match ? match[1].trim() : '';
}

function extractLink(entry) {
  const match = entry.match(/<link[^>]*href="([^"]+)"/);
  return match ? match[1] : '';
}

function getDateString() {
  const providedDate = process.argv[2];
  if (providedDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(providedDate)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    const date = new Date(providedDate);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return providedDate;
  }
  const today = new Date();
  return today.toISOString().split('T')[0];
}

async function fetchPictureOfTheDay() {
  try {
    const dateStr = getDateString();
    const response = await fetch(FEED_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const xml = await response.text();
    const entry = extractEntry(xml, dateStr);
    const title = extractField(entry, 'title');
    const summaryRaw = extractField(entry, 'summary');
    const link = extractLink(entry);
    const summary = unescapeHtml(summaryRaw);
    const description = extractDescription(summary);
    const imageUrl = extractImageUrl(summary);
    const commitMessage = `${description}

Image: ${imageUrl}
Source: ${link}`;
    console.log(commitMessage);
    return 0;
  } catch (error) {
    console.error('Error fetching Picture of the Day:', error.message);
    return 1;
  }
}

const exitCode = await fetchPictureOfTheDay();
process.exit(exitCode);
