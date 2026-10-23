// 紫微排盤「出生地」：國家 → 城市，用當地經度與時區換算真太陽時。只影響排盤用的時辰，不送出任何資料。
// 城市格式：[正體, English, Indonesia(空白沿用英文), 經度(東正西負), 時區(空白沿用國家時區)]
const ZW_PLACES = [
  {id:'tw', name:['台灣','Taiwan','Taiwan'], tz:'Asia/Taipei', cities:[
    ['台北','Taipei','',121.56],['新北','New Taipei','',121.47],['基隆','Keelung','',121.74],['桃園','Taoyuan','',121.30],
    ['新竹','Hsinchu','',120.97],['苗栗','Miaoli','',120.82],['台中','Taichung','',120.68],['彰化','Changhua','',120.54],
    ['南投','Nantou','',120.69],['雲林','Yunlin','',120.53],['嘉義','Chiayi','',120.45],['台南','Tainan','',120.21],
    ['高雄','Kaohsiung','',120.31],['屏東','Pingtung','',120.49],['宜蘭','Yilan','',121.75],['花蓮','Hualien','',121.60],
    ['台東','Taitung','',121.15],['澎湖','Penghu','',119.57],['金門','Kinmen','',118.32],['馬祖','Matsu','',119.95]]},
  {id:'cn', name:['中國','China','Tiongkok'], tz:'Asia/Shanghai', cities:[
    ['北京','Beijing','',116.40],['上海','Shanghai','',121.47],['天津','Tianjin','',117.20],['重慶','Chongqing','',106.55],
    ['廣州','Guangzhou','',113.26],['深圳','Shenzhen','',114.06],['廈門','Xiamen','',118.09],['福州','Fuzhou','',119.30],
    ['杭州','Hangzhou','',120.16],['南京','Nanjing','',118.80],['武漢','Wuhan','',114.31],['長沙','Changsha','',112.94],
    ['成都','Chengdu','',104.07],['西安','Xi\'an','',108.94],['鄭州','Zhengzhou','',113.63],['濟南','Jinan','',117.00],
    ['青島','Qingdao','',120.38],['瀋陽','Shenyang','',123.43],['哈爾濱','Harbin','',126.53],['昆明','Kunming','',102.83],
    ['南寧','Nanning','',108.37],['海口','Haikou','',110.35],['蘭州','Lanzhou','',103.83],['烏魯木齊','Urumqi','',87.62],
    ['拉薩','Lhasa','',91.11]]},
  {id:'hk', name:['香港','Hong Kong','Hong Kong'], tz:'Asia/Hong_Kong', cities:[['香港','Hong Kong','',114.17]]},
  {id:'mo', name:['澳門','Macau','Makau'], tz:'Asia/Macau', cities:[['澳門','Macau','Makau',113.54]]},
  {id:'my', name:['馬來西亞','Malaysia','Malaysia'], tz:'Asia/Kuala_Lumpur', cities:[
    ['吉隆坡','Kuala Lumpur','',101.69],['檳城','Penang','Pulau Pinang',100.33],['怡保','Ipoh','',101.08],
    ['新山','Johor Bahru','',103.76],['馬六甲','Malacca','Melaka',102.25],
    ['古晉','Kuching','',110.35,'Asia/Kuching'],['詩巫','Sibu','',111.83,'Asia/Kuching'],['亞庇','Kota Kinabalu','',116.07,'Asia/Kuching']]},
  {id:'sg', name:['新加坡','Singapore','Singapura'], tz:'Asia/Singapore', cities:[['新加坡','Singapore','Singapura',103.82]]},
  {id:'id', name:['印尼','Indonesia','Indonesia'], tz:'Asia/Jakarta', cities:[
    ['雅加達','Jakarta','',106.85],['泗水','Surabaya','',112.75],['萬隆','Bandung','',107.61],['棉蘭','Medan','',98.67],
    ['三寶瓏','Semarang','',110.42],['坤甸','Pontianak','',109.33,'Asia/Pontianak'],
    ['峇里島','Bali (Denpasar)','',115.22,'Asia/Makassar'],['望加錫','Makassar','',119.42,'Asia/Makassar'],
    ['查亞普拉','Jayapura','',140.72,'Asia/Jayapura']]},
  {id:'th', name:['泰國','Thailand','Thailand'], tz:'Asia/Bangkok', cities:[['曼谷','Bangkok','',100.50],['清邁','Chiang Mai','',98.99]]},
  {id:'vn', name:['越南','Vietnam','Vietnam'], tz:'Asia/Ho_Chi_Minh', cities:[['河內','Hanoi','',105.85],['胡志明市','Ho Chi Minh City','Kota Ho Chi Minh',106.63]]},
  {id:'ph', name:['菲律賓','Philippines','Filipina'], tz:'Asia/Manila', cities:[['馬尼拉','Manila','',120.98],['宿霧','Cebu','',123.89]]},
  {id:'jp', name:['日本','Japan','Jepang'], tz:'Asia/Tokyo', cities:[
    ['東京','Tokyo','',139.69],['大阪','Osaka','',135.50],['福岡','Fukuoka','',130.40],['札幌','Sapporo','',141.35],['沖繩（那霸）','Okinawa (Naha)','',127.68]]},
  {id:'kr', name:['韓國','South Korea','Korea Selatan'], tz:'Asia/Seoul', cities:[['首爾','Seoul','',126.98],['釜山','Busan','',129.08]]},
  {id:'us', name:['美國','United States','Amerika Serikat'], tz:'America/New_York', cities:[
    ['紐約','New York','',-74.01],['波士頓','Boston','',-71.06],['華盛頓','Washington, D.C.','',-77.04],
    ['芝加哥','Chicago','',-87.63,'America/Chicago'],['休士頓','Houston','',-95.37,'America/Chicago'],
    ['洛杉磯','Los Angeles','',-118.24,'America/Los_Angeles'],['舊金山','San Francisco','',-122.42,'America/Los_Angeles'],
    ['西雅圖','Seattle','',-122.33,'America/Los_Angeles'],['檀香山','Honolulu','',-157.86,'Pacific/Honolulu']]},
  {id:'ca', name:['加拿大','Canada','Kanada'], tz:'America/Toronto', cities:[
    ['多倫多','Toronto','',-79.38],['蒙特婁','Montreal','',-73.57],['卡加利','Calgary','',-114.07,'America/Edmonton'],
    ['溫哥華','Vancouver','',-123.12,'America/Vancouver']]},
  {id:'gb', name:['英國','United Kingdom','Inggris'], tz:'Europe/London', cities:[['倫敦','London','',-0.13],['曼徹斯特','Manchester','',-2.24]]},
  {id:'au', name:['澳洲','Australia','Australia'], tz:'Australia/Sydney', cities:[
    ['雪梨','Sydney','',151.21],['墨爾本','Melbourne','',144.96,'Australia/Melbourne'],
    ['布里斯本','Brisbane','',153.03,'Australia/Brisbane'],['伯斯','Perth','',115.86,'Australia/Perth']]},
  {id:'nz', name:['紐西蘭','New Zealand','Selandia Baru'], tz:'Pacific/Auckland', cities:[['奧克蘭','Auckland','',174.76]]},
];

