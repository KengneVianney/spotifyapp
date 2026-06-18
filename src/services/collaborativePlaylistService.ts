import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CollaborativePlaylist } from '../types';

const STORAGE_KEY = '@kabod_collaborative_playlists';

function generateId(): string {
  return `collab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const collaborativePlaylistService = {
  async getAll(): Promise<CollaborativePlaylist[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as CollaborativePlaylist[] : [];
    } catch {
      return [];
    }
  },

  async getById(id: string): Promise<CollaborativePlaylist | undefined> {
    const all = await this.getAll();
    return all.find(p => p.id === id);
  },

  async create(name: string, creatorName: string): Promise<CollaborativePlaylist> {
    const all = await this.getAll();
    const newPlaylist: CollaborativePlaylist = {
      id: generateId(),
      name,
      creatorId: 'local_user',
      creatorName,
      contributors: [
        { id: 'local_user', name: creatorName, addedSongIds: [] },
      ],
      songIds: [],
      createdAt: new Date().toISOString(),
    };
    all.push(newPlaylist);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newPlaylist;
  },

  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter(p => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  async addContributor(playlistId: string, name: string): Promise<boolean> {
    const all = await this.getAll();
    const pl = all.find(p => p.id === playlistId);
    if (!pl) return false;
    if (pl.contributors.length >= 8) return false;
    if (pl.contributors.some(c => c.name.toLowerCase() === name.toLowerCase())) return false;

    const contributorId = `contrib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    pl.contributors.push({ id: contributorId, name, addedSongIds: [] });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  },

  async removeContributor(playlistId: string, contributorId: string): Promise<void> {
    const all = await this.getAll();
    const pl = all.find(p => p.id === playlistId);
    if (!pl) return;
    const removed = pl.contributors.find(c => c.id === contributorId);
    if (!removed) return;
    pl.songIds = pl.songIds.filter(id => !removed.addedSongIds.includes(id));
    pl.contributors = pl.contributors.filter(c => c.id !== contributorId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  async addSong(
    playlistId: string,
    songId: string,
    contributorId: string,
  ): Promise<boolean> {
    const all = await this.getAll();
    const pl = all.find(p => p.id === playlistId);
    if (!pl) return false;
    if (pl.songIds.includes(songId)) return true;

    pl.songIds.push(songId);
    const contributor = pl.contributors.find(c => c.id === contributorId);
    if (contributor) {
      contributor.addedSongIds.push(songId);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  },

  async removeSong(playlistId: string, songId: string): Promise<void> {
    const all = await this.getAll();
    const pl = all.find(p => p.id === playlistId);
    if (!pl) return;
    pl.songIds = pl.songIds.filter(id => id !== songId);
    pl.contributors.forEach(c => {
      c.addedSongIds = c.addedSongIds.filter(id => id !== songId);
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  async rename(playlistId: string, newName: string): Promise<void> {
    const all = await this.getAll();
    const pl = all.find(p => p.id === playlistId);
    if (!pl) return;
    pl.name = newName;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },
};
