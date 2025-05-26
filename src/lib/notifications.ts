interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export class NotificationService {
  private isSupported: boolean = false;
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window;
      this.permission = this.isSupported ? Notification.permission : 'denied';
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission === 'granted';
  }

  async showNotification(options: NotificationOptions): Promise<boolean> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return false;

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: true
      });

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  async notifyArbitrageOpportunity(symbol: string, profitPercent: number): Promise<void> {
    const title = `🚀 Arbitrage Alert: ${symbol}`;
    const body = `${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(2)}% spread detected! Check TradePilot AI for details.`;

    await this.showNotification({
      title,
      body,
      tag: `arbitrage-${symbol}`,
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  async notifyTrendingToken(tokenSymbol: string, change24h: number): Promise<void> {
    const title = `📈 Trending Alert: ${tokenSymbol}`;
    const body = `${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}% in 24h! High social momentum detected.`;

    await this.showNotification({
      title,
      body,
      tag: `trending-${tokenSymbol}`,
      actions: [
        { action: 'analyze', title: 'Analyze' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  async notifyPortfolioAlert(message: string): Promise<void> {
    const title = '💼 Portfolio Alert';

    await this.showNotification({
      title,
      body: message,
      tag: 'portfolio-alert'
    });
  }

  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  isNotificationSupported(): boolean {
    return this.isSupported;
  }
}

export const notificationService = new NotificationService();
