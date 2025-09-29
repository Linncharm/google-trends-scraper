import { CountryConfig } from '../types/index.js';

/**
 * 支持的国家/地区配置
 * 按照国家代码字母顺序排列
 */
export const COUNTRIES: Record<string, CountryConfig> = {
  AE: { code: 'AE', name: '阿拉伯联合酋长国', language: 'ar-AE' }, // <-- 新增
  AR: { code: 'AR', name: '阿根廷', language: 'es-AR' },             // <-- 新增
  AU: { code: 'AU', name: '澳大利亚', language: 'en-AU' },
  BR: { code: 'BR', name: '巴西', language: 'pt-BR' },
  CA: { code: 'CA', name: '加拿大', language: 'en-CA' },
  CL: { code: 'CL', name: '智利', language: 'es-CL' },               // <-- 新增
  CO: { code: 'CO', name: '哥伦比亚', language: 'es-CO' },           // <-- 新增
  DE: { code: 'DE', name: '德国', language: 'de-DE' },
  EG: { code: 'EG', name: '埃及', language: 'ar-EG' },               // <-- 新增
  ES: { code: 'ES', name: '西班牙', language: 'es-ES' },
  FR: { code: 'FR', name: '法国', language: 'fr-FR' },
  GB: { code: 'GB', name: '英国', language: 'en-GB' },
  ID: { code: 'ID', name: '印度尼西亚', language: 'id-ID' },
  IE: { code: 'IE', name: '爱尔兰', language: 'en-IE' },             // <-- 新增
  IN: { code: 'IN', name: '印度', language: 'en-IN' },
  IT: { code: 'IT', name: '意大利', language: 'it-IT' },
  JP: { code: 'JP', name: '日本', language: 'ja-JP' },
  KR: { code: 'KR', name: '韩国', language: 'ko-KR' },
  MX: { code: 'MX', name: '墨西哥', language: 'es-MX' },
  MY: { code: 'MY', name: '马来西亚', language: 'ms-MY' },           // <-- 新增
  NG: { code: 'NG', name: '尼日利亚', language: 'en-NG' },
  NL: { code: 'NL', name: '荷兰', language: 'nl-NL' },               // <-- 新增
  NZ: { code: 'NZ', name: '新西兰', language: 'en-NZ' },             // <-- 新增
  PE: { code: 'PE', name: '秘鲁', language: 'es-PE' },               // <-- 新增
  PH: { code: 'PH', name: '菲律宾', language: 'en-PH' },
  PK: { code: 'PK', name: '巴基斯坦', language: 'en-PK' },
  RU: { code: 'RU', name: '俄罗斯', language: 'ru-RU' },
  SA: { code: 'SA', name: '沙特阿拉伯', language: 'ar-SA' },         // <-- 新增
  SE: { code: 'SE', name: '瑞典', language: 'sv-SE' },               // <-- 新增
  SG: { code: 'SG', name: '新加坡', language: 'en-SG' },             // <-- 新增
  TH: { code: 'TH', name: '泰国', language: 'th-TH' },               // <-- 新增
  US: { code: 'US', name: '美国', language: 'en-US' },
  VN: { code: 'VN', name: '越南', language: 'vi-VN' },
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