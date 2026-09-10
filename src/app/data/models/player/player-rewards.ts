export interface PlayerRewardsModel {
    xp: number;
    level: number;
    coins: number;
}

export interface PlayerRewardsLocal extends PlayerRewardsModel {
    uid: string;
    needsSync: number;
    lastSyncedAt: number;
}