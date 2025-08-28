import { CountryConfig } from '../types/index.js';

/**
 * 支持的国家/地区配置
 * 按照国家代码字母顺序排列
 */
export const COUNTRIES: Record<string, CountryConfig> = {
  AU: { code: 'AU', name: '澳大利亚', language: 'en-AU' },
  BR: { code: 'BR', name: '巴西', language: 'pt-BR' },
  CA: { code: 'CA', name: '加拿大', language: 'en-CA' },
  DE: { code: 'DE', name: '德国', language: 'de-DE' },
  ES: { code: 'ES', name: '西班牙', language: 'es-ES' },
  FR: { code: 'FR', name: '法国', language: 'fr-FR' },
  GB: { code: 'GB', name: '英国', language: 'en-GB' },
  ID: { code: 'ID', name: '印度尼西亚', language: 'id-ID' }, // <-- 新增
  IN: { code: 'IN', name: '印度', language: 'en-IN' },
  IT: { code: 'IT', name: '意大利', language: 'it-IT' },
  JP: { code: 'JP', name: '日本', language: 'ja-JP' },
  KR: { code: 'KR', name: '韩国', language: 'ko-KR' },
  MX: { code: 'MX', name: '墨西哥', language: 'es-MX' },
  NG: { code: 'NG', name: '尼日利亚', language: 'en-NG' },   // <-- 新增
  PH: { code: 'PH', name: '菲律宾', language: 'en-PH' },   // <-- 新增
  PK: { code: 'PK', name: '巴基斯坦', language: 'en-PK' }, // <-- 新增
  RU: { code: 'RU', name: '俄罗斯', language: 'ru-RU' },
  US: { code: 'US', name: '美国', language: 'en-US' },
  VN: { code: 'VN', name: '越南', language: 'vi-VN' },     // <-- 新增
};

/**
 * 获取国家配置
 */
export function getCountryConfig(countryCode: string): CountryConfig | undefined {
  return COUNTRIES[countryCode.toUpperCase()];
}

/**
 * 获取所有支持的国家列表
 */
export function getAllCountries(): CountryConfig[] {
  return Object.values(COUNTRIES);
}