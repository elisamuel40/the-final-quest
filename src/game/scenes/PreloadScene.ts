import Phaser from 'phaser'
import { SOUND_KEYS } from '../systems/SoundSystem'

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload')
  }

  preload() {
    // Load sounds
    for (const key of SOUND_KEYS) {
      this.load.audio(key, `assets/audio/${key}.mp3`)
    }

    this.load.image('jon', 'assets/sprites/jon.png')
    this.load.image('bianca', 'assets/sprites/bianca.png')
    this.load.image('jon-wedding', 'assets/sprites/jon-wedding.png')
    this.load.image('jon-proposal-knee', 'assets/sprites/jon-proposal-knee.png')
    this.load.image('jon-proposal-standing', 'assets/sprites/jon-proposal-standing.png')
    this.load.image('bianca-proposal', 'assets/sprites/bianca-proposal.png')
    this.load.image('bianca-wedding', 'assets/sprites/bianca-wedding.png')
    this.load.image('megabyte', 'assets/sprites/megabyte.png')
    this.load.image('megabyte-sitting', 'assets/sprites/megabyte-sitting.png')
    this.load.image('kira', 'assets/sprites/kira.png')
    this.load.svg('box', 'assets/sprites/box.svg', { width: 16, height: 16 })
    this.load.svg('house', 'assets/sprites/house.svg', { width: 48, height: 32 })
    this.load.svg('door', 'assets/sprites/door.svg', { width: 12, height: 20 })
    this.load.svg('altar', 'assets/sprites/altar.svg', { width: 26, height: 18 })
    this.load.svg('potion', 'assets/sprites/potion.svg', { width: 16, height: 16 })
    this.load.image('scene-1-coronado', 'assets/backgrounds/scene-1-coronado.png')
    this.load.image('scene-2-house-moving-in', 'assets/backgrounds/scene-2-house-moving-in.png')
    this.load.image('scene-3-construction-before', 'assets/backgrounds/scene-3-construction-before.png')
    this.load.image('scene-3-construction-after', 'assets/backgrounds/scene-3-construction-after.png')
    this.load.image('scene-4-megabyte-joins', 'assets/backgrounds/scene-4-megabyte-joins.png')
    this.load.image('scene-5-health', 'assets/backgrounds/scene-5-health.png')
    this.load.image('scene-6-crossroad', 'assets/backgrounds/scene-6-crossroad.png')
    this.load.image('scene-7-home-life', 'assets/backgrounds/scene-7-home-life.png')
    this.load.image('scene-8-wedding', 'assets/backgrounds/scene-8-wedding.png')
    this.load.image('scene-9-proposal', 'assets/backgrounds/scene-9-proposal.png')
  }

  create() {
    this.scene.start('World')
    this.scene.start('UI')
  }
}
