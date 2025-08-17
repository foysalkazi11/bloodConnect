class AdFrequencyManager {
  private searchCount = 0;
  private lastSearchAdTime = 0;
  private lastJoinAdTime = 0;

  // Minimum time between ads (5 minutes)
  private readonly MIN_AD_INTERVAL = 5 * 60 * 1000;

  // Search ad frequency (every 5 searches)
  private readonly SEARCH_AD_FREQUENCY = 5;

  /**
   * Check if we should show an interstitial ad for search
   * Shows every 5th search (updated to not show on first search)
   */
  shouldShowSearchAd(): boolean {
    this.searchCount++;
    const now = Date.now();

    // First search - always show
    if (this.searchCount === 1) {
      this.lastSearchAdTime = now;
      return true;
    }

    // Every 5th search, but respect time interval
    if (this.searchCount % this.SEARCH_AD_FREQUENCY === 0) {
      if (now - this.lastSearchAdTime >= this.MIN_AD_INTERVAL) {
        this.lastSearchAdTime = now;
        return true;
      }
    }

    return false;
  }

  /**
   * Check if we should show an interstitial ad after club join
   * Respects minimum time interval to avoid overwhelming users
   */
  shouldShowJoinAd(): boolean {
    const now = Date.now();

    // Respect minimum interval between ads
    if (now - this.lastJoinAdTime >= this.MIN_AD_INTERVAL) {
      this.lastJoinAdTime = now;
      return true;
    }

    return false;
  }

  /**
   * Reset search count (call when user navigates away from search)
   */
  resetSearchCount(): void {
    // Don't completely reset, just reduce to prevent gaming
    this.searchCount = Math.max(0, this.searchCount - 2);
  }

  /**
   * Get current stats for debugging
   */
  getStats() {
    return {
      searchCount: this.searchCount,
      lastSearchAdTime: this.lastSearchAdTime,
      lastJoinAdTime: this.lastJoinAdTime,
      nextSearchAdIn:
        this.SEARCH_AD_FREQUENCY -
        (this.searchCount % this.SEARCH_AD_FREQUENCY),
    };
  }

  /**
   * Force reset all counters (for testing or user preference)
   */
  reset(): void {
    this.searchCount = 0;
    this.lastSearchAdTime = 0;
    this.lastJoinAdTime = 0;
  }
}

export const adFrequencyManager = new AdFrequencyManager();
