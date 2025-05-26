// Global rate limiter for OKX API requests across all services
class GlobalRateLimiter {
  private requestQueue: Promise<any> = Promise.resolve();
  private lastRequestTime: number = 0;
  private readonly GLOBAL_RATE_LIMIT = 1500; // 1.5 seconds between any OKX API requests
  private requestCount: number = 0;

  async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return this.requestQueue = this.requestQueue.then(async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      this.requestCount++;

      if (timeSinceLastRequest < this.GLOBAL_RATE_LIMIT) {
        const delay = this.GLOBAL_RATE_LIMIT - timeSinceLastRequest;
        console.log(`Global rate limiter: waiting ${delay}ms before request #${this.requestCount}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      this.lastRequestTime = Date.now();

      try {
        const result = await requestFn();
        console.log(`Global rate limiter: completed request #${this.requestCount} successfully`);
        return result;
      } catch (error) {
        console.error(`Global rate limiter: request #${this.requestCount} failed:`, error);
        throw error;
      }
    });
  }

  // Method to get current stats
  getStats() {
    return {
      totalRequests: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      timeSinceLastRequest: Date.now() - this.lastRequestTime
    };
  }
}

export const globalRateLimiter = new GlobalRateLimiter();
