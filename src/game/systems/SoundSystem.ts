import Phaser from 'phaser'

export type SoundKey =
  | 'dialogue-advance'
  | 'message-appear'
  | 'heart-progress'
  | 'footstep'
  | 'megabyte-bark'
  | 'megabyte-join'
  | 'megabyte-anxious'
  | 'item-collect'
  | 'building'
  | 'bowl-fill'
  | 'door'
  | 'bg-prologue'
  | 'bg-wedding'
  // Future sounds (placeholders)
  | 'friendship-unlock'
  | 'box-push'
  | 'box-placed'
  | 'proposal-yes'
  | 'quest-fanfare'
  | 'kora-arrive'
  | 'kora-depart'
  | 'altar-reached'

export const SOUND_KEYS: SoundKey[] = [
  'dialogue-advance',
  'message-appear',
  'heart-progress',
  'footstep',
  'megabyte-bark',
  'megabyte-join',
  'megabyte-anxious',
  'item-collect',
  'building',
  'bowl-fill',
  'door',
  'bg-prologue',
  'bg-wedding',
]

export default class SoundSystem {
  private scene: Phaser.Scene
  private sounds: Map<SoundKey, Phaser.Sound.BaseSound> = new Map()
  private looping: Map<SoundKey, boolean> = new Map()
  private enabled = true
  private masterVolume = 0.7

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.initSounds()
  }

  private initSounds() {
    for (const key of SOUND_KEYS) {
      if (this.scene.cache.audio.exists(key)) {
        const sound = this.scene.sound.add(key, { volume: this.masterVolume })
        this.sounds.set(key, sound)
      }
    }
  }

  play(key: SoundKey, config?: Phaser.Types.Sound.SoundConfig) {
    if (!this.enabled) return

    const sound = this.sounds.get(key)
    if (!sound) {
      console.warn(`[SoundSystem] Sound not found: ${key}`)
      return
    }

    // Don't restart if already playing (unless it's a one-shot)
    if (sound.isPlaying && !config?.loop) {
      return
    }

    sound.play({
      volume: this.masterVolume,
      ...config,
    })
  }

  playLoop(key: SoundKey, config?: Phaser.Types.Sound.SoundConfig) {
    if (this.looping.get(key)) return

    this.looping.set(key, true)
    this.play(key, { ...config, loop: true })
  }

  stop(key: SoundKey) {
    const sound = this.sounds.get(key)
    if (sound?.isPlaying) {
      sound.stop()
    }
    this.looping.set(key, false)
  }

  stopAll() {
    for (const sound of this.sounds.values()) {
      if (sound.isPlaying) {
        sound.stop()
      }
    }
    this.looping.clear()
  }

  setVolume(volume: number) {
    this.masterVolume = Phaser.Math.Clamp(volume, 0, 1)
    for (const sound of this.sounds.values()) {
      if ('setVolume' in sound) {
        ;(sound as Phaser.Sound.WebAudioSound).setVolume(this.masterVolume)
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) {
      this.stopAll()
    }
  }

  isPlaying(key: SoundKey): boolean {
    const sound = this.sounds.get(key)
    return sound?.isPlaying ?? false
  }
}