// 依語言取名稱：0=正體、1=English、2=Indonesia（空白沿用英文）
function zwPlaceName(names, lang){
  if (lang === 'zh') return names[0];
  if (lang === 'id') return names[2] || names[1];
  return names[1];
}

function zwFindPlace(countryId, cityIndex){
  const country = ZW_PLACES.find(c => c.id === countryId);
  if (!country || cityIndex === '' || cityIndex == null) return null;
  const city = country.cities[Number(cityIndex)];
  if (!city) return null;
  return {country, city, longitude: city[3], timeZone: city[4] || country.tz};
}

// 這個時區在某個 UTC 時刻的時差（分鐘），含當年的夏令時間
function zwZoneOffsetMin(utcMs, timeZone){
  const parts = {};
  new Intl.DateTimeFormat('en-US', {timeZone, hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit'}).formatToParts(new Date(utcMs)).forEach(p => { parts[p.type] = p.value; });
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
  return Math.round((asUtc - utcMs) / 60000);
}

// NOAA 均時差（分鐘）：太陽實際位置和平均時間的差
function zwEquationOfTime(utcMs){
  const d = new Date(utcMs);
  const dayOfYear = Math.floor((utcMs - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
  const g = 2 * Math.PI / 365 * (dayOfYear - 1 + (d.getUTCHours() - 12) / 24);
  return 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
}

// 鐘錶時間 → 出生地真太陽時（回傳排盤要用的日期與時間）
function zwTrueSolarTime(date, time, longitude, timeZone){
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const clockAsUtc = Date.UTC(y, m - 1, d, hh, mm || 0);
  let offset = zwZoneOffsetMin(clockAsUtc, timeZone);
  let utc = clockAsUtc - offset * 60000;
  const offsetCheck = zwZoneOffsetMin(utc, timeZone);
  if (offsetCheck !== offset) { offset = offsetCheck; utc = clockAsUtc - offset * 60000; }
  const solar = new Date(utc + (longitude * 4 + zwEquationOfTime(utc)) * 60000);
  const pad = n => String(n).padStart(2, '0');
  return {
    date: `${solar.getUTCFullYear()}-${pad(solar.getUTCMonth() + 1)}-${pad(solar.getUTCDate())}`,
    time: `${pad(solar.getUTCHours())}:${pad(solar.getUTCMinutes())}`,
    offsetMin: offset,
  };
}

// 畫面上的地名跟著語言切換
if (typeof LOCAL_READING_TRANSLATIONS !== 'undefined') {
  const en = LOCAL_READING_TRANSLATIONS.en, idt = LOCAL_READING_TRANSLATIONS.id;
  ZW_PLACES.forEach(c => [c.name, ...c.cities].forEach(n => {
    if (!(n[0] in en)) en[n[0]] = n[1];
    if (!(n[0] in idt)) idt[n[0]] = n[2] || n[1];
  }));
}

if (typeof module !== 'undefined') module.exports = {ZW_PLACES, zwFindPlace, zwTrueSolarTime, zwPlaceName};
