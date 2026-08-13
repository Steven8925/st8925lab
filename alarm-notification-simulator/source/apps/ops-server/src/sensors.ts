export type SensorLevel = "NORMAL" | "YELLOW" | "RED";

export type Sensor = {
  id: string;
  label: string;
  /** Equipment identifier, as the customer's system would record it. */
  deviceId: string;
  metric: string;
  unit: string;
  min: number;
  max: number;
  /** Warning threshold: crossing it raises a yellow light. */
  yellow: number;
  /** Alarm threshold: crossing it raises a red light needing urgent action. */
  red: number;
  value: number;
  level: SensorLevel;
};

/**
 * Threshold-driven sensors, modelling the customer's real alarm generation.
 *
 * The customer configures conditions such as "water temperature > 30 -> yellow,
 * > 50 -> red". Their system evaluates the reading, decides the level, and
 * writes a row for the notification program to pick up.
 *
 * This is deliberately a VALUE that is evaluated, not a canned message: without
 * a real reading there is no way to show the difference between 50 degrees and
 * 90 degrees, which is the entire point of a threshold.
 */
export const SENSORS: Sensor[] = [
  {
    id: "water-temp",
    label: "水溫 Water temperature",
    deviceId: "TANK-01",
    metric: "water_temperature",
    unit: "°C",
    min: 0,
    max: 100,
    yellow: 30,
    red: 50,
    value: 24,
    level: "NORMAL",
  },
  {
    id: "room-temp",
    label: "機房溫度 Server room temperature",
    deviceId: "ROOM-R12",
    metric: "room_temperature",
    unit: "°C",
    min: 0,
    max: 60,
    yellow: 28,
    red: 40,
    value: 22,
    level: "NORMAL",
  },
  {
    id: "water-pressure",
    label: "水壓 Water pressure",
    deviceId: "PUMP-03",
    metric: "water_pressure",
    unit: "bar",
    min: 0,
    max: 12,
    yellow: 7,
    red: 9,
    value: 4.5,
    level: "NORMAL",
  },
];

/** Which light a reading corresponds to. Red wins over yellow. */
export function evaluateLevel(sensor: Sensor, value: number): SensorLevel {
  if (value >= sensor.red) return "RED";
  if (value >= sensor.yellow) return "YELLOW";
  return "NORMAL";
}

export function findSensor(id: string): Sensor | undefined {
  return SENSORS.find((sensor) => sensor.id === id);
}

/** The message text the customer's system would compose for the row. */
export function composeMessage(sensor: Sensor, value: number, level: SensorLevel): string {
  const threshold = level === "RED" ? sensor.red : sensor.yellow;
  const light = level === "RED" ? "紅燈" : "黃燈";
  const urgency = level === "RED" ? "，須立即處理" : "";

  return `${sensor.deviceId} ${sensor.label.split(" ")[0]} ${value}${sensor.unit}，已超過${light}門檻 ${threshold}${sensor.unit}${urgency}。`;
}
