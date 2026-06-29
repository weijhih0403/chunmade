import { format, toZonedTime, fromZonedTime } from "date-fns-tz";

export const APP_TZ = process.env.APP_TIMEZONE || "Asia/Taipei";

/** 目前時間（UTC Date 物件，顯示時再轉時區） */
export function now(): Date {
  return new Date();
}

/** 將 UTC 時間轉為台北時區的「當地時間檢視」 */
export function toTaipei(date: Date): Date {
  return toZonedTime(date, APP_TZ);
}

/** 將台北當地時間轉回 UTC */
export function fromTaipei(date: Date): Date {
  return fromZonedTime(date, APP_TZ);
}

export function formatDateTime(date: Date, pattern = "yyyy-MM-dd HH:mm:ss"): string {
  return format(toZonedTime(date, APP_TZ), pattern, { timeZone: APP_TZ });
}

export function formatDate(date: Date, pattern = "yyyy-MM-dd"): string {
  return format(toZonedTime(date, APP_TZ), pattern, { timeZone: APP_TZ });
}

/** 營業日字串 yyyyMMdd（台北時區），供單號序列使用 */
export function businessDateKey(date: Date = new Date()): string {
  return format(toZonedTime(date, APP_TZ), "yyyyMMdd", { timeZone: APP_TZ });
}

/** 營業月字串 yyyyMM（台北時區） */
export function businessMonthKey(date: Date = new Date()): string {
  return format(toZonedTime(date, APP_TZ), "yyyyMM", { timeZone: APP_TZ });
}

/** 台北時區當日 00:00:00 對應的 UTC Date */
export function startOfBusinessDay(date: Date = new Date()): Date {
  const key = format(toZonedTime(date, APP_TZ), "yyyy-MM-dd", { timeZone: APP_TZ });
  return fromZonedTime(`${key}T00:00:00`, APP_TZ);
}

/** 台北時區當日 23:59:59.999 對應的 UTC Date */
export function endOfBusinessDay(date: Date = new Date()): Date {
  const key = format(toZonedTime(date, APP_TZ), "yyyy-MM-dd", { timeZone: APP_TZ });
  return fromZonedTime(`${key}T23:59:59.999`, APP_TZ);
}

/** 兩時間差（分鐘，向下取整） */
export function diffMinutes(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 60000);
}
