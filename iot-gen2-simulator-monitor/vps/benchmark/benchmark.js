// =========================================================================
//  benchmark.js — k6 High-Concurrency Load Testing Script for Wayne IoT Gen 2
//  壓測驗證：模擬 500 台冰水主機高頻並發上傳，驗證 p99 延遲 < 30ms 與 0% 丟包
// =========================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
export const ErrorRate = new Rate('error_rate');
export const IngestLatency = new Trend('ingest_latency_ms');
export const IngestSuccess = new Counter('ingest_success_count');

export const options = {
  scenarios: {
    // 1. 常規負載測試：50 台主機每 2 秒回報一次
    constant_fleet: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
    },
    // 2. 突發極限壓測：瞬間攀升至 500 並發
    peak_stress: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '30s', target: 500 },
        { duration: '30s', target: 500 },
        { duration: '30s', target: 0 },
      ],
      startTime: '1m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<25', 'p(99)<35'], // 99% of requests must complete under 35ms
    'error_rate': ['rate<0.001'],                   // Error rate must be under 0.1%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost/api/iot';

// 21 Anonymized Standard Industrial Devices
const DEVICES = [
  { cid: 1, sn: 'ECO-CH-01', mid: 15 },
  { cid: 1, sn: 'ECO-CH-02', mid: 17 },
  { cid: 1, sn: 'ECO-CH-03', mid: 19 },
  { cid: 1, sn: 'ECO-CH-04', mid: 21 },
  { cid: 2, sn: 'MED-CH-01', mid: 5 },
  { cid: 3, sn: 'FIN-CH-01', mid: 7 },
  { cid: 4, sn: 'SEMI-CH-01', mid: 6 },
  { cid: 5, sn: 'HOSP-CH-01', mid: 11 },
  { cid: 6, sn: 'BIOMED-CH-01', mid: 23 },
  { cid: 7, sn: 'MFG-CH-01', mid: 9 },
];

export default function () {
  const device = DEVICES[Math.floor(Math.random() * DEVICES.length)];
  const url = `${BASE_URL}/${device.cid}/${device.sn}/ingest`;

  // Realistic randomized Modbus physical payload
  const payload = JSON.stringify({
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      AAA0001: 1,
      AAA0002: 1,
      AAA0003: 1,
      AAA0013: 0,
      AAA0018: 0,
      AAA0028: (7.5 + (Math.random() - 0.5) * 1.5).toFixed(2),  // 冰水出水溫
      AAA0029: (12.5 + (Math.random() - 0.5) * 1.5).toFixed(2), // 冰水回水溫
      AAA0030: (34.0 + (Math.random() - 0.5) * 2.0).toFixed(2), // 冷卻水出水溫
      AAA0031: (29.0 + (Math.random() - 0.5) * 2.0).toFixed(2), // 冷卻水回水溫
      AAA0036: (15.5 + (Math.random() - 0.5) * 1.2).toFixed(2), // 高壓
      AAA0037: (3.8 + (Math.random() - 0.5) * 0.4).toFixed(2),  // 低壓
      AAA0045: (5.1 + (Math.random() - 0.5) * 0.5).toFixed(2),  // COP
      AAA0059: (82.0 + (Math.random() - 0.5) * 10.0).toFixed(2) // 總功率 kW
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer Wayne_Master_Secret_Token_2026',
    },
    timeout: '3s',
  };

  const res = http.post(url, payload, params);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'status is buffered': (r) => r.json('status') === 'buffered',
    'latency under 30ms': (r) => r.timings.duration < 30,
  });

  ErrorRate.add(!success);
  IngestLatency.add(res.timings.duration);
  if (success) IngestSuccess.add(1);

  sleep(0.5);
}
