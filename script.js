{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const BASE_URL = "https://booking.hotelincloud.com/it/show/138184";\
\
function log(message) \{\
  const logDiv = document.getElementById("log");\
  logDiv.textContent += message + "\\n";\
\}\
\
function formatDate(date) \{\
  const y = date.getFullYear();\
  const m = String(date.getMonth() + 1).padStart(2, "0");\
  const d = String(date.getDate()).padStart(2, "0");\
  return `$\{y\}-$\{m\}-$\{d\}`;\
\}\
\
async function fetchHtml(url) \{\
  const resp = await fetch(url, \{\
    method: "GET",\
    credentials: "include"\
  \});\
  if (!resp.ok) \{\
    throw new Error(`HTTP $\{resp.status\}`);\
  \}\
  return await resp.text();\
\}\
\
// DA ADATTARE ai selettori reali del booking engine\
function parseAvailabilityAndPrice(html) \{\
  const parser = new DOMParser();\
  const doc = parser.parseFromString(html, "text/html");\
\
  // Blocchi camera (esempio di selettori generici)\
  const roomBlocks = doc.querySelectorAll(".room, .room-type, .hic-room");\
\
  let totalAvailable = 0;\
  let totalPriceWeighted = 0;\
\
  roomBlocks.forEach(block => \{\
    let avail = 1;\
    const text = block.textContent.toLowerCase();\
\
    // Se la camera \'e8 esaurita\
    if (text.includes("esaurita") || text.includes("sold out")) \{\
      avail = 0;\
    \}\
\
    // Cerca il prezzo\
    const priceEl = block.querySelector(".price, .hic-price, .amount");\
    let price = 0;\
    if (priceEl) \{\
      let t = priceEl.textContent.trim();\
      t = t.replace("\'80", "").replace(/\\s/g, "");\
      t = t.replace(/\\./g, "").replace(",", ".");\
      const val = parseFloat(t);\
      if (!isNaN(val)) \{\
        price = val;\
      \}\
    \}\
\
    totalAvailable += avail;\
    totalPriceWeighted += avail * price;\
  \});\
\
  const avgPrice = totalAvailable > 0 ? (totalPriceWeighted / totalAvailable) : 0;\
\
  return \{\
    availableRooms: totalAvailable,\
    avgPrice: Number.isFinite(avgPrice) ? Number(avgPrice.toFixed(2)) : 0\
  \};\
\}\
\
async function crawlRange(startDate, endDate, nights, adults, delaySeconds) \{\
  const rows = [];\
  let current = new Date(startDate);\
\
  while (current <= endDate) \{\
    const checkinStr = formatDate(current);\
    const url = `$\{BASE_URL\}?checkin=$\{encodeURIComponent(checkinStr)\}&nights=$\{nights\}&adults=$\{adults\}`;\
\
    log(`Richiesta per $\{checkinStr\}`);\
\
    try \{\
      const html = await fetchHtml(url);\
      const \{ availableRooms, avgPrice \} = parseAvailabilityAndPrice(html);\
\
      log(`  Disponibili=$\{availableRooms\}, prezzo_medio=$\{avgPrice\}`);\
\
      rows.push(\{\
        date: checkinStr,\
        available_rooms: availableRooms,\
        avg_price_offered: avgPrice\
      \});\
    \} catch (err) \{\
      log(`  ERRORE per $\{checkinStr\}: $\{err.message\}`);\
      rows.push(\{\
        date: checkinStr,\
        available_rooms: "",\
        avg_price_offered: ""\
      \});\
    \}\
\
    await new Promise(res => setTimeout(res, delaySeconds * 1000));\
    current.setDate(current.getDate() + 1);\
  \}\
\
  return rows;\
\}\
\
function updateCsvOutput(rows) \{\
  let csv = "date,available_rooms,avg_price_offered\\n";\
  rows.forEach(r => \{\
    csv += `$\{r.date\},$\{r.available_rooms\},$\{r.avg_price_offered\}\\n`;\
  \});\
  document.getElementById("csv-output").value = csv;\
\}\
\
document.getElementById("crawl-form").addEventListener("submit", async (e) => \{\
  e.preventDefault();\
  document.getElementById("log").textContent = "";\
  document.getElementById("csv-output").value = "";\
\
  const startStr = document.getElementById("start-date").value;\
  const endStr = document.getElementById("end-date").value;\
  const nights = parseInt(document.getElementById("nights").value, 10) || 1;\
  const adults = parseInt(document.getElementById("adults").value, 10) || 2;\
  const delay = parseInt(document.getElementById("delay").value, 10) || 2;\
\
  if (!startStr || !endStr) \{\
    alert("Seleziona data inizio e data fine.");\
    return;\
  \}\
\
  const startDate = new Date(startStr);\
  const endDate = new Date(endStr);\
\
  if (endDate < startDate) \{\
    alert("La data fine non pu\'f2 essere precedente alla data inizio.");\
    return;\
  \}\
\
  log("Inizio crawl...");\
  const rows = await crawlRange(startDate, endDate, nights, adults, delay);\
  log("Crawl completato.");\
  updateCsvOutput(rows);\
\});}