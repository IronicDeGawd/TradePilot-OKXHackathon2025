// Global rate limiter for OKX API requests across all services
class GlobalRateLimiter {
  private requestQueue: Promise<any> = Promise.resolve();
  private lastRequestTime: number = 0;
  private readonly GLOBAL_RATE_LIMIT = 2500; // 2.5 seconds between any OKX API requests (increased from 2s)
  private requestCount: number = 0;
  private failureCount: number = 0;

  async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return this.requestQueue = this.requestQueue.then(async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      this.requestCount++;

      // Adjust delay based on recent failure rate
      let currentDelay = this.GLOBAL_RATE_LIMIT;
      if (this.failureCount > 2) {
        currentDelay = this.GLOBAL_RATE_LIMIT * 2; // Double the delay if we've had recent failures
        console.log(`Global rate limiter: increased delay to ${currentDelay}ms due to recent failures`);
      }

      if (timeSinceLastRequest < currentDelay) {
        const delay = currentDelay - timeSinceLastRequest;
        console.log(`Global rate limiter: waiting ${delay}ms before request #${this.requestCount}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      this.lastRequestTime = Date.now();

      try {
        const result = await requestFn();
        console.log(`Global rate limiter: completed request #${this.requestCount} successfully`);

        // Reset failure count on success
        if (this.failureCount > 0) {
          this.failureCount = Math.max(0, this.failureCount - 1);
        }

        return result;
      } catch (error) {
        this.failureCount++;
        console.error(`Global rate limiter: request #${this.requestCount} failed (failure count: ${this.failureCount}):`, error);

        // If we get a 429 (rate limit), wait longer before next request
        if (error instanceof Error && error.message.includes('429')) {
          console.log('Rate limit detected, extending delay for next request...');
          await new Promise(resolve => setTimeout(resolve, 5000)); // Extra 5s delay
          this.lastRequestTime = Date.now(); // Update timestamp to include the extra delay
        }

        throw error;
      }
    });
  }

  // Method to get current stats
  getStats() {
    return {
      totalRequests: this.requestCount,
      failureCount: this.failureCount,
      lastRequestTime: this.lastRequestTime,
      timeSinceLastRequest: Date.now() - this.lastRequestTime
    };
  }
}

export const globalRateLimiter = new GlobalRateLimiter();
