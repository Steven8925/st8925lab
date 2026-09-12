const fs = require('fs');

const html = fs.readFileSync('d:/st8925lab/Travel-Assistance/index.html', 'utf-8');

// Extract generateFallbackPlan and getUserPreferenceLabels
// Let's test by creating a mock execution
const mockPayloads = [
  { origin: 'SIN', destination: 'japan_hokkaido', time_mode: 'tw_moon_2026' },
  { origin: 'SIN', destination: 'vietnam_danang', time_mode: 'tw_moon_2026' },
  { origin: 'TPE', destination: 'japan_hokkaido', time_mode: 'tw_moon_2026' },
  { origin: 'SIN', destination: 'bangkok', time_mode: 'tw_moon_2026' },
  { origin: 'SIN', destination: 'europe_paris', time_mode: 'tw_moon_2026' },
  { origin: 'TPE', destination: 'custom', destination_custom: '北海道', time_mode: 'tw_moon_2026' },
  { origin: 'TPE', destination: 'custom', destination_custom: '葡萄牙 里斯本', time_mode: 'tw_moon_2026' },
];

// Extract the function bodies from index.html
const startMarker = 'function generateFallbackPlan(payload) {';
const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf('function renderPlan(data) {', startIndex);
const fallbackFnCode = html.substring(startIndex, endIndex);

const userPrefStartMarker = 'function getUserPreferenceLabels(payload, planData) {';
const userPrefStartIndex = html.indexOf(userPrefStartMarker);
const userPrefEndIndex = html.indexOf('function generateFallbackPlan(payload) {', userPrefStartIndex);
const userPrefFnCode = html.substring(userPrefStartIndex, userPrefEndIndex);

const fullCode = `
  const document = {
    getElementById: () => null
  };
  ${userPrefFnCode}
  ${fallbackFnCode}

  global.getUserPreferenceLabels = getUserPreferenceLabels;
  global.generateFallbackPlan = generateFallbackPlan;
`;

eval(fullCode);

console.log('--- Testing Fallback Plan Results ---');
mockPayloads.forEach((payload, i) => {
  const plan = generateFallbackPlan(payload);
  console.log(`Test #${i + 1}:`);
  console.log(`  Input Origin: [${payload.origin}] -> Input Dest: [${payload.destination_custom || payload.destination}]`);
  console.log(`  Output Display: ${plan.destination_display}`);
  console.log(`  Output Flight: ${plan.flights[0].airline} (${plan.flights[0].flight_number})`);
  console.log(`  First Hotel: ${plan.hotels[0].name}`);
  console.log(`  First Activity: ${plan.activities[0].title}`);
  console.log(`  Day 1: ${plan.days[0].theme}`);
  console.log(`  Day 1 Desc: ${plan.days[0].description}`);
  console.log('--------------------------------------------------');
});
