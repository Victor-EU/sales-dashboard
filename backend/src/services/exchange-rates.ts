import { query } from "../db/index.js";
import { logger } from "../logger.js";

interface ExchangeRate {
  targetCurrency: string;
  rate: number;        // 1 USD = X target
  inverseRate: number; // 1 target = X USD
  yearMonth: string;
}

interface FrankfurterResponse {
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
}

class ExchangeRateService {
  private cache: Map<string, number> = new Map();
  private readonly API_BASE = "https://api.frankfurter.app";
  private readonly SUPPORTED_CURRENCIES = ["EUR", "CHF", "GBP", "JPY", "CAD", "AUD"];

  /**
   * Get the USD equivalent for a given amount in a foreign currency
   * @param amount The amount in local currency
   * @param currency The currency code (EUR, CHF, etc.)
   * @param date The date for which to get the exchange rate (uses month average)
   * @returns The amount converted to USD
   */
  async convertToUsd(
    amount: number,
    currency: string,
    date: Date = new Date()
  ): Promise<number> {
    if (!amount || amount === 0) return 0;
    if (!currency || currency === "USD") return amount;

    const yearMonth = this.getYearMonth(date);
    const rate = await this.getInverseRate(currency, yearMonth);

    if (!rate) {
      logger.warn(`No exchange rate found for ${currency} in ${yearMonth}, using amount as-is`);
      return amount;
    }

    return amount * rate;
  }

  /**
   * Get the inverse rate (1 foreign currency = X USD) for a currency and month
   */
  async getInverseRate(currency: string, yearMonth: string): Promise<number | null> {
    const cacheKey = `${currency}_${yearMonth}`;

    // Check memory cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check database
    const result = await query<{ inverse_rate: string }>(
      `SELECT inverse_rate FROM exchange_rates
       WHERE target_currency = $1 AND year_month = $2`,
      [currency, yearMonth]
    );

    if (result.rows.length > 0) {
      const rate = parseFloat(result.rows[0].inverse_rate);
      this.cache.set(cacheKey, rate);
      return rate;
    }

    // Fetch from API and store
    const rates = await this.fetchMonthlyRates(yearMonth);
    const rateData = rates.find((r) => r.targetCurrency === currency);

    if (rateData) {
      this.cache.set(cacheKey, rateData.inverseRate);
      return rateData.inverseRate;
    }

    return null;
  }

  /**
   * Fetch monthly average exchange rates from Frankfurter API
   * and store them in the database
   */
  async fetchMonthlyRates(yearMonth: string): Promise<ExchangeRate[]> {
    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    // Don't fetch future months
    const now = new Date();
    if (startDate > now) {
      logger.warn(`Cannot fetch rates for future month: ${yearMonth}`);
      return [];
    }

    // If current month, use today as end date
    const effectiveEndDate = endDate > now ? now : endDate;

    const startStr = this.formatDate(startDate);
    const endStr = this.formatDate(effectiveEndDate);

    logger.info(`Fetching exchange rates for ${yearMonth} (${startStr} to ${endStr})`);

    try {
      const url = `${this.API_BASE}/${startStr}..${endStr}?base=USD&symbols=${this.SUPPORTED_CURRENCIES.join(",")}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Frankfurter API error: ${response.status}`);
      }

      const data = (await response.json()) as FrankfurterResponse;

      // Calculate monthly averages
      const rates = this.calculateMonthlyAverages(data.rates, yearMonth);

      // Store in database
      await this.storeRates(rates);

      logger.info(`Stored ${rates.length} exchange rates for ${yearMonth}`);
      return rates;
    } catch (error) {
      logger.error(`Failed to fetch exchange rates for ${yearMonth}`, { error });
      return [];
    }
  }

  /**
   * Calculate monthly average rates from daily rates
   */
  private calculateMonthlyAverages(
    dailyRates: Record<string, Record<string, number>>,
    yearMonth: string
  ): ExchangeRate[] {
    const sums: Record<string, { total: number; count: number }> = {};

    // Sum up all daily rates
    for (const [_date, rates] of Object.entries(dailyRates)) {
      for (const [currency, rate] of Object.entries(rates)) {
        if (!sums[currency]) {
          sums[currency] = { total: 0, count: 0 };
        }
        sums[currency].total += rate;
        sums[currency].count += 1;
      }
    }

    // Calculate averages
    const result: ExchangeRate[] = [];
    for (const [currency, data] of Object.entries(sums)) {
      if (data.count > 0) {
        const rate = data.total / data.count; // 1 USD = X foreign
        const inverseRate = 1 / rate;          // 1 foreign = X USD

        result.push({
          targetCurrency: currency,
          rate,
          inverseRate,
          yearMonth,
        });
      }
    }

    return result;
  }

  /**
   * Store exchange rates in the database
   */
  private async storeRates(rates: ExchangeRate[]): Promise<void> {
    for (const rate of rates) {
      await query(
        `INSERT INTO exchange_rates (base_currency, target_currency, rate, inverse_rate, year_month, source, fetched_at)
         VALUES ('USD', $1, $2, $3, $4, 'frankfurter', NOW())
         ON CONFLICT (base_currency, target_currency, year_month) DO UPDATE SET
           rate = EXCLUDED.rate,
           inverse_rate = EXCLUDED.inverse_rate,
           fetched_at = NOW()`,
        [rate.targetCurrency, rate.rate, rate.inverseRate, rate.yearMonth]
      );

      // Update cache
      this.cache.set(`${rate.targetCurrency}_${rate.yearMonth}`, rate.inverseRate);
    }
  }

  /**
   * Ensure we have exchange rates for a list of months
   */
  async ensureRatesForMonths(months: string[]): Promise<void> {
    for (const yearMonth of months) {
      const result = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM exchange_rates WHERE year_month = $1`,
        [yearMonth]
      );

      if (parseInt(result.rows[0].count) === 0) {
        await this.fetchMonthlyRates(yearMonth);
      }
    }
  }

  /**
   * Get rates for all months in a year
   */
  async ensureRatesForYear(year: number): Promise<void> {
    const months: string[] = [];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const maxMonth = year === currentYear ? currentMonth : 12;

    for (let month = 1; month <= maxMonth; month++) {
      months.push(`${year}-${String(month).padStart(2, "0")}`);
    }

    await this.ensureRatesForMonths(months);
  }

  /**
   * Get all stored exchange rates (for debugging/display)
   */
  async getAllRates(): Promise<ExchangeRate[]> {
    const result = await query<{
      target_currency: string;
      rate: string;
      inverse_rate: string;
      year_month: string;
    }>(
      `SELECT target_currency, rate, inverse_rate, year_month
       FROM exchange_rates
       ORDER BY year_month DESC, target_currency`
    );

    return result.rows.map((row) => ({
      targetCurrency: row.target_currency,
      rate: parseFloat(row.rate),
      inverseRate: parseFloat(row.inverse_rate),
      yearMonth: row.year_month,
    }));
  }

  /**
   * Helper to get year-month string from a date
   */
  private getYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  /**
   * Helper to format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }
}

export const exchangeRateService = new ExchangeRateService();
export default exchangeRateService;
