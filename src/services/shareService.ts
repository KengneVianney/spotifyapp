import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';
import { catalogService } from './catalogService';
import type { Song, SharedMusicPackage } from '../types';

const INBOX_KEY = '@kabod_shared_inbox';
const OUTBOX_KEY = '@kabod_shared_outbox';

function generateId(): string {
  return `share_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const shareService = {
  /** Envoyer une ou plusieurs musiques via le Share System (Bluetooth/WiFi/Email...) */
  async sendSongs(songs: Song[], senderName: string = 'Moi'): Promise<boolean> {
    if (songs.length === 0) return false;

    const pkg: SharedMusicPackage = {
      id: generateId(),
      senderName,
      songIds: songs.map(s => s.id),
      sentAt: new Date().toISOString(),
    };

    const outbox = await this.getOutbox();
    outbox.push(pkg);
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));

    const songDetails = songs.map(s =>
      `• ${s.title} — ${s.artist?.name ?? 'Inconnu'}`
    ).join('\n');

    const message = `🎵 *Kabod Music — Musiques partagées*\n\nDe: ${senderName}\n\n${songDetails}\n\nPartage cette playlist avec d'autres utilisateurs Kabod Music !`;

    try {
      await Share.share(
        {
          message,
          title: 'Kabod Music — Partage',
        },
        {
          dialogTitle: 'Partager des musiques',
          subject: 'Musiques Kabod Music',
        },
      );
      return true;
    } catch {
      return false;
    }
  },

  /** Recevoir un package partagé (import depuis le presse-papier ou message) */
  async receivePackage(rawJson: string): Promise<SharedMusicPackage | null> {
    try {
      const data = JSON.parse(rawJson) as SharedMusicPackage;
      if (!data.songIds || !data.senderName) return null;

      data.receivedAt = new Date().toISOString();

      const inbox = await this.getInbox();
      inbox.push(data);
      await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(inbox));

      return data;
    } catch {
      return null;
    }
  },

  /** Récupérer les musiques reçues */
  async getInbox(): Promise<SharedMusicPackage[]> {
    try {
      const raw = await AsyncStorage.getItem(INBOX_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as SharedMusicPackage[] : [];
    } catch {
      return [];
    }
  },

  /** Récupérer les musiques envoyées */
  async getOutbox(): Promise<SharedMusicPackage[]> {
    try {
      const raw = await AsyncStorage.getItem(OUTBOX_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as SharedMusicPackage[] : [];
    } catch {
      return [];
    }
  },

  /** Résoudre les vrais objets Song depuis un package */
  getSongsFromPackage(pkg: SharedMusicPackage): Song[] {
    const songs = catalogService.getSongsSync();
    return pkg.songIds
      .map(id => songs.find(s => s.id === id))
      .filter((s): s is Song => Boolean(s));
  },

  /** Nettoyer la boîte de réception */
  async clearInbox(): Promise<void> {
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify([]));
  },

  /** Supprimer un élément de la boîte de réception */
  async removeFromInbox(pkgId: string): Promise<void> {
    const inbox = await this.getInbox();
    const filtered = inbox.filter(p => p.id !== pkgId);
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(filtered));
  },
};
