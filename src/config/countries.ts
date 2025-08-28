import { CountryConfig } from '../types/index.js';

/**
 * 支持的国家/地区配置
 */
export const COUNTRIES: Record<string, CountryConfig> = {
  US: {
    code: 'US',
    name: '美国',
    language: 'en-US'
  },
  CN: {
    code: 'CN',
    name: '中国',
    language: 'zh-CN'
  },
  JP: {
    code: 'JP',
    name: '日本',
    language: 'ja-JP'
  },
  KR: {
    code: 'KR',
    name: '韩国',
    language: 'ko-KR'
  },
  GB: {
    code: 'GB',
    name: '英国',
    language: 'en-GB'
  },
  DE: {
    code: 'DE',
    name: '德国',
    language: 'de-DE'
  },
  FR: {
    code: 'FR',
    name: '法国',
    language: 'fr-FR'
  },
  IT: {
    code: 'IT',
    name: '意大利',
    language: 'it-IT'
  },
  ES: {
    code: 'ES',
    name: '西班牙',
    language: 'es-ES'
  },
  AU: {
    code: 'AU',
    name: '澳大利亚',
    language: 'en-AU'
  },
  CA: {
    code: 'CA',
    name: '加拿大',
    language: 'en-CA'
  },
  IN: {
    code: 'IN',
    name: '印度',
    language: 'en-IN'
  },
  BR: {
    code: 'BR',
    name: '巴西',
    language: 'pt-BR'
  },
  MX: {
    code: 'MX',
    name: '墨西哥',
    language: 'es-MX'
  },
  RU: {
    code: 'RU',
    name: '俄罗斯',
    language: 'ru-RU'
  }
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
